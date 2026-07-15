-- Sube el tope de search_catalogo_nacional para la consulta paginada (UI 25/página).
-- El picker sigue pidiendo p_limit bajo (≤ 50).

CREATE OR REPLACE FUNCTION public.search_catalogo_nacional(
  p_query TEXT,
  p_limit INTEGER DEFAULT 20
)
RETURNS SETOF public.catalogo_nacional
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM public.catalogo_nacional
  WHERE
    codigo ILIKE (trim(p_query) || '%')
    OR denominacion ILIKE ('%' || trim(p_query) || '%')
  ORDER BY
    CASE WHEN codigo = trim(p_query) THEN 0 ELSE 1 END,
    CASE WHEN codigo ILIKE (trim(p_query) || '%') THEN 0 ELSE 1 END,
    length(denominacion),
    denominacion
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 500);
$$;
