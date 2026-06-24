-- La sede Principal debe existir antes de crear el ambiente de preregistro.
-- Los triggers AFTER INSERT se ejecutan en orden alfabético por nombre; el de
-- ambiente_preregistro corría antes que el de sede_principal y fallaba al crear entidades.

CREATE OR REPLACE FUNCTION public.ensure_sede_principal_for_entidad(p_entidad_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sede_id UUID;
BEGIN
  SELECT id INTO v_sede_id
  FROM public.sedes
  WHERE entidad_id = p_entidad_id
    AND es_principal = TRUE
    AND activo = TRUE
  LIMIT 1;

  IF v_sede_id IS NOT NULL THEN
    RETURN v_sede_id;
  END IF;

  INSERT INTO public.sedes (entidad_id, nombre, es_principal)
  VALUES (p_entidad_id, 'Principal', TRUE)
  RETURNING id INTO v_sede_id;

  RETURN v_sede_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_sede_principal_for_entidad()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_sede_principal_for_entidad(NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_ambiente_preregistro(p_entidad_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sede_id UUID;
  v_ambiente_id UUID;
  v_nombre TEXT;
  v_anio INTEGER;
BEGIN
  v_anio := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  v_nombre := public.ambiente_preregistro_nombre(v_anio);

  SELECT a.id INTO v_ambiente_id
  FROM public.ambientes a
  INNER JOIN public.sedes s ON s.id = a.sede_id
  WHERE s.entidad_id = p_entidad_id
    AND a.es_preregistro = TRUE
    AND a.activo = TRUE
  LIMIT 1;

  IF v_ambiente_id IS NOT NULL THEN
    UPDATE public.ambientes
    SET nombre = v_nombre, updated_at = NOW()
    WHERE id = v_ambiente_id AND nombre IS DISTINCT FROM v_nombre;
    RETURN v_ambiente_id;
  END IF;

  v_sede_id := public.ensure_sede_principal_for_entidad(p_entidad_id);

  IF v_sede_id IS NULL THEN
    RAISE EXCEPTION 'La entidad no tiene sede Principal';
  END IF;

  INSERT INTO public.ambientes (sede_id, nombre, es_preregistro, activo)
  VALUES (v_sede_id, v_nombre, TRUE, TRUE)
  RETURNING id INTO v_ambiente_id;

  RETURN v_ambiente_id;
END;
$$;

DROP TRIGGER IF EXISTS entidades_create_sede_principal ON public.entidades;
DROP TRIGGER IF EXISTS entidades_create_ambiente_preregistro ON public.entidades;

CREATE TRIGGER entidades_01_create_sede_principal
  AFTER INSERT ON public.entidades
  FOR EACH ROW EXECUTE FUNCTION public.create_sede_principal_for_entidad();

CREATE TRIGGER entidades_02_create_ambiente_preregistro
  AFTER INSERT ON public.entidades
  FOR EACH ROW EXECUTE FUNCTION public.create_ambiente_preregistro_for_entidad();

-- Entidades creadas sin sede Principal (p. ej. fallo previo del trigger)
INSERT INTO public.sedes (entidad_id, nombre, es_principal)
SELECT e.id, 'Principal', TRUE
FROM public.entidades e
WHERE e.activo = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM public.sedes s
    WHERE s.entidad_id = e.id AND s.es_principal = TRUE AND s.activo = TRUE
  );

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.entidades WHERE activo = TRUE LOOP
    PERFORM public.ensure_ambiente_preregistro(r.id);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
