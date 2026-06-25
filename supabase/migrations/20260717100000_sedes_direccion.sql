-- Dirección opcional por sucursal (sede secundaria).
ALTER TABLE public.sedes
  ADD COLUMN IF NOT EXISTS direccion TEXT;
