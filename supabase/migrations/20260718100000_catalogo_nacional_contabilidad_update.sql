-- Permite al contador completar cuenta_codigo y contabilidad en ítems del catálogo nacional (SBN).

CREATE OR REPLACE FUNCTION public.update_catalogo_nacional_contabilidad(
  p_codigo TEXT,
  p_cuenta_codigo TEXT,
  p_contabilidad TEXT
)
RETURNS public.catalogo_nacional
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo TEXT := trim(p_codigo);
  v_row public.catalogo_nacional;
BEGIN
  IF NOT public.is_contador() THEN
    RAISE EXCEPTION 'Solo el contador puede actualizar la contabilidad del catálogo nacional';
  END IF;

  IF v_codigo = '' THEN
    RAISE EXCEPTION 'Código de catálogo inválido';
  END IF;

  UPDATE public.catalogo_nacional
  SET
    cuenta_codigo = NULLIF(trim(p_cuenta_codigo), ''),
    contabilidad = NULLIF(trim(p_contabilidad), '')
  WHERE codigo = v_codigo
    AND origen = 'NACIONAL'
  RETURNING * INTO v_row;

  IF v_row.codigo IS NULL THEN
    RAISE EXCEPTION 'Ítem no encontrado o no pertenece al catálogo nacional';
  END IF;

  RETURN v_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_catalogo_nacional_contabilidad(TEXT, TEXT, TEXT) TO authenticated;
