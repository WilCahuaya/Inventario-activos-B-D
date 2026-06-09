-- Campos extendidos del activo — ficha de inventario MVP

ALTER TABLE public.activos
  ADD COLUMN IF NOT EXISTS caracteristicas TEXT,
  ADD COLUMN IF NOT EXISTS marca TEXT,
  ADD COLUMN IF NOT EXISTS modelo TEXT,
  ADD COLUMN IF NOT EXISTS serie TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS medida_largo NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS medida_ancho NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS medida_altura NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS depreciacion TEXT,
  ADD COLUMN IF NOT EXISTS observacion TEXT,
  ADD COLUMN IF NOT EXISTS responsable TEXT,
  ADD COLUMN IF NOT EXISTS valor_es_mercado BOOLEAN NOT NULL DEFAULT FALSE;

-- Vista previa del código de barras (siguiente correlativo por entidad)
CREATE OR REPLACE FUNCTION public.preview_codigo_barras(
  p_entidad_id UUID,
  p_catalogo TEXT
)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.build_codigo_barras(p_catalogo, public.next_correlativo(p_entidad_id));
$$;

GRANT EXECUTE ON FUNCTION public.preview_codigo_barras(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_correlativo(UUID) TO authenticated;

-- Admin entidad puede crear sedes y ambientes de su entidad
DROP POLICY IF EXISTS sedes_insert_admin ON public.sedes;
CREATE POLICY sedes_insert_admin ON public.sedes FOR INSERT TO authenticated
  WITH CHECK (
    public.is_contador()
    OR public.my_entidad_id() = entidad_id
  );

DROP POLICY IF EXISTS sedes_update ON public.sedes;
CREATE POLICY sedes_update ON public.sedes FOR UPDATE TO authenticated
  USING (public.is_contador()) WITH CHECK (public.is_contador());

DROP POLICY IF EXISTS sedes_delete ON public.sedes;
CREATE POLICY sedes_delete ON public.sedes FOR DELETE TO authenticated
  USING (public.is_contador());

DROP POLICY IF EXISTS ambientes_insert_admin ON public.ambientes;
CREATE POLICY ambientes_insert_admin ON public.ambientes FOR INSERT TO authenticated
  WITH CHECK (
    public.is_contador()
    OR (
      public.my_entidad_id() IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.sedes s
        WHERE s.id = sede_id AND s.entidad_id = public.my_entidad_id()
      )
    )
  );

-- Historial: registrar nuevos campos
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
    'marca', 'modelo', 'serie', 'color',
    'medida_largo', 'medida_ancho', 'medida_altura',
    'responsable', 'observacion',
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
