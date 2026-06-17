-- Opciones de grupo/clase creadas por el contador (además de las listas fijas en la app).

CREATE TABLE IF NOT EXISTS public.catalogo_opciones_personalizadas (
  tipo TEXT NOT NULL CHECK (tipo IN ('grupo', 'clase')),
  valor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tipo, valor)
);

CREATE INDEX IF NOT EXISTS idx_catalogo_opciones_personalizadas_tipo
  ON public.catalogo_opciones_personalizadas (tipo);

ALTER TABLE public.catalogo_opciones_personalizadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalogo_opciones_personalizadas_select ON public.catalogo_opciones_personalizadas;
CREATE POLICY catalogo_opciones_personalizadas_select ON public.catalogo_opciones_personalizadas
  FOR SELECT TO authenticated
  USING (public.is_contador());

DROP POLICY IF EXISTS catalogo_opciones_personalizadas_insert ON public.catalogo_opciones_personalizadas;
CREATE POLICY catalogo_opciones_personalizadas_insert ON public.catalogo_opciones_personalizadas
  FOR INSERT TO authenticated
  WITH CHECK (public.is_contador());

DROP POLICY IF EXISTS catalogo_opciones_personalizadas_delete ON public.catalogo_opciones_personalizadas;
CREATE POLICY catalogo_opciones_personalizadas_delete ON public.catalogo_opciones_personalizadas
  FOR DELETE TO authenticated
  USING (public.is_contador());

CREATE OR REPLACE FUNCTION public.list_catalogo_opciones_personalizadas(p_tipo TEXT)
RETURNS TABLE (valor TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT trim(o.valor) AS valor
  FROM public.catalogo_opciones_personalizadas o
  WHERE o.tipo = p_tipo AND trim(o.valor) <> ''
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION public.list_catalogo_opciones_personalizadas(TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.delete_catalogo_opcion_personalizada(
  p_tipo TEXT,
  p_valor TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_valor TEXT := trim(p_valor);
BEGIN
  IF NOT public.is_contador() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_tipo NOT IN ('grupo', 'clase') OR v_valor = '' THEN
    RAISE EXCEPTION 'Parámetros inválidos';
  END IF;

  IF p_tipo = 'grupo' AND EXISTS (
    SELECT 1
    FROM public.catalogo_nacional c
    WHERE c.origen = 'PROPIO' AND trim(c.grupo) = v_valor
  ) THEN
    RAISE EXCEPTION 'No se puede eliminar: hay ítems propios con este grupo.';
  END IF;

  IF p_tipo = 'clase' AND EXISTS (
    SELECT 1
    FROM public.catalogo_nacional c
    WHERE c.origen = 'PROPIO' AND trim(c.clase) = v_valor
  ) THEN
    RAISE EXCEPTION 'No se puede eliminar: hay ítems propios con esta clase.';
  END IF;

  DELETE FROM public.catalogo_opciones_personalizadas
  WHERE tipo = p_tipo AND trim(valor) = v_valor;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_catalogo_opcion_personalizada(TEXT, TEXT) TO authenticated;
