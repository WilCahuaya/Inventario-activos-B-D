-- Eliminación física de activos preregistrados (contador y admin de entidad).

CREATE OR REPLACE FUNCTION public.delete_activos_preregistrados(
  p_entidad_id UUID,
  p_activo_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_activo public.activos%ROWTYPE;
  v_ids UUID[] := '{}';
  v_fotos TEXT[] := '{}';
  v_comprobantes TEXT[] := '{}';
  v_eliminados INTEGER;
  v_path TEXT;
  v_distinct INTEGER;
BEGIN
  IF NOT public.can_access_entidad(p_entidad_id) THEN
    RAISE EXCEPTION 'Sin permiso para esta entidad';
  END IF;

  IF p_activo_ids IS NULL OR array_length(p_activo_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Indique al menos un activo';
  END IF;

  IF array_length(p_activo_ids, 1) > 500 THEN
    RAISE EXCEPTION 'Máximo 500 activos por operación';
  END IF;

  SELECT count(DISTINCT x)
  INTO v_distinct
  FROM unnest(p_activo_ids) AS x;

  IF v_distinct <> array_length(p_activo_ids, 1) THEN
    RAISE EXCEPTION 'Hay identificadores duplicados';
  END IF;

  FOR v_activo IN
    SELECT *
    FROM public.activos a
    WHERE a.id = ANY (p_activo_ids)
  LOOP
    IF v_activo.entidad_id <> p_entidad_id THEN
      RAISE EXCEPTION 'El activo % no pertenece a la entidad indicada', v_activo.nombre;
    END IF;

    IF v_activo.estado_registro <> 'PREREGISTRADO' THEN
      RAISE EXCEPTION 'Solo se pueden eliminar activos preregistrados (%: %)',
        v_activo.nombre, v_activo.estado_registro::TEXT;
    END IF;

    v_ids := array_append(v_ids, v_activo.id);

    v_path := nullif(trim(v_activo.foto_path), '');
    IF v_path IS NOT NULL AND NOT (v_path = ANY (v_fotos)) THEN
      v_fotos := array_append(v_fotos, v_path);
    END IF;

    v_path := nullif(trim(v_activo.comprobante_path), '');
    IF v_path IS NOT NULL AND NOT (v_path = ANY (v_comprobantes)) THEN
      v_comprobantes := array_append(v_comprobantes, v_path);
    END IF;

    INSERT INTO public.eliminaciones_activos_log (
      entidad_id,
      usuario_id,
      codigo_barras,
      activo_nombre
    ) VALUES (
      p_entidad_id,
      auth.uid(),
      '(preregistro)',
      v_activo.nombre
    );
  END LOOP;

  IF coalesce(array_length(v_ids, 1), 0) <> array_length(p_activo_ids, 1) THEN
    RAISE EXCEPTION 'Uno o más activos no fueron encontrados';
  END IF;

  DELETE FROM public.activos
  WHERE id = ANY (v_ids)
    AND entidad_id = p_entidad_id
    AND estado_registro = 'PREREGISTRADO';

  GET DIAGNOSTICS v_eliminados = ROW_COUNT;

  IF v_eliminados <> array_length(v_ids, 1) THEN
    RAISE EXCEPTION 'No se pudieron eliminar todos los activos indicados';
  END IF;

  RETURN jsonb_build_object(
    'eliminados', v_eliminados,
    'activo_ids', to_jsonb(v_ids),
    'foto_paths', to_jsonb(v_fotos),
    'comprobante_paths', to_jsonb(v_comprobantes)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_activos_preregistrados(UUID, UUID[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
