-- Visitas de campo por entidad: indicador de avance por ambiente e historial de rondas.

DO $$ BEGIN
  CREATE TYPE public.estado_visita_campo AS ENUM ('ABIERTO', 'CERRADO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.estado_visita_ambiente AS ENUM ('EN_PROCESO', 'CULMINADO');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.visitas_campo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id UUID NOT NULL REFERENCES public.entidades(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL,
  estado public.estado_visita_campo NOT NULL DEFAULT 'ABIERTO',
  abierto_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  abierto_por UUID NOT NULL REFERENCES public.profiles(id),
  cerrado_at TIMESTAMPTZ,
  cerrado_por UUID REFERENCES public.profiles(id),
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT visitas_campo_entidad_numero_unique UNIQUE (entidad_id, numero)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_visitas_campo_entidad_abierta
  ON public.visitas_campo (entidad_id)
  WHERE estado = 'ABIERTO';

CREATE TABLE IF NOT EXISTS public.visita_ambientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visita_id UUID NOT NULL REFERENCES public.visitas_campo(id) ON DELETE CASCADE,
  ambiente_id UUID NOT NULL REFERENCES public.ambientes(id) ON DELETE CASCADE,
  estado public.estado_visita_ambiente NOT NULL DEFAULT 'EN_PROCESO',
  culminado_at TIMESTAMPTZ,
  culminado_por UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT visita_ambientes_visita_ambiente_unique UNIQUE (visita_id, ambiente_id)
);

CREATE INDEX IF NOT EXISTS idx_visita_ambientes_visita ON public.visita_ambientes (visita_id);
CREATE INDEX IF NOT EXISTS idx_visita_ambientes_ambiente ON public.visita_ambientes (ambiente_id);
CREATE INDEX IF NOT EXISTS idx_visitas_campo_entidad ON public.visitas_campo (entidad_id, abierto_at DESC);

