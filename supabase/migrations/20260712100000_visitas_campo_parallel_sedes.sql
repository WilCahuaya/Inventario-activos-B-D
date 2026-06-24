-- Varias visitas de campo abiertas a la vez, una por sucursal (o una global «todas»).

DROP INDEX IF EXISTS public.idx_visitas_campo_entidad_abierta;

CREATE UNIQUE INDEX IF NOT EXISTS idx_visitas_campo_sede_abierta
  ON public.visitas_campo (entidad_id, sede_id)
  WHERE estado = 'ABIERTO' AND sede_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_visitas_campo_todas_abierta
  ON public.visitas_campo (entidad_id)
  WHERE estado = 'ABIERTO' AND sede_id IS NULL;

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

  IF p_sede_id IS NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.visitas_campo
      WHERE entidad_id = p_entidad_id AND estado = 'ABIERTO'
    ) THEN
      RAISE EXCEPTION 'Cierre las visitas abiertas antes de iniciar una en todas las sucursales';
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.visitas_campo
      WHERE entidad_id = p_entidad_id AND estado = 'ABIERTO' AND sede_id IS NULL
    ) THEN
      RAISE EXCEPTION 'Ya hay una visita abierta en todas las sucursales';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.visitas_campo
      WHERE entidad_id = p_entidad_id AND estado = 'ABIERTO' AND sede_id = p_sede_id
    ) THEN
      RAISE EXCEPTION 'Ya hay una visita de campo abierta en esta sucursal';
    END IF;
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

CREATE OR REPLACE FUNCTION public.culminar_ambiente_visita(p_ambiente_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sede_id UUID;
  v_entidad_id UUID;
  v_visita_id UUID;
  v_user UUID := auth.uid();
BEGIN
  IF NOT public.is_contador() THEN
    RAISE EXCEPTION 'Solo el contador puede culminar una visita de ambiente';
  END IF;

  SELECT a.sede_id, s.entidad_id
  INTO v_sede_id, v_entidad_id
  FROM public.ambientes a
  INNER JOIN public.sedes s ON s.id = a.sede_id
  WHERE a.id = p_ambiente_id AND a.activo = TRUE;

  IF v_entidad_id IS NULL THEN
    RAISE EXCEPTION 'Ambiente no encontrado';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.ambientes
    WHERE id = p_ambiente_id AND es_preregistro = TRUE
  ) THEN
    RAISE EXCEPTION 'El ambiente de preregistros no participa en visitas de campo';
  END IF;

  SELECT v.id INTO v_visita_id
  FROM public.visitas_campo v
  WHERE v.entidad_id = v_entidad_id
    AND v.estado = 'ABIERTO'
    AND (v.sede_id IS NULL OR v.sede_id = v_sede_id)
  ORDER BY CASE WHEN v.sede_id IS NULL THEN 1 ELSE 0 END
  LIMIT 1;

  IF v_visita_id IS NULL THEN
    RAISE EXCEPTION 'No hay una visita de campo abierta para este ambiente';
  END IF;

  UPDATE public.visita_ambientes
  SET
    estado = 'CULMINADO',
    culminado_at = now(),
    culminado_por = v_user
  WHERE visita_id = v_visita_id
    AND ambiente_id = p_ambiente_id
    AND estado = 'EN_PROCESO';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'El ambiente no está en proceso en la visita actual';
  END IF;
END;
$$;

DROP FUNCTION IF EXISTS public.cerrar_visita_campo(UUID);

CREATE OR REPLACE FUNCTION public.cerrar_visita_campo(p_visita_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pendientes INTEGER;
  v_entidad_id UUID;
  v_user UUID := auth.uid();
BEGIN
  IF NOT public.is_contador() THEN
    RAISE EXCEPTION 'Solo el contador puede cerrar una visita de campo';
  END IF;

  SELECT entidad_id INTO v_entidad_id
  FROM public.visitas_campo
  WHERE id = p_visita_id AND estado = 'ABIERTO';

  IF v_entidad_id IS NULL THEN
    RAISE EXCEPTION 'Visita de campo no encontrada o ya cerrada';
  END IF;

  IF NOT public.can_access_entidad(v_entidad_id) THEN
    RAISE EXCEPTION 'No autorizado para esta entidad';
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_pendientes
  FROM public.visita_ambientes
  WHERE visita_id = p_visita_id AND estado = 'EN_PROCESO';

  IF v_pendientes > 0 THEN
    RAISE EXCEPTION 'Debe culminar todos los ambientes antes de cerrar la visita (% pendientes)', v_pendientes;
  END IF;

  UPDATE public.visitas_campo
  SET
    estado = 'CERRADO',
    cerrado_at = now(),
    cerrado_por = v_user
  WHERE id = p_visita_id;
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

  SELECT v.id INTO v_visita_id
  FROM public.visitas_campo v
  WHERE v.entidad_id = v_entidad_id
    AND v.estado = 'ABIERTO'
    AND (v.sede_id IS NULL OR v.sede_id = NEW.sede_id)
  ORDER BY CASE WHEN v.sede_id IS NULL THEN 1 ELSE 0 END
  LIMIT 1;

  IF v_visita_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.visita_ambientes (visita_id, ambiente_id, estado)
  VALUES (v_visita_id, NEW.id, 'EN_PROCESO')
  ON CONFLICT (visita_id, ambiente_id) DO NOTHING;

  RETURN NEW;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cerrar_visita_campo(UUID) TO authenticated;
