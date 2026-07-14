-- Permitir borrar el ambiente de preregistros solo en cascada (al eliminar sede/entidad).
-- El borrado directo del ambiente de preregistros sigue bloqueado.

CREATE OR REPLACE FUNCTION public.enforce_ambiente_preregistro_protected()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.es_preregistro THEN
    IF TG_OP = 'DELETE' THEN
      -- depth > 1: DELETE disparado por ON DELETE CASCADE (sede → ambientes).
      IF pg_trigger_depth() <= 1 THEN
        RAISE EXCEPTION 'El ambiente de preregistros no se puede eliminar';
      END IF;
    ELSIF TG_OP = 'UPDATE' AND NEW.activo = FALSE THEN
      RAISE EXCEPTION 'El ambiente de preregistros no se puede eliminar';
    ELSIF TG_OP = 'UPDATE' AND (
      NEW.sede_id IS DISTINCT FROM OLD.sede_id
      OR NEW.es_preregistro IS DISTINCT FROM OLD.es_preregistro
    ) THEN
      RAISE EXCEPTION 'No se puede modificar la sede ni el tipo del ambiente de preregistros';
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
