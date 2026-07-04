-- Normaliza cuenta_codigo y contabilidad en todo catalogo_nacional:
-- - código en cuenta_codigo (4-5 dígitos)
-- - nombre sin repetir el código en contabilidad

-- 1) Separar código y nombre cuando solo hay texto en contabilidad
UPDATE public.catalogo_nacional
SET
  cuenta_codigo = (regexp_match(trim(contabilidad), '^(\d{4,5})'))[1],
  contabilidad = NULLIF(
    trim(
      CASE
        WHEN trim(contabilidad) ~ '^\d{4,5}\s+' THEN regexp_replace(trim(contabilidad), '^\d{4,5}\s+', '')
        WHEN trim(contabilidad) ~ '^\d{4,5}$' THEN ''
        ELSE trim(contabilidad)
      END
    ),
    ''
  )
WHERE cuenta_codigo IS NULL
  AND contabilidad IS NOT NULL
  AND trim(contabilidad) ~ '^\d{4,5}';

-- 2) Quitar el código duplicado al inicio del nombre
UPDATE public.catalogo_nacional
SET contabilidad = trim(regexp_replace(trim(contabilidad), '^' || cuenta_codigo || '\s+', ''))
WHERE cuenta_codigo IS NOT NULL
  AND contabilidad IS NOT NULL
  AND trim(contabilidad) LIKE cuenta_codigo || ' %';

-- 3) Nombre vacío si solo repetía el código
UPDATE public.catalogo_nacional
SET contabilidad = NULL
WHERE cuenta_codigo IS NOT NULL
  AND contabilidad IS NOT NULL
  AND trim(contabilidad) = cuenta_codigo;

-- 4) Limpiar espacios en cuenta_codigo
UPDATE public.catalogo_nacional
SET cuenta_codigo = NULLIF(trim(cuenta_codigo), '')
WHERE cuenta_codigo IS NOT NULL
  AND cuenta_codigo <> trim(cuenta_codigo);
