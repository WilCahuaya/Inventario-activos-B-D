-- Maestro de cuentas contables (código → nombre oficial).
-- catalogo_nacional.cuenta_codigo referencia aquí; contabilidad queda como caché denormalizada.

CREATE TABLE IF NOT EXISTS public.cuentas_contables (
  codigo TEXT PRIMARY KEY,
  nombre TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT cuentas_contables_codigo_format CHECK (codigo ~ '^\d{4,5}$')
);

CREATE INDEX IF NOT EXISTS idx_cuentas_contables_nombre_trgm
  ON public.cuentas_contables USING gin (nombre gin_trgm_ops)
  WHERE nombre IS NOT NULL;

-- Poblar desde el catálogo: nombre más frecuente por código.
WITH variantes AS (
  SELECT
    trim(cuenta_codigo) AS codigo,
    NULLIF(trim(contabilidad), '') AS nombre,
    count(*) AS filas
  FROM public.catalogo_nacional
  WHERE cuenta_codigo IS NOT NULL
    AND trim(cuenta_codigo) <> ''
    AND NULLIF(trim(contabilidad), '') IS NOT NULL
  GROUP BY trim(cuenta_codigo), NULLIF(trim(contabilidad), '')
),
ranked AS (
  SELECT
    codigo,
    nombre,
    row_number() OVER (
      PARTITION BY codigo
      ORDER BY filas DESC, length(nombre) DESC, nombre
    ) AS rn
  FROM variantes
)
INSERT INTO public.cuentas_contables (codigo, nombre)
SELECT codigo, nombre
FROM ranked
WHERE rn = 1
ON CONFLICT (codigo) DO UPDATE
SET
  nombre = COALESCE(EXCLUDED.nombre, cuentas_contables.nombre),
  updated_at = NOW();

-- Códigos sin nombre en catálogo (solo dígitos).
INSERT INTO public.cuentas_contables (codigo, nombre)
SELECT DISTINCT trim(cuenta_codigo), NULL
FROM public.catalogo_nacional
WHERE cuenta_codigo IS NOT NULL
  AND trim(cuenta_codigo) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.cuentas_contables cc
    WHERE cc.codigo = trim(catalogo_nacional.cuenta_codigo)
  )
ON CONFLICT (codigo) DO NOTHING;

-- Cuenta de orden por defecto en catálogo propio.
INSERT INTO public.cuentas_contables (codigo, nombre)
VALUES ('2524', NULL)
ON CONFLICT (codigo) DO NOTHING;

-- Sincronizar caché contabilidad en todo el catálogo.
UPDATE public.catalogo_nacional c
SET contabilidad = cc.nombre
FROM public.cuentas_contables cc
WHERE c.cuenta_codigo = cc.codigo;

ALTER TABLE public.catalogo_nacional
  DROP CONSTRAINT IF EXISTS catalogo_nacional_cuenta_codigo_fkey;

ALTER TABLE public.catalogo_nacional
  ADD CONSTRAINT catalogo_nacional_cuenta_codigo_fkey
  FOREIGN KEY (cuenta_codigo) REFERENCES public.cuentas_contables (codigo)
  ON UPDATE CASCADE
  ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.touch_cuentas_contables_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cuentas_contables_updated_at ON public.cuentas_contables;
CREATE TRIGGER trg_cuentas_contables_updated_at
  BEFORE UPDATE ON public.cuentas_contables
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_cuentas_contables_updated_at();

CREATE OR REPLACE FUNCTION public.propagate_cuenta_contable_nombre()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.nombre IS DISTINCT FROM OLD.nombre THEN
    UPDATE public.catalogo_nacional
    SET contabilidad = NEW.nombre
    WHERE cuenta_codigo = NEW.codigo;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_propagate_cuenta_contable_nombre ON public.cuentas_contables;
CREATE TRIGGER trg_propagate_cuenta_contable_nombre
  AFTER UPDATE OF nombre ON public.cuentas_contables
  FOR EACH ROW
  EXECUTE FUNCTION public.propagate_cuenta_contable_nombre();

CREATE OR REPLACE FUNCTION public.upsert_cuenta_contable(
  p_codigo TEXT,
  p_nombre TEXT
)
RETURNS public.cuentas_contables
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo TEXT := trim(p_codigo);
  v_nombre TEXT := NULLIF(trim(p_nombre), '');
  v_row public.cuentas_contables;
