-- DNI del responsable (documento nacional de identidad, Perú: 8 dígitos)

ALTER TABLE public.responsables
  ADD COLUMN IF NOT EXISTS dni TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_responsables_entidad_dni
  ON public.responsables (entidad_id, dni)
  WHERE dni IS NOT NULL AND trim(dni) <> '';
