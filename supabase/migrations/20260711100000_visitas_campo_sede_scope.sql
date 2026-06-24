-- Alcance por sucursal al iniciar una visita de campo (una sede o todas).

ALTER TABLE public.visitas_campo
  ADD COLUMN IF NOT EXISTS sede_id UUID REFERENCES public.sedes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_visitas_campo_sede ON public.visitas_campo (sede_id);

DROP FUNCTION IF EXISTS public.abrir_visita_campo(UUID);

CREATE OR REPLACE FUNCTION public.abrir_visita_campo(
  p_entidad_id UUID,
  p_sede_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visita_id UUID;
  v_numero INTEGER;
  v_user UUID := auth.uid();
BEGIN
  IF NOT public.is_contador() THEN
    RAISE EXCEPTION 'Solo el contador puede iniciar una visita de campo';
  END IF;

  IF NOT public.can_access_entidad(p_entidad_id) THEN
    RAISE EXCEPTION 'No autorizado para esta entidad';
  END IF;

  IF p_sede_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.sedes
      WHERE id = p_sede_id
        AND entidad_id = p_entidad_id
        AND activo = TRUE
    ) THEN
      RAISE EXCEPTION 'La sucursal seleccionada no pertenece a esta entidad';
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.visitas_campo
    WHERE entidad_id = p_entidad_id AND estado = 'ABIERTO'
  ) THEN
    RAISE EXCEPTION 'Ya hay una visita de campo abierta en esta entidad';
  END IF;

  SELECT COALESCE(MAX(numero), 0) + 1
  INTO v_numero
  FROM public.visitas_campo
  WHERE entidad_id = p_entidad_id;

  INSERT INTO public.visitas_campo (entidad_id, numero, estado, abierto_por, sede_id)
  VALUES (p_entidad_id, v_numero, 'ABIERTO', v_user, p_sede_id)
  RETURNING id INTO v_visita_id;

  INSERT INTO public.visita_ambientes (visita_id, ambiente_id, estado)
  SELECT v_visita_id, a.id, 'EN_PROCESO'
  FROM public.ambientes a
  INNER JOIN public.sedes s ON s.id = a.sede_id
  WHERE s.entidad_id = p_entidad_id
    AND a.activo = TRUE
    AND a.es_preregistro = FALSE
    AND (p_sede_id IS NULL OR a.sede_id = p_sede_id);

  RETURN v_visita_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.visita_ambiente_on_ambiente_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entidad_id UUID;
  v_visita_id UUID;
  v_visita_sede_id UUID;
BEGIN
  IF NEW.es_preregistro = TRUE OR NEW.activo = FALSE THEN
    RETURN NEW;
  END IF;

  SELECT entidad_id INTO v_entidad_id
  FROM public.sedes
  WHERE id = NEW.sede_id;

  IF v_entidad_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id, sede_id
  INTO v_visita_id, v_visita_sede_id
  FROM public.visitas_campo
  WHERE entidad_id = v_entidad_id AND estado = 'ABIERTO'
  LIMIT 1;

  IF v_visita_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_visita_sede_id IS NOT NULL AND v_visita_sede_id <> NEW.sede_id THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.visita_ambientes (visita_id, ambiente_id, estado)
  VALUES (v_visita_id, NEW.id, 'EN_PROCESO')
  ON CONFLICT (visita_id, ambiente_id) DO NOTHING;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.abrir_visita_campo(UUID, UUID) TO authenticated;
