-- Fase 2 — Datos extendidos entidad/ambiente y sede Principal automática

ALTER TABLE public.entidades
  ADD COLUMN IF NOT EXISTS direccion TEXT,
  ADD COLUMN IF NOT EXISTS admin_nombre TEXT,
  ADD COLUMN IF NOT EXISTS admin_email TEXT,
  ADD COLUMN IF NOT EXISTS admin_telefono TEXT;

ALTER TABLE public.sedes
  ADD COLUMN IF NOT EXISTS es_principal BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.ambientes
  ADD COLUMN IF NOT EXISTS descripcion TEXT,
  ADD COLUMN IF NOT EXISTS responsable TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_sedes_entidad_principal
  ON public.sedes (entidad_id)
  WHERE es_principal = TRUE;

-- Sede Principal al crear entidad
CREATE OR REPLACE FUNCTION public.create_sede_principal_for_entidad()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.sedes (entidad_id, nombre, es_principal)
  VALUES (NEW.id, 'Principal', TRUE);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS entidades_create_sede_principal ON public.entidades;
CREATE TRIGGER entidades_create_sede_principal
  AFTER INSERT ON public.entidades
  FOR EACH ROW EXECUTE FUNCTION public.create_sede_principal_for_entidad();

-- Entidades existentes sin sede Principal
INSERT INTO public.sedes (entidad_id, nombre, es_principal)
SELECT e.id, 'Principal', TRUE
FROM public.entidades e
WHERE NOT EXISTS (
  SELECT 1 FROM public.sedes s
  WHERE s.entidad_id = e.id AND s.es_principal = TRUE
);