DROP TRIGGER IF EXISTS visitas_campo_updated_at ON public.visitas_campo;
CREATE TRIGGER visitas_campo_updated_at
  BEFORE UPDATE ON public.visitas_campo
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS visita_ambientes_updated_at ON public.visita_ambientes;
CREATE TRIGGER visita_ambientes_updated_at
  BEFORE UPDATE ON public.visita_ambientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RPC: abrir visita de campo
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.abrir_visita_campo(p_entidad_id UUID)
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

  INSERT INTO public.visitas_campo (entidad_id, numero, estado, abierto_por)
  VALUES (p_entidad_id, v_numero, 'ABIERTO', v_user)
  RETURNING id INTO v_visita_id;

  INSERT INTO public.visita_ambientes (visita_id, ambiente_id, estado)
  SELECT v_visita_id, a.id, 'EN_PROCESO'
  FROM public.ambientes a
  INNER JOIN public.sedes s ON s.id = a.sede_id
  WHERE s.entidad_id = p_entidad_id
    AND a.activo = TRUE
    AND a.es_preregistro = FALSE;

  RETURN v_visita_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: culminar ambiente en visita abierta
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.culminar_ambiente_visita(p_ambiente_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entidad_id UUID;
  v_visita_id UUID;
  v_user UUID := auth.uid();
BEGIN
  IF NOT public.is_contador() THEN
    RAISE EXCEPTION 'Solo el contador puede culminar una visita de ambiente';
  END IF;

  SELECT s.entidad_id
  INTO v_entidad_id
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

  SELECT id INTO v_visita_id
  FROM public.visitas_campo
  WHERE entidad_id = v_entidad_id AND estado = 'ABIERTO'
  LIMIT 1;

  IF v_visita_id IS NULL THEN
    RAISE EXCEPTION 'No hay una visita de campo abierta para esta entidad';
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

-- ---------------------------------------------------------------------------
-- RPC: cerrar visita de campo
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cerrar_visita_campo(p_entidad_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visita_id UUID;
  v_pendientes INTEGER;
  v_user UUID := auth.uid();
BEGIN
  IF NOT public.is_contador() THEN
    RAISE EXCEPTION 'Solo el contador puede cerrar una visita de campo';
  END IF;

  IF NOT public.can_access_entidad(p_entidad_id) THEN
    RAISE EXCEPTION 'No autorizado para esta entidad';
  END IF;

  SELECT id INTO v_visita_id
  FROM public.visitas_campo
  WHERE entidad_id = p_entidad_id AND estado = 'ABIERTO'
  LIMIT 1;

  IF v_visita_id IS NULL THEN
    RAISE EXCEPTION 'No hay una visita de campo abierta en esta entidad';
  END IF;

  SELECT COUNT(*)::INTEGER
  INTO v_pendientes
  FROM public.visita_ambientes
  WHERE visita_id = v_visita_id AND estado = 'EN_PROCESO';

  IF v_pendientes > 0 THEN
    RAISE EXCEPTION 'Debe culminar todos los ambientes antes de cerrar la visita (% pendientes)', v_pendientes;
  END IF;

  UPDATE public.visitas_campo
  SET
    estado = 'CERRADO',
    cerrado_at = now(),
    cerrado_por = v_user
  WHERE id = v_visita_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- Trigger: ambiente nuevo durante visita abierta → EN_PROCESO
-- ---------------------------------------------------------------------------
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

  SELECT id INTO v_visita_id
  FROM public.visitas_campo
  WHERE entidad_id = v_entidad_id AND estado = 'ABIERTO'
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

DROP TRIGGER IF EXISTS ambientes_visita_campo_insert ON public.ambientes;
CREATE TRIGGER ambientes_visita_campo_insert
  AFTER INSERT ON public.ambientes
  FOR EACH ROW EXECUTE FUNCTION public.visita_ambiente_on_ambiente_insert();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.visitas_campo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visita_ambientes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS visitas_campo_select ON public.visitas_campo;
CREATE POLICY visitas_campo_select ON public.visitas_campo
  FOR SELECT
  USING (public.can_access_entidad(entidad_id));

DROP POLICY IF EXISTS visitas_campo_insert_contador ON public.visitas_campo;
CREATE POLICY visitas_campo_insert_contador ON public.visitas_campo
  FOR INSERT
  WITH CHECK (public.is_contador() AND public.can_access_entidad(entidad_id));

DROP POLICY IF EXISTS visitas_campo_update_contador ON public.visitas_campo;
CREATE POLICY visitas_campo_update_contador ON public.visitas_campo
  FOR UPDATE
  USING (public.is_contador() AND public.can_access_entidad(entidad_id))
  WITH CHECK (public.is_contador() AND public.can_access_entidad(entidad_id));

DROP POLICY IF EXISTS visita_ambientes_select ON public.visita_ambientes;
CREATE POLICY visita_ambientes_select ON public.visita_ambientes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.visitas_campo v
      WHERE v.id = visita_id AND public.can_access_entidad(v.entidad_id)
    )
  );

DROP POLICY IF EXISTS visita_ambientes_insert_contador ON public.visita_ambientes;
CREATE POLICY visita_ambientes_insert_contador ON public.visita_ambientes
  FOR INSERT
  WITH CHECK (
    public.is_contador()
    AND EXISTS (
      SELECT 1 FROM public.visitas_campo v
      WHERE v.id = visita_id AND public.can_access_entidad(v.entidad_id)
    )
  );

DROP POLICY IF EXISTS visita_ambientes_update_contador ON public.visita_ambientes;
CREATE POLICY visita_ambientes_update_contador ON public.visita_ambientes
  FOR UPDATE
  USING (
    public.is_contador()
    AND EXISTS (
      SELECT 1 FROM public.visitas_campo v
      WHERE v.id = visita_id AND public.can_access_entidad(v.entidad_id)
    )
  )
  WITH CHECK (
    public.is_contador()
    AND EXISTS (
      SELECT 1 FROM public.visitas_campo v
      WHERE v.id = visita_id AND public.can_access_entidad(v.entidad_id)
    )
  );

GRANT SELECT ON public.visitas_campo TO authenticated;
GRANT SELECT ON public.visita_ambientes TO authenticated;
GRANT INSERT, UPDATE ON public.visitas_campo TO authenticated;
GRANT INSERT, UPDATE ON public.visita_ambientes TO authenticated;

GRANT EXECUTE ON FUNCTION public.abrir_visita_campo(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.culminar_ambiente_visita(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cerrar_visita_campo(UUID) TO authenticated;
