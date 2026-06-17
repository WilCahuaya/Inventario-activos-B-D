-- Grupos distintos del catálogo nacional (para alta de ítems propios cuenta de orden)

CREATE OR REPLACE FUNCTION public.list_catalogo_grupos()
RETURNS TABLE (grupo TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT trim(c.grupo) AS grupo
  FROM public.catalogo_nacional c
  WHERE c.grupo IS NOT NULL AND trim(c.grupo) <> ''
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION public.list_catalogo_grupos() TO authenticated;
