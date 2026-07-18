-- Restaura estado_registro (y posible_ambiente_id) al crear similares.
-- Sin estado_registro el DEFAULT era PREREGISTRADO y el trigger
-- enforce_activo_on_insert enviaba las copias al bucket de preregistro
-- aunque la plantilla estuviera REGISTRADO.
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
  v_posible_ambiente_id UUID;
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

  v_posible_ambiente_id := v_template.posible_ambiente_id;

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

    IF v_template.estado_registro = 'PREREGISTRADO'
       AND NOT v_ambiente.es_preregistro THEN
      v_posible_ambiente_id := p_ambiente_id;
    END IF;
  ELSE
    v_sede_id := v_template.sede_id;
    v_ambiente_id := v_template.ambiente_id;
  END IF;

  FOR v_i IN 1..p_cantidad LOOP
    INSERT INTO public.activos (
      entidad_id,
      sede_id,
      ambiente_id,
      posible_ambiente_id,
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
      comprobante_path,
      foto_path,
      estado_registro
    )
    VALUES (
      v_template.entidad_id,
      v_sede_id,
      v_ambiente_id,
      v_posible_ambiente_id,
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
      v_template.comprobante_path,
      v_template.foto_path,
      v_template.estado_registro
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
