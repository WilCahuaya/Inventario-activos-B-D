-- Renombrar ambiente de preregistros: «Adquisicion {año}» (sin «preregistrados»).

CREATE OR REPLACE FUNCTION public.ambiente_preregistro_nombre(p_anio INTEGER DEFAULT NULL)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'Adquisicion ' || COALESCE(p_anio, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
$$;

UPDATE public.ambientes
SET
  nombre = public.ambiente_preregistro_nombre(
    COALESCE(
      (regexp_match(nombre, '(\d{4})'))[1]::INTEGER,
      EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
    )
  ),
  updated_at = NOW()
WHERE es_preregistro = TRUE;
