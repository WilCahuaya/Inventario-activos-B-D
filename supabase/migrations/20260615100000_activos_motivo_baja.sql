-- Motivo obligatorio al dar de baja un activo (contador)
ALTER TABLE public.activos
  ADD COLUMN IF NOT EXISTS motivo_baja TEXT;

COMMENT ON COLUMN public.activos.motivo_baja IS 'Motivo registrado al pasar el activo a DADO_DE_BAJA.';

CREATE OR REPLACE FUNCTION public.log_historial_activo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fields TEXT[] := ARRAY[
    'nombre', 'descripcion', 'caracteristicas', 'estado_registro', 'estado_bien', 'categoria',
    'codigo_catalogo', 'correlativo', 'sede_id', 'ambiente_id',
    'valor_adquisicion', 'valor_es_mercado', 'fecha_adquisicion', 'vida_util_meses', 'depreciacion',
    'marca', 'modelo', 'serie', 'color', 'medidas',
    'medida_largo', 'medida_ancho', 'medida_altura',
    'responsable', 'observacion', 'motivo_baja',
    'foto_path', 'comprobante_path'
  ];
  v_field TEXT;
  v_old TEXT;
  v_new TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.historial_cambios (activo_id, entidad_id, usuario_id, accion, campo, valor_nuevo)
    VALUES (NEW.id, NEW.entidad_id, auth.uid(), 'INSERT', 'activo', NEW.nombre);
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    FOREACH v_field IN ARRAY v_fields LOOP
      EXECUTE format('SELECT ($1).%I::TEXT, ($2).%I::TEXT', v_field, v_field)
        INTO v_old, v_new USING OLD, NEW;
      IF v_old IS DISTINCT FROM v_new THEN
        INSERT INTO public.historial_cambios (
          activo_id, entidad_id, usuario_id, accion, campo, valor_anterior, valor_nuevo
        ) VALUES (
          NEW.id, NEW.entidad_id, auth.uid(), 'UPDATE', v_field, v_old, v_new
        );
      END IF;
    END LOOP;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;
