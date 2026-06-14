-- Nombre corto opcional para impresión de etiquetas 50×25 mm

ALTER TABLE public.entidades
  ADD COLUMN IF NOT EXISTS nombre_etiqueta TEXT;

ALTER TABLE public.activos
  ADD COLUMN IF NOT EXISTS nombre_etiqueta TEXT;

COMMENT ON COLUMN public.entidades.nombre_etiqueta IS
  'Texto opcional para pie de etiqueta; si es NULL se usa nombre.';

COMMENT ON COLUMN public.activos.nombre_etiqueta IS
  'Texto opcional para nombre en etiqueta; si es NULL se usa nombre.';
