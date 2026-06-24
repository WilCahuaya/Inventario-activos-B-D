-- Agrupación de lotes por datos de compra/identificación compartidos.
-- Edición masiva limitada a campos económicos y documentación.

CREATE OR REPLACE FUNCTION public.activo_es_ejemplar_similar(
  a public.activos,
  t public.activos
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    a.entidad_id = t.entidad_id
    AND a.sede_id IS NOT DISTINCT FROM t.sede_id
    AND a.ambiente_id IS NOT DISTINCT FROM t.ambiente_id
    AND a.codigo_catalogo = t.codigo_catalogo
    AND a.categoria = t.categoria
    AND trim(a.nombre) = trim(t.nombre)
    AND coalesce(trim(a.marca), '') = coalesce(trim(t.marca), '')
    AND coalesce(trim(a.modelo), '') = coalesce(trim(t.modelo), '')
    AND coalesce(trim(a.color), '') = coalesce(trim(t.color), '')
    AND coalesce(trim(a.medidas), '') = coalesce(trim(t.medidas), '')
    AND coalesce(trim(a.caracteristicas), '') = coalesce(trim(t.caracteristicas), '')
    AND a.valor_adquisicion IS NOT DISTINCT FROM t.valor_adquisicion
    AND a.valor_es_mercado IS NOT DISTINCT FROM t.valor_es_mercado
    AND a.fecha_adquisicion IS NOT DISTINCT FROM t.fecha_adquisicion
    AND coalesce(trim(a.comprobante_serie), '') = coalesce(trim(t.comprobante_serie), '')
    AND coalesce(trim(a.depreciacion), '') = coalesce(trim(t.depreciacion), '')
    AND a.estado_registro <> 'DADO_DE_BAJA';
$$;

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
    'estado_registro', 'motivo_baja', 'created_by', 'created_at', 'updated_at'
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
      'valor_adquisicion',
      'valor_es_mercado',
      'fecha_adquisicion',
      'comprobante_serie',
      'comprobante_path',
      'foto_path',
      'depreciacion',
      'observacion'
    ];
  ELSIF v_template.estado_registro = 'PREREGISTRADO' THEN
    v_allowed := ARRAY['posible_ambiente_id'];
  ELSE
    v_allowed := ARRAY['sede_id', 'ambiente_id'];
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
    observacion = CASE WHEN p_patch ? 'observacion'
      THEN NULLIF(trim(p_patch->>'observacion'), '') ELSE a.observacion END,
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

-- Al agregar unidades al lote, copiar serie de comprobante (y PDF si existe).

CREATE OR REPLACE FUNCTION public.create_activos_similares(
  p_activo_id UUID,
  p_cantidad INTEGER,
  p_sede_id UUID DEFAULT NULL,
  p_ambiente_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template public.activos%ROWTYPE;
  v_i INTEGER;
  v_first TEXT;
  v_last TEXT;
  v_codigo TEXT;
  v_estado public.estado_registro;
  v_sede_id UUID;
  v_ambiente_id UUID;
  v_ambiente public.ambientes%ROWTYPE;
  v_sede_entidad_id UUID;
BEGIN
  IF p_cantidad IS NULL OR p_cantidad < 1 OR p_cantidad > 500 THEN
    RAISE EXCEPTION 'La cantidad debe estar entre 1 y 500';
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
    RAISE EXCEPTION 'No puede duplicar un activo dado de baja';
  END IF;

  IF p_ambiente_id IS NOT NULL THEN
    SELECT * INTO v_ambiente
    FROM public.ambientes
    WHERE id = p_ambiente_id
      AND activo = TRUE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Ambiente no encontrado o inactivo';
    END IF;

    SELECT entidad_id INTO v_sede_entidad_id
    FROM public.sedes
    WHERE id = v_ambiente.sede_id
      AND activo = TRUE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Sede del ambiente no encontrada o inactiva';
    END IF;

    IF v_sede_entidad_id <> v_template.entidad_id THEN
      RAISE EXCEPTION 'El ambiente debe pertenecer a la misma entidad';
    END IF;

    IF p_sede_id IS NOT NULL AND p_sede_id <> v_ambiente.sede_id THEN
      RAISE EXCEPTION 'La sede no coincide con el ambiente seleccionado';
    END IF;

    v_sede_id := v_ambiente.sede_id;
    v_ambiente_id := p_ambiente_id;
  ELSE
    v_sede_id := v_template.sede_id;
    v_ambiente_id := v_template.ambiente_id;
  END IF;

  FOR v_i IN 1..p_cantidad LOOP
    INSERT INTO public.activos (
      entidad_id,
      sede_id,
      ambiente_id,
      codigo_catalogo,
      nombre,
      nombre_etiqueta,
      descripcion,
      caracteristicas,
      estado_bien,
      categoria,
      marca,
      modelo,
      color,
      medidas,
      medida_largo,
      medida_ancho,
      medida_altura,
      depreciacion,
      observacion,
      responsable,
      valor_adquisicion,
      valor_es_mercado,
      fecha_adquisicion,
      vida_util_meses,
      comprobante_serie,
      comprobante_path
    )
    VALUES (
      v_template.entidad_id,
      v_sede_id,
      v_ambiente_id,
      v_template.codigo_catalogo,
      v_template.nombre,
      v_template.nombre_etiqueta,
      v_template.descripcion,
      v_template.caracteristicas,
      v_template.estado_bien,
      v_template.categoria,
      v_template.marca,
      v_template.modelo,
      v_template.color,
      v_template.medidas,
      v_template.medida_largo,
      v_template.medida_ancho,
      v_template.medida_altura,
      v_template.depreciacion,
      v_template.observacion,
      v_template.responsable,
      v_template.valor_adquisicion,
      v_template.valor_es_mercado,
      v_template.fecha_adquisicion,
      v_template.vida_util_meses,
      v_template.comprobante_serie,
      v_template.comprobante_path
    )
    RETURNING codigo_barras, estado_registro INTO v_codigo, v_estado;

    IF v_i = 1 THEN
      v_first := v_codigo;
    END IF;
    v_last := v_codigo;
  END LOOP;

  RETURN jsonb_build_object(
    'creados', p_cantidad,
    'estado_registro', v_estado::TEXT,
    'primer_codigo_barras', v_first,
    'ultimo_codigo_barras', v_last,
    'sede_id', v_sede_id,
    'ambiente_id', v_ambiente_id
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
