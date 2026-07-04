-- La sede Principal hereda la dirección de la entidad al crearse y al actualizarla.

CREATE OR REPLACE FUNCTION public.ensure_sede_principal_for_entidad(p_entidad_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sede_id UUID;
  v_direccion TEXT;
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

  SELECT direccion INTO v_direccion
  FROM public.entidades
  WHERE id = p_entidad_id;

  INSERT INTO public.sedes (entidad_id, nombre, es_principal, direccion)
  VALUES (p_entidad_id, 'Principal', TRUE, v_direccion)
  RETURNING id INTO v_sede_id;

  RETURN v_sede_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_sede_principal_direccion_for_entidad()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.direccion IS DISTINCT FROM OLD.direccion THEN
    UPDATE public.sedes
    SET direccion = NEW.direccion,
        updated_at = NOW()
    WHERE entidad_id = NEW.id
      AND es_principal = TRUE
      AND activo = TRUE;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS entidades_sync_sede_principal_direccion ON public.entidades;
CREATE TRIGGER entidades_sync_sede_principal_direccion
  AFTER UPDATE OF direccion ON public.entidades
  FOR EACH ROW EXECUTE FUNCTION public.sync_sede_principal_direccion_for_entidad();

-- Entidades existentes: alinear dirección de la sede Principal con la de la entidad.
UPDATE public.sedes s
SET direccion = e.direccion,
    updated_at = NOW()
FROM public.entidades e
WHERE s.entidad_id = e.id
  AND s.es_principal = TRUE
  AND s.activo = TRUE
  AND s.direccion IS DISTINCT FROM e.direccion;

NOTIFY pgrst, 'reload schema';
