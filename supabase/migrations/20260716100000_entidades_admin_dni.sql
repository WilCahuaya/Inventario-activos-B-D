-- DNI del administrador de la entidad (8 dígitos, Perú).

ALTER TABLE public.entidades
  ADD COLUMN IF NOT EXISTS admin_dni TEXT;

COMMENT ON COLUMN public.entidades.admin_dni IS
  'DNI del administrador de la entidad; se replica al responsable administrador.';
