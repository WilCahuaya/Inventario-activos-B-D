-- Correlativo secuencial por (entidad_id, codigo_catalogo).
-- Ej.: 74080500-000001, 74080500-000002, 53649569-000001

ALTER TABLE public.activos
  DROP CONSTRAINT IF EXISTS activos_correlativo_unique;

ALTER TABLE public.activos
  ADD CONSTRAINT activos_correlativo_por_catalogo_unique
  UNIQUE (entidad_id, codigo_catalogo, correlativo);

DROP FUNCTION IF EXISTS public.next_correlativo(UUID);

CREATE OR REPLACE FUNCTION public.next_correlativo(p_entidad_id UUID, p_catalogo TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(correlativo), 0) + 1
  FROM public.activos
  WHERE entidad_id = p_entidad_id
    AND codigo_catalogo = p_catalogo
    AND correlativo IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.next_correlativo(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.preview_codigo_barras(
  p_entidad_id UUID,
  p_catalogo TEXT
)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.build_codigo_barras(p_catalogo, public.next_correlativo(p_entidad_id, p_catalogo));
$$;

CREATE OR REPLACE FUNCTION public.assign_correlativo_if_registrado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.estado_registro = 'REGISTRADO' AND NEW.correlativo IS NULL THEN
    NEW.correlativo := public.next_correlativo(NEW.entidad_id, NEW.codigo_catalogo);
    NEW.codigo_barras := public.build_codigo_barras(NEW.codigo_catalogo, NEW.correlativo);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_activo_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_by := auth.uid();

  IF NOT public.is_contador() THEN
    IF NEW.entidad_id IS DISTINCT FROM OLD.entidad_id THEN
      RAISE EXCEPTION 'No puede cambiar la entidad del activo';
    END IF;
    IF NEW.estado_registro IS DISTINCT FROM OLD.estado_registro
       AND NEW.estado_registro = 'REGISTRADO' THEN
      RAISE EXCEPTION 'Solo el contador puede registrar activos';
    END IF;
  END IF;

  IF NEW.estado_registro = 'REGISTRADO'
     AND OLD.estado_registro = 'PREREGISTRADO'
     AND NEW.correlativo IS NULL THEN
    NEW.correlativo := public.next_correlativo(NEW.entidad_id, NEW.codigo_catalogo);
    NEW.codigo_barras := public.build_codigo_barras(NEW.codigo_catalogo, NEW.correlativo);
  END IF;

  IF NEW.estado_registro != 'REGISTRADO' THEN
    IF NEW.estado_registro = 'PREREGISTRADO' THEN
      NEW.correlativo := NULL;
      NEW.codigo_barras := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
