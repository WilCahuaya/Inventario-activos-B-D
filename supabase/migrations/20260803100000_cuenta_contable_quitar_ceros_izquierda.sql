-- Quita ceros a la izquierda añadidos al forzar 6 dígitos (002524 → 2524, 003361 → 3361).

ALTER TABLE public.catalogo_nacional DISABLE TRIGGER USER;
ALTER TABLE public.activos DISABLE TRIGGER USER;

DO $$
DECLARE
  r RECORD;
  v_nuevo TEXT;
BEGIN
  FOR r IN
    SELECT codigo, nombre
    FROM public.cuentas_contables
    WHERE codigo ~ '^0+\d+$'
    ORDER BY length(codigo) DESC, codigo
  LOOP
    v_nuevo := regexp_replace(r.codigo, '^0+', '');
    IF v_nuevo = '' THEN
      CONTINUE;
    END IF;

    IF EXISTS (SELECT 1 FROM public.cuentas_contables WHERE codigo = v_nuevo) THEN
      UPDATE public.catalogo_nacional
      SET cuenta_codigo = v_nuevo
      WHERE cuenta_codigo = r.codigo;

      UPDATE public.activos
      SET cuenta_contable_codigo = v_nuevo
      WHERE cuenta_contable_codigo = r.codigo;

      UPDATE public.cuentas_contables AS dest
      SET
        nombre = COALESCE(dest.nombre, r.nombre),
        updated_at = NOW()
      WHERE dest.codigo = v_nuevo;

      DELETE FROM public.cuentas_contables WHERE codigo = r.codigo;
    ELSE
      UPDATE public.cuentas_contables
      SET codigo = v_nuevo
      WHERE codigo = r.codigo;
    END IF;
  END LOOP;
END $$;

UPDATE public.activos
SET cuenta_contable_codigo = regexp_replace(cuenta_contable_codigo, '^0+', '')
WHERE cuenta_contable_codigo IS NOT NULL
  AND cuenta_contable_codigo ~ '^0+\d+$'
  AND regexp_replace(cuenta_contable_codigo, '^0+', '') <> '';

UPDATE public.catalogo_nacional
SET cuenta_codigo = regexp_replace(cuenta_codigo, '^0+', '')
WHERE cuenta_codigo IS NOT NULL
  AND cuenta_codigo ~ '^0+\d+$'
  AND regexp_replace(cuenta_codigo, '^0+', '') <> '';

INSERT INTO public.cuentas_contables (codigo, nombre)
SELECT DISTINCT trim(cuenta_codigo), NULL
FROM public.catalogo_nacional
WHERE cuenta_codigo IS NOT NULL
  AND trim(cuenta_codigo) ~ '^\d{1,6}$'
  AND NOT EXISTS (
    SELECT 1 FROM public.cuentas_contables cc WHERE cc.codigo = trim(catalogo_nacional.cuenta_codigo)
  )
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO public.cuentas_contables (codigo, nombre)
VALUES ('2524', NULL)
ON CONFLICT (codigo) DO NOTHING;

ALTER TABLE public.activos ENABLE TRIGGER USER;
ALTER TABLE public.catalogo_nacional ENABLE TRIGGER USER;
