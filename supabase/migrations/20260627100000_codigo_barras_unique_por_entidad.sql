-- El correlativo (y codigo_barras) es por entidad: distintas entidades pueden compartir
-- el mismo texto (ej. 74643712-0001). La restricción global impedía registrar el segundo activo.

ALTER TABLE public.activos
  DROP CONSTRAINT IF EXISTS activos_codigo_barras_unique;

CREATE UNIQUE INDEX activos_codigo_barras_por_entidad_unique
  ON public.activos (entidad_id, codigo_barras)
  WHERE codigo_barras IS NOT NULL;
