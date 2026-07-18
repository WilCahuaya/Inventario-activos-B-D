CREATE OR REPLACE FUNCTION public.update_activos_similares(
  p_activo_id UUID,
  p_patch JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template public.activos%ROWTYPE;
  v_updated INTEGER;
  v_total INTEGER;
  v_responsable TEXT;
  v_sede_id UUID;
  v_ambiente_id UUID;
  v_es_contador BOOLEAN;
  v_key TEXT;
  v_allowed TEXT[];
  v_forbidden TEXT[] := ARRAY[
    'id', 'entidad_id', 'correlativo', 'codigo_barras', 'serie',
    'estado_registro', 'motivo_baja', 'created_by', 'created_at', 'updated_at',
    'nombre', 'codigo_catalogo', 'nombre_etiqueta', 'descripcion'
  ];
  v_clear_comprobante BOOLEAN := FALSE;
BEGIN
  IF p_patch IS NULL OR p_patch = '{}'::JSONB THEN
    RAISE EXCEPTION 'No hay cambios para aplicar';
  END IF;

  SELECT * INTO v_template
  FROM public.activos
  WHERE id = p_activo_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Activo no encontrado';
  END IF;

  IF NOT public.can_access_entidad(v_template.entidad_id) THEN
    RAISE EXCEPTION 'Sin permiso para esta entidad';
  END IF;

  IF v_template.estado_registro = 'DADO_DE_BAJA' THEN
    RAISE EXCEPTION 'No puede editar ejemplares de un activo dado de baja';
  END IF;

  SELECT count(*)::INTEGER INTO v_total
  FROM public.activos a
  WHERE public.activo_es_ejemplar_similar(a, v_template);

  IF v_total < 2 THEN
    RAISE EXCEPTION 'No hay suficientes ejemplares para edición masiva';
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_patch)
  LOOP
    IF v_key = ANY (v_forbidden) THEN
      RAISE EXCEPTION 'Campo no permitido en edición masiva: %', v_key;
    END IF;
  END LOOP;

  v_es_contador := public.is_contador();

  IF v_es_contador THEN
    v_allowed := ARRAY[
      'categoria',
      'cuenta_contable_codigo',
      'cuenta_contable_nombre',
      'marca',
      'modelo',
      'color',
      'medidas',
      'caracteristicas',
      'estado_bien',
      'observacion',
      'valor_adquisicion',
      'valor_es_mercado',
      'fecha_adquisicion',
      'comprobante_serie',
      'comprobante_path',
      'foto_path',
      'depreciacion',
      'vida_util_meses'
    ];
    IF v_template.estado_registro = 'PREREGISTRADO' THEN
      v_allowed := v_allowed || ARRAY['posible_ambiente_id'];
    END IF;
  ELSIF v_template.estado_registro = 'PREREGISTRADO' THEN
    v_allowed := ARRAY[
      'categoria',
      'marca',
      'modelo',
      'color',
      'medidas',
      'caracteristicas',
      'estado_bien',
      'observacion',
      'valor_adquisicion',
      'valor_es_mercado',
      'fecha_adquisicion',
      'comprobante_serie',
      'comprobante_path',
      'foto_path',
      'posible_ambiente_id'
    ];
  ELSE
    v_allowed := ARRAY[
      'sede_id',
      'ambiente_id',
      'estado_bien',
      'observacion_admin'
    ];
  END IF;

  FOR v_key IN SELECT jsonb_object_keys(p_patch)
  LOOP
    IF NOT (v_key = ANY (v_allowed)) THEN
      RAISE EXCEPTION 'Campo no permitido para su rol: %', v_key;
    END IF;
  END LOOP;

  IF p_patch ? 'valor_es_mercado' AND (p_patch->>'valor_es_mercado')::BOOLEAN THEN
    v_clear_comprobante := TRUE;
  END IF;

  v_sede_id := CASE
    WHEN p_patch ? 'sede_id' THEN NULLIF(p_patch->>'sede_id', '')::UUID
    ELSE NULL
  END;
  v_ambiente_id := CASE
    WHEN p_patch ? 'ambiente_id' THEN NULLIF(p_patch->>'ambiente_id', '')::UUID
    ELSE NULL
  END;

  IF v_ambiente_id IS NOT NULL THEN
    SELECT a.sede_id, coalesce(trim(a.responsable), '')
    INTO v_sede_id, v_responsable
    FROM public.ambientes a
    WHERE a.id = v_ambiente_id
      AND a.activo = TRUE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ambiente no encontrado o inactivo';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.sedes s
      WHERE s.id = v_sede_id
        AND s.entidad_id = v_template.entidad_id
        AND s.activo = TRUE
    ) THEN
      RAISE EXCEPTION 'La sede del ambiente no pertenece a la entidad';
    END IF;

    IF p_patch ? 'sede_id' AND v_sede_id IS DISTINCT FROM NULLIF(p_patch->>'sede_id', '')::UUID THEN
      RAISE EXCEPTION 'La sede no coincide con el ambiente seleccionado';
    END IF;
  ELSIF v_sede_id IS NOT NULL AND NOT (p_patch ? 'ambiente_id') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.sedes s
      WHERE s.id = v_sede_id
        AND s.entidad_id = v_template.entidad_id
        AND s.activo = TRUE
    ) THEN
      RAISE EXCEPTION 'Sede no válida para la entidad';
    END IF;
  END IF;

  IF v_template.estado_registro = 'REGISTRADO'
     AND (p_patch ? 'sede_id' OR p_patch ? 'ambiente_id')
     AND (v_sede_id IS NULL OR v_ambiente_id IS NULL) THEN
    RAISE EXCEPTION 'Seleccione sede y ambiente';
  END IF;

  UPDATE public.activos a
  SET
    categoria = CASE WHEN p_patch ? 'categoria'
      THEN (p_patch->>'categoria')::public.categoria_bien ELSE a.categoria END,
    cuenta_contable_codigo = CASE WHEN p_patch ? 'cuenta_contable_codigo'
      THEN NULLIF(trim(p_patch->>'cuenta_contable_codigo'), '') ELSE a.cuenta_contable_codigo END,
    cuenta_contable_nombre = CASE WHEN p_patch ? 'cuenta_contable_nombre'
      THEN NULLIF(trim(p_patch->>'cuenta_contable_nombre'), '') ELSE a.cuenta_contable_nombre END,
    marca = CASE WHEN p_patch ? 'marca'
      THEN NULLIF(trim(p_patch->>'marca'), '') ELSE a.marca END,
    modelo = CASE WHEN p_patch ? 'modelo'
      THEN NULLIF(trim(p_patch->>'modelo'), '') ELSE a.modelo END,
    color = CASE WHEN p_patch ? 'color'
      THEN NULLIF(trim(p_patch->>'color'), '') ELSE a.color END,
    medidas = CASE WHEN p_patch ? 'medidas'
      THEN NULLIF(trim(p_patch->>'medidas'), '') ELSE a.medidas END,
    caracteristicas = CASE WHEN p_patch ? 'caracteristicas'
      THEN NULLIF(trim(p_patch->>'caracteristicas'), '') ELSE a.caracteristicas END,
    estado_bien = CASE WHEN p_patch ? 'estado_bien'
      THEN (p_patch->>'estado_bien')::public.estado_bien ELSE a.estado_bien END,
    observacion = CASE
      WHEN p_patch ? 'observacion_admin'
        THEN public.merge_observacion_admin(a.observacion, p_patch->>'observacion_admin')
      WHEN p_patch ? 'observacion'
        THEN NULLIF(trim(p_patch->>'observacion'), '')
      ELSE a.observacion
    END,
    valor_adquisicion = CASE WHEN p_patch ? 'valor_adquisicion'
      THEN NULLIF(p_patch->>'valor_adquisicion', '')::NUMERIC ELSE a.valor_adquisicion END,
    valor_es_mercado = CASE WHEN p_patch ? 'valor_es_mercado'
      THEN (p_patch->>'valor_es_mercado')::BOOLEAN ELSE a.valor_es_mercado END,
    fecha_adquisicion = CASE WHEN p_patch ? 'fecha_adquisicion'
      THEN NULLIF(p_patch->>'fecha_adquisicion', '')::DATE ELSE a.fecha_adquisicion END,
    comprobante_serie = CASE
      WHEN v_clear_comprobante THEN NULL
      WHEN p_patch ? 'comprobante_serie'
        THEN NULLIF(trim(p_patch->>'comprobante_serie'), '')
      ELSE a.comprobante_serie
    END,
    comprobante_path = CASE
      WHEN v_clear_comprobante THEN NULL
      WHEN p_patch ? 'comprobante_path'
        THEN NULLIF(trim(p_patch->>'comprobante_path'), '')
      ELSE a.comprobante_path
    END,
    foto_path = CASE WHEN p_patch ? 'foto_path'
      THEN NULLIF(trim(p_patch->>'foto_path'), '') ELSE a.foto_path END,
    depreciacion = CASE WHEN p_patch ? 'depreciacion'
      THEN NULLIF(trim(p_patch->>'depreciacion'), '') ELSE a.depreciacion END,
    vida_util_meses = CASE WHEN p_patch ? 'vida_util_meses'
      THEN NULLIF(p_patch->>'vida_util_meses', '')::INTEGER ELSE a.vida_util_meses END,
    sede_id = CASE
      WHEN p_patch ? 'ambiente_id' AND v_ambiente_id IS NOT NULL THEN v_sede_id
      WHEN p_patch ? 'sede_id' THEN v_sede_id
      ELSE a.sede_id
    END,
    ambiente_id = CASE WHEN p_patch ? 'ambiente_id'
      THEN v_ambiente_id ELSE a.ambiente_id END,
    posible_ambiente_id = CASE WHEN p_patch ? 'posible_ambiente_id'
      THEN NULLIF(p_patch->>'posible_ambiente_id', '')::UUID ELSE a.posible_ambiente_id END,
    responsable = CASE
      WHEN p_patch ? 'ambiente_id' AND v_ambiente_id IS NOT NULL THEN NULLIF(v_responsable, '')
      ELSE a.responsable
    END,
    updated_by = auth.uid()
  WHERE public.activo_es_ejemplar_similar(a, v_template)
    AND a.estado_registro <> 'DADO_DE_BAJA';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object('actualizados', v_updated);
END;
$$;

NOTIFY pgrst, 'reload schema';
