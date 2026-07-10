-- Cuenta contable por activo (texto libre, sin FK a cuentas_contables).
-- Si están vacíos, la UI y reportes usan el valor del catálogo nacional como respaldo.

ALTER TABLE public.activos
  ADD COLUMN IF NOT EXISTS cuenta_contable_codigo TEXT,
  ADD COLUMN IF NOT EXISTS cuenta_contable_nombre TEXT;

COMMENT ON COLUMN public.activos.cuenta_contable_codigo IS
  'Código de cuenta contable propio del bien (4-6 dígitos). Sin FK; snapshot por activo.';
COMMENT ON COLUMN public.activos.cuenta_contable_nombre IS
  'Nombre/denominación de la cuenta contable del bien. Texto libre, sin FK.';

CREATE INDEX IF NOT EXISTS idx_activos_cuenta_contable_codigo
  ON public.activos (cuenta_contable_codigo)
  WHERE cuenta_contable_codigo IS NOT NULL;
