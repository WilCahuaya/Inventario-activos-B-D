-- Eliminar cuenta contable solo si ningún ítem del catálogo la usa.

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

  IF v_codigo = '' OR v_codigo !~ '^\d{4,5}$' THEN
    RAISE EXCEPTION 'Código de cuenta contable inválido (use 4 o 5 dígitos)';
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

GRANT EXECUTE ON FUNCTION public.delete_cuenta_contable(TEXT) TO authenticated;
