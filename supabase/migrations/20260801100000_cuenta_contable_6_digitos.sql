-- Código de cuenta contable: exactamente 6 dígitos (v2).
-- Normaliza códigos cortos con ceros a la izquierda (ej. 2524 → 002524).

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
  IF v_codigo = '' OR v_codigo !~ '^\d{6}$' THEN
    RAISE EXCEPTION 'Código de cuenta contable inválido (use exactamente 6 dígitos)';
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

CREATE OR REPLACE FUNCTION public.delete_cuenta_contable(p_codigo TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo TEXT := trim(p_codigo);
  v_uso INTEGER;
BEGIN
  IF NOT public.is_contador() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF v_codigo = '' OR v_codigo !~ '^\d{6}$' THEN
    RAISE EXCEPTION 'Código de cuenta contable inválido (use exactamente 6 dígitos)';
  END IF;

  SELECT count(*)::INTEGER INTO v_uso
  FROM public.catalogo_nacional
  WHERE cuenta_codigo = v_codigo;

  IF v_uso > 0 THEN
    RAISE EXCEPTION 'No se puede eliminar: % bien(es) del catálogo usan la cuenta %.', v_uso, v_codigo;
  END IF;

  DELETE FROM public.cuentas_contables WHERE codigo = v_codigo;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La cuenta contable % no existe.', v_codigo;
  END IF;
END;
$$;

ALTER TABLE public.cuentas_contables
  DROP CONSTRAINT IF EXISTS cuentas_contables_codigo_format;

-- Desactivar triggers de historial/sync durante el renombrado masivo.
ALTER TABLE public.catalogo_nacional DISABLE TRIGGER USER;
ALTER TABLE public.activos DISABLE TRIGGER USER;

DO $$
DECLARE
  r RECORD;
  v_nuevo TEXT;
BEGIN
  FOR r IN
    SELECT codigo, nombre
    FROM public.cuentas_contables
    WHERE codigo ~ '^\d{1,5}$'
    ORDER BY length(codigo) DESC, codigo
  LOOP
    v_nuevo := lpad(r.codigo, 6, '0');

    IF EXISTS (SELECT 1 FROM public.cuentas_contables WHERE codigo = v_nuevo) THEN
      UPDATE public.catalogo_nacional
      SET cuenta_codigo = v_nuevo
      WHERE cuenta_codigo = r.codigo;

      UPDATE public.activos
      SET cuenta_contable_codigo = v_nuevo
      WHERE cuenta_contable_codigo = r.codigo;

      UPDATE public.cuentas_contables AS dest
      SET
        nombre = COALESCE(dest.nombre, r.nombre),
        updated_at = NOW()
      WHERE dest.codigo = v_nuevo;

      DELETE FROM public.cuentas_contables WHERE codigo = r.codigo;
    ELSE
      UPDATE public.cuentas_contables
      SET codigo = v_nuevo
      WHERE codigo = r.codigo;
    END IF;
  END LOOP;
END $$;

UPDATE public.activos
SET cuenta_contable_codigo = lpad(cuenta_contable_codigo, 6, '0')
WHERE cuenta_contable_codigo IS NOT NULL
  AND cuenta_contable_codigo ~ '^\d{1,5}$';

INSERT INTO public.cuentas_contables (codigo, nombre)
SELECT DISTINCT lpad(trim(cuenta_codigo), 6, '0'), NULL
FROM public.catalogo_nacional
WHERE cuenta_codigo IS NOT NULL
  AND trim(cuenta_codigo) ~ '^\d{1,5}$'
ON CONFLICT (codigo) DO NOTHING;

UPDATE public.catalogo_nacional
SET cuenta_codigo = lpad(cuenta_codigo, 6, '0')
WHERE cuenta_codigo IS NOT NULL
  AND cuenta_codigo ~ '^\d{1,5}$';

INSERT INTO public.cuentas_contables (codigo, nombre)
SELECT DISTINCT trim(cuenta_codigo), NULL
FROM public.catalogo_nacional
WHERE cuenta_codigo IS NOT NULL
  AND trim(cuenta_codigo) ~ '^\d{6}$'
  AND NOT EXISTS (
    SELECT 1 FROM public.cuentas_contables cc WHERE cc.codigo = trim(catalogo_nacional.cuenta_codigo)
  )
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.cuentas_contables (codigo, nombre)
VALUES ('002524', NULL)
ON CONFLICT (codigo) DO NOTHING;

ALTER TABLE public.activos ENABLE TRIGGER USER;
ALTER TABLE public.catalogo_nacional ENABLE TRIGGER USER;

ALTER TABLE public.cuentas_contables
  DROP CONSTRAINT IF EXISTS cuentas_contables_codigo_format;

ALTER TABLE public.cuentas_contables
  ADD CONSTRAINT cuentas_contables_codigo_format CHECK (codigo ~ '^\d{6}$');
