-- Estado físico del bien opcional (vacío = sin clasificar).
ALTER TABLE public.activos
  ALTER COLUMN estado_bien DROP NOT NULL;

ALTER TABLE public.activos
  ALTER COLUMN estado_bien DROP DEFAULT;