BEGIN
  IF v_codigo = '' OR v_codigo !~ '^\d{4,5}$' THEN
    RAISE EXCEPTION 'Código de cuenta contable inválido (use 4 o 5 dígitos)';
  END IF;

  INSERT INTO public.cuentas_contables (codigo, nombre)
  VALUES (v_codigo, v_nombre)
  ON CONFLICT (codigo) DO UPDATE
  SET
    nombre = COALESCE(EXCLUDED.nombre, cuentas_contables.nombre),
    updated_at = NOW()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_catalogo_cuenta_contable_cache()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_codigo TEXT := NULLIF(trim(NEW.cuenta_codigo), '');
  v_nombre TEXT := NULLIF(trim(NEW.contabilidad), '');
  v_master_nombre TEXT;
BEGIN
  IF v_codigo IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_nombre IS NOT NULL THEN
    PERFORM public.upsert_cuenta_contable(v_codigo, v_nombre);
  END IF;

  SELECT nombre INTO v_master_nombre
  FROM public.cuentas_contables
  WHERE codigo = v_codigo;

  NEW.contabilidad := v_master_nombre;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_catalogo_cuenta_contable_cache ON public.catalogo_nacional;
CREATE TRIGGER trg_sync_catalogo_cuenta_contable_cache
  BEFORE INSERT OR UPDATE OF cuenta_codigo, contabilidad ON public.catalogo_nacional
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_catalogo_cuenta_contable_cache();

DROP FUNCTION IF EXISTS public.update_catalogo_nacional_contabilidad(TEXT, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.update_catalogo_nacional_contabilidad(
  p_codigo TEXT,
  p_cuenta_codigo TEXT,
  p_contabilidad TEXT,
  p_depreciacion TEXT DEFAULT NULL
)
RETURNS public.catalogo_nacional
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo TEXT := trim(p_codigo);
  v_cuenta TEXT := NULLIF(trim(p_cuenta_codigo), '');
  v_nombre TEXT := NULLIF(trim(p_contabilidad), '');
  v_row public.catalogo_nacional;
BEGIN
  IF NOT public.is_contador() THEN
    RAISE EXCEPTION 'Solo el contador puede actualizar los datos contables del catálogo nacional';
  END IF;

  IF v_codigo = '' THEN
    RAISE EXCEPTION 'Código de catálogo inválido';
  END IF;

  IF v_cuenta IS NOT NULL THEN
    PERFORM public.upsert_cuenta_contable(v_cuenta, v_nombre);
  END IF;

  UPDATE public.catalogo_nacional
  SET
    cuenta_codigo = v_cuenta,
    contabilidad = (
      SELECT nombre FROM public.cuentas_contables WHERE codigo = v_cuenta
    ),
    depreciacion = NULLIF(trim(p_depreciacion), '')
  WHERE codigo = v_codigo
    AND origen = 'NACIONAL'
  RETURNING * INTO v_row;

  IF v_row.codigo IS NULL THEN
    RAISE EXCEPTION 'Ítem no encontrado o no pertenece al catálogo nacional';
  END IF;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_cuentas_contables(
  p_query TEXT,
  p_limit INTEGER DEFAULT 30
)
RETURNS SETOF public.cuentas_contables
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.cuentas_contables
  WHERE p_query IS NULL
    OR trim(p_query) = ''
    OR codigo LIKE trim(p_query) || '%'
    OR nombre ILIKE '%' || trim(p_query) || '%'
  ORDER BY codigo
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100);
$$;

ALTER TABLE public.cuentas_contables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cuentas_contables_select ON public.cuentas_contables;
CREATE POLICY cuentas_contables_select ON public.cuentas_contables
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS cuentas_contables_write ON public.cuentas_contables;
CREATE POLICY cuentas_contables_write ON public.cuentas_contables
  FOR ALL TO authenticated
  USING (public.is_contador())
  WITH CHECK (public.is_contador());

GRANT SELECT ON public.cuentas_contables TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_cuenta_contable(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_cuentas_contables(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_catalogo_nacional_contabilidad(TEXT, TEXT, TEXT, TEXT) TO authenticated;
