-- Corrige ambigüedad v_item en delete_activos_por_codigos (variable PL/pgSQL vs alias SQL).

CREATE OR REPLACE FUNCTION public.delete_activos_por_codigos(
  p_entidad_id UUID,
  p_codigos TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_preview JSONB;
  v_encontrados JSONB;
  v_no_encontrados JSONB;
  v_no_elegibles JSONB;
  v_row JSONB;
  v_ids UUID[] := '{}';
  v_fotos TEXT[] := '{}';
  v_comprobantes TEXT[] := '{}';
  v_eliminados INTEGER;
  v_path TEXT;
BEGIN
  v_preview := public.preview_delete_activos_por_codigos(p_entidad_id, p_codigos);

  v_encontrados := coalesce(v_preview->'encontrados', '[]'::JSONB);
  v_no_encontrados := coalesce(v_preview->'no_encontrados', '[]'::JSONB);
  v_no_elegibles := coalesce(v_preview->'no_elegibles', '[]'::JSONB);

  IF jsonb_array_length(v_no_encontrados) > 0 THEN
    RAISE EXCEPTION 'Códigos no encontrados: %', (
      SELECT string_agg(value, ', ')
      FROM jsonb_array_elements_text(v_no_encontrados)
    );
  END IF;

  IF jsonb_array_length(v_no_elegibles) > 0 THEN
    RAISE EXCEPTION 'Solo se pueden eliminar activos registrados. Revise: %', (
      SELECT string_agg(
        (e->>'codigo_barras') || ' (' || (e->>'estado_registro') || ')',
        ', '
      )
      FROM jsonb_array_elements(v_no_elegibles) AS e
    );
  END IF;

  IF jsonb_array_length(v_encontrados) = 0 THEN
    RAISE EXCEPTION 'No hay activos elegibles para eliminar';
  END IF;

  FOR v_row IN SELECT value FROM jsonb_array_elements(v_encontrados)
  LOOP
    v_ids := array_append(v_ids, (v_row->>'id')::UUID);

    v_path := nullif(trim(v_row->>'foto_path'), '');
    IF v_path IS NOT NULL AND NOT (v_path = ANY (v_fotos)) THEN
      v_fotos := array_append(v_fotos, v_path);
    END IF;

    v_path := nullif(trim(v_row->>'comprobante_path'), '');
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
      v_row->>'codigo_barras',
      v_row->>'nombre'
    );
  END LOOP;

  DELETE FROM public.activos
  WHERE id = ANY (v_ids)
    AND entidad_id = p_entidad_id
    AND estado_registro = 'REGISTRADO';

  GET DIAGNOSTICS v_eliminados = ROW_COUNT;

  IF v_eliminados <> coalesce(array_length(v_ids, 1), 0) THEN
    RAISE EXCEPTION 'No se pudieron eliminar todos los activos indicados';
  END IF;

  RETURN jsonb_build_object(
    'eliminados', v_eliminados,
    'codigos', (
      SELECT coalesce(jsonb_agg(elem->>'codigo_barras'), '[]'::JSONB)
      FROM jsonb_array_elements(v_encontrados) AS elem
    ),
    'foto_paths', to_jsonb(v_fotos),
    'comprobante_paths', to_jsonb(v_comprobantes)
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
