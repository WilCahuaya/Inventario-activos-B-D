-- Cuenta contable: hasta 6 dígitos (1–6), no exactamente 6.

CREATE OR REPLACE FUNCTION public.upsert_cuenta_contable(
  p_codigo TEXT,
  p_nombre TEXT
)
RETURNS public.cuentas_contables
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo TEXT := trim(p_codigo);
  v_nombre TEXT := NULLIF(trim(p_nombre), '');
  v_row public.cuentas_contables;
BEGIN
  IF v_codigo = '' OR v_codigo !~ '^\d{1,6}$' THEN
    RAISE EXCEPTION 'Código de cuenta contable inválido (use entre 1 y 6 dígitos)';
  END IF;

  INSERT INTO public.cuentas_contables (codigo, nombre)
  VALUES (v_codigo, v_nombre)
  ON CONFLICT (codigo) DO UPDATE
  SET
    nombre = COALESCE(EXCLUDED.nombre, cuentas_contables.nombre),
    updated_at = NOW()
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_cuenta_contable(p_codigo TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo TEXT := trim(p_codigo);
  v_uso INTEGER;
BEGIN
  IF NOT public.is_contador() THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF v_codigo = '' OR v_codigo !~ '^\d{1,6}$' THEN
    RAISE EXCEPTION 'Código de cuenta contable inválido (use entre 1 y 6 dígitos)';
  END IF;

  SELECT count(*)::INTEGER INTO v_uso
  FROM public.catalogo_nacional
  WHERE cuenta_codigo = v_codigo;

  IF v_uso > 0 THEN
    RAISE EXCEPTION 'No se puede eliminar: % bien(es) del catálogo usan la cuenta %.', v_uso, v_codigo;
  END IF;

  DELETE FROM public.cuentas_contables WHERE codigo = v_codigo;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'La cuenta contable % no existe.', v_codigo;
  END IF;
END;
$$;

ALTER TABLE public.cuentas_contables
  DROP CONSTRAINT IF EXISTS cuentas_contables_codigo_format;

ALTER TABLE public.cuentas_contables
  ADD CONSTRAINT cuentas_contables_codigo_format CHECK (codigo ~ '^\d{1,6}$');
