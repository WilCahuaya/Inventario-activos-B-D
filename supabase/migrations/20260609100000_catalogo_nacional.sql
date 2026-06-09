-- Catálogo nacional de activos (SBN) — maestro en Supabase
-- Fuente: docs/Catalogo nacional de activos.ods (~4.726 ítems)

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS public.catalogo_nacional (
  codigo CHAR(8) PRIMARY KEY,
  denominacion TEXT NOT NULL,
  grupo TEXT,
  clase TEXT,
  cuenta_codigo TEXT,
  contabilidad TEXT,
  depreciacion TEXT,
  resolucion TEXT,
  estado TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catalogo_denominacion_trgm
  ON public.catalogo_nacional USING gin (denominacion gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_catalogo_cuenta_codigo
  ON public.catalogo_nacional (cuenta_codigo)
  WHERE cuenta_codigo IS NOT NULL;

-- Validar códigos de catálogo al registrar activos
ALTER TABLE public.activos
  DROP CONSTRAINT IF EXISTS activos_codigo_catalogo_fkey;

ALTER TABLE public.activos
  ADD CONSTRAINT activos_codigo_catalogo_fkey
  FOREIGN KEY (codigo_catalogo) REFERENCES public.catalogo_nacional (codigo)
  ON DELETE RESTRICT;

-- Búsqueda para autocompletado web
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
  FROM public.catalogo_nacional c
  WHERE
    p_query IS NULL
    OR trim(p_query) = ''
    OR c.codigo ILIKE trim(p_query) || '%'
    OR c.denominacion ILIKE '%' || trim(p_query) || '%'
  ORDER BY
    CASE WHEN c.codigo = trim(p_query) THEN 0 ELSE 1 END,
    CASE WHEN c.codigo ILIKE trim(p_query) || '%' THEN 0 ELSE 1 END,
    length(c.denominacion),
    c.denominacion
  LIMIT LEAST(GREATEST(p_limit, 1), 50);
$$;

GRANT EXECUTE ON FUNCTION public.search_catalogo_nacional(TEXT, INTEGER) TO authenticated;

-- RLS: lectura para usuarios autenticados; escritura solo service_role (import)
ALTER TABLE public.catalogo_nacional ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalogo_select ON public.catalogo_nacional;
CREATE POLICY catalogo_select ON public.catalogo_nacional
  FOR SELECT TO authenticated
  USING (TRUE);

GRANT SELECT ON public.catalogo_nacional TO authenticated;
