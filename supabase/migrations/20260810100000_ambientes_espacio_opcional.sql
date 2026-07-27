-- Espacios físicos por sucursal; ambientes pueden ocupar uno (opcional).

CREATE TABLE IF NOT EXISTS public.espacios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id UUID NOT NULL REFERENCES public.sedes(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_espacios_sede_nombre_activo
  ON public.espacios (sede_id, lower(trim(nombre)))
  WHERE activo = TRUE;

CREATE INDEX IF NOT EXISTS idx_espacios_sede ON public.espacios(sede_id);

DROP TRIGGER IF EXISTS espacios_updated_at ON public.espacios;
CREATE TRIGGER espacios_updated_at
  BEFORE UPDATE ON public.espacios
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.ambientes
  ADD COLUMN IF NOT EXISTS espacio_id UUID REFERENCES public.espacios(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ambientes_espacio_id
  ON public.ambientes (espacio_id)
  WHERE espacio_id IS NOT NULL;

-- Un espacio activo solo puede estar ocupado por un ambiente activo.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ambientes_espacio_unico
  ON public.ambientes (espacio_id)
  WHERE espacio_id IS NOT NULL AND activo = TRUE;

CREATE OR REPLACE FUNCTION public.validate_ambiente_espacio()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_espacio_sede UUID;
BEGIN
  IF NEW.espacio_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT e.sede_id INTO v_espacio_sede
  FROM public.espacios e
  WHERE e.id = NEW.espacio_id AND e.activo = TRUE;

  IF v_espacio_sede IS NULL THEN
    RAISE EXCEPTION 'El espacio seleccionado no existe o está inactivo.';
  END IF;

  IF v_espacio_sede IS DISTINCT FROM NEW.sede_id THEN
    RAISE EXCEPTION 'El espacio debe pertenecer a la misma sucursal del ambiente.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ambientes_validate_espacio ON public.ambientes;
CREATE TRIGGER ambientes_validate_espacio
  BEFORE INSERT OR UPDATE OF espacio_id, sede_id ON public.ambientes
  FOR EACH ROW EXECUTE FUNCTION public.validate_ambiente_espacio();

ALTER TABLE public.espacios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS espacios_select ON public.espacios;
CREATE POLICY espacios_select ON public.espacios FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sedes s
      WHERE s.id = sede_id AND public.can_access_entidad(s.entidad_id)
    )
  );

DROP POLICY IF EXISTS espacios_write_contador ON public.espacios;
CREATE POLICY espacios_write_contador ON public.espacios FOR ALL TO authenticated
  USING (public.is_contador())
  WITH CHECK (public.is_contador());

DROP POLICY IF EXISTS espacios_insert_admin ON public.espacios;
CREATE POLICY espacios_insert_admin ON public.espacios FOR INSERT TO authenticated
  WITH CHECK (
    public.is_contador()
    OR (
      public.my_entidad_id() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.sedes s
        WHERE s.id = sede_id AND s.entidad_id = public.my_entidad_id()
      )
    )
  );

DROP POLICY IF EXISTS espacios_update_admin ON public.espacios;
CREATE POLICY espacios_update_admin ON public.espacios FOR UPDATE TO authenticated
  USING (
    public.is_contador()
    OR (
      public.my_entidad_id() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.sedes s
        WHERE s.id = sede_id AND s.entidad_id = public.my_entidad_id()
      )
    )
  )
  WITH CHECK (
    public.is_contador()
    OR (
      public.my_entidad_id() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.sedes s
        WHERE s.id = sede_id AND s.entidad_id = public.my_entidad_id()
      )
    )
  );
