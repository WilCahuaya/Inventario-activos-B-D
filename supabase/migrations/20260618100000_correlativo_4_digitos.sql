-- Correlativo en código de barras: 4 dígitos (ej. 74643712-0003).

CREATE OR REPLACE FUNCTION public.build_codigo_barras(p_catalogo TEXT, p_correlativo INTEGER)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_catalogo || '-' || LPAD(p_correlativo::TEXT, 4, '0');
$$;

UPDATE public.activos
SET codigo_barras = public.build_codigo_barras(codigo_catalogo, correlativo)
WHERE correlativo IS NOT NULL
  AND codigo_catalogo IS NOT NULL
  AND estado_registro = 'REGISTRADO';
