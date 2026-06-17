-- Responsables por entidad (personas sin cuenta; asignables a ambientes)

CREATE TABLE IF NOT EXISTS public.responsables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id UUID NOT NULL REFERENCES public.entidades(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  email TEXT,
  telefono TEXT,
  cargo TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_responsables_entidad_nombre
  ON public.responsables (entidad_id, lower(trim(nombre)));

CREATE INDEX IF NOT EXISTS idx_responsables_entidad_activo
  ON public.responsables (entidad_id, activo);

DROP TRIGGER IF EXISTS responsables_updated_at ON public.responsables;
CREATE TRIGGER responsables_updated_at
  BEFORE UPDATE ON public.responsables
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ambientes
  ADD COLUMN IF NOT EXISTS responsable_id UUID REFERENCES public.responsables(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ambientes_responsable_id
  ON public.ambientes (responsable_id)
  WHERE responsable_id IS NOT NULL;

-- Sincronizar texto denormalizado en ambientes.responsable
CREATE OR REPLACE FUNCTION public.sync_ambiente_responsable_text()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.responsable_id IS NULL THEN
    NEW.responsable := NULL;
  ELSE
    SELECT r.nombre INTO NEW.responsable
    FROM public.responsables r
    WHERE r.id = NEW.responsable_id;
    IF NEW.responsable IS NULL THEN
      RAISE EXCEPTION 'Responsable no encontrado';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_ambiente_responsable_entidad()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entidad_sede UUID;
  v_entidad_resp UUID;
BEGIN
  IF NEW.responsable_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT s.entidad_id INTO v_entidad_sede
  FROM public.sedes s
  WHERE s.id = NEW.sede_id;

  SELECT r.entidad_id INTO v_entidad_resp
  FROM public.responsables r
  WHERE r.id = NEW.responsable_id AND r.activo = TRUE;

  IF v_entidad_resp IS NULL THEN
    RAISE EXCEPTION 'Responsable no válido o inactivo';
  END IF;

  IF v_entidad_sede IS DISTINCT FROM v_entidad_resp THEN
    RAISE EXCEPTION 'El responsable no pertenece a la entidad del ambiente';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ambientes_validate_responsable ON public.ambientes;
CREATE TRIGGER ambientes_validate_responsable
  BEFORE INSERT OR UPDATE OF responsable_id, sede_id ON public.ambientes
  FOR EACH ROW EXECUTE FUNCTION public.validate_ambiente_responsable_entidad();

DROP TRIGGER IF EXISTS ambientes_sync_responsable_text ON public.ambientes;
CREATE TRIGGER ambientes_sync_responsable_text
  BEFORE INSERT OR UPDATE OF responsable_id ON public.ambientes
  FOR EACH ROW EXECUTE FUNCTION public.sync_ambiente_responsable_text();

-- Al renombrar responsable, actualizar texto en ambientes vinculados
CREATE OR REPLACE FUNCTION public.sync_ambientes_on_responsable_rename()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.nombre IS DISTINCT FROM NEW.nombre THEN
    UPDATE public.ambientes
    SET responsable = NEW.nombre
    WHERE responsable_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS responsables_rename_ambientes ON public.responsables;
CREATE TRIGGER responsables_rename_ambientes
  AFTER UPDATE OF nombre ON public.responsables
  FOR EACH ROW EXECUTE FUNCTION public.sync_ambientes_on_responsable_rename();

-- Migrar textos existentes en ambientes.responsable
INSERT INTO public.responsables (entidad_id, nombre)
SELECT DISTINCT s.entidad_id, trim(a.responsable)
FROM public.ambientes a
JOIN public.sedes s ON s.id = a.sede_id
WHERE a.responsable IS NOT NULL
  AND trim(a.responsable) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.responsables r
    WHERE r.entidad_id = s.entidad_id
      AND lower(trim(r.nombre)) = lower(trim(a.responsable))
  );

UPDATE public.ambientes a
SET responsable_id = r.id
FROM public.sedes s
JOIN public.responsables r ON r.entidad_id = s.entidad_id
WHERE a.sede_id = s.id
  AND a.responsable IS NOT NULL
  AND trim(a.responsable) <> ''
  AND a.responsable_id IS NULL
  AND lower(trim(r.nombre)) = lower(trim(a.responsable));

-- RLS
ALTER TABLE public.responsables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS responsables_select ON public.responsables;
CREATE POLICY responsables_select ON public.responsables
  FOR SELECT TO authenticated
  USING (public.can_access_entidad(entidad_id));

DROP POLICY IF EXISTS responsables_insert ON public.responsables;
CREATE POLICY responsables_insert ON public.responsables
  FOR INSERT TO authenticated
  WITH CHECK (public.can_access_entidad(entidad_id));

DROP POLICY IF EXISTS responsables_update ON public.responsables;
CREATE POLICY responsables_update ON public.responsables
  FOR UPDATE TO authenticated
  USING (public.can_access_entidad(entidad_id))
  WITH CHECK (public.can_access_entidad(entidad_id));

GRANT SELECT, INSERT, UPDATE ON public.responsables TO authenticated;
