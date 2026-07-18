-- Helper para fusionar observación admin en edición masiva de registrados.
CREATE OR REPLACE FUNCTION public.merge_observacion_admin(
  p_existing TEXT,
  p_admin TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_sep TEXT := E'\n---ADMIN---\n';
  v_contador TEXT;
  v_admin TEXT := NULLIF(trim(COALESCE(p_admin, '')), '');
BEGIN
  IF p_existing IS NULL OR trim(p_existing) = '' THEN
    IF v_admin IS NULL THEN
      RETURN NULL;
    END IF;
    RETURN v_sep || v_admin;
  END IF;

  IF position(v_sep IN p_existing) = 1 THEN
    v_contador := '';
  ELSIF position(v_sep IN p_existing) > 0 THEN
    v_contador := trim(split_part(p_existing, v_sep, 1));
  ELSE
    v_contador := trim(p_existing);
  END IF;

  IF v_admin IS NULL THEN
    RETURN NULLIF(v_contador, '');
  END IF;

  IF v_contador = '' THEN
    RETURN v_sep || v_admin;
  END IF;

  RETURN v_contador || v_sep || v_admin;
END;
$$;
