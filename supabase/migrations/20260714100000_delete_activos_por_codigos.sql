-- Eliminación física de activos registrados por lista de códigos de barras (contador).

CREATE TABLE IF NOT EXISTS public.eliminaciones_activos_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id UUID NOT NULL REFERENCES public.entidades(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.profiles(id),
  codigo_barras TEXT NOT NULL,
  activo_nombre TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_eliminaciones_activos_entidad
  ON public.eliminaciones_activos_log(entidad_id, created_at DESC);

ALTER TABLE public.eliminaciones_activos_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS eliminaciones_activos_select ON public.eliminaciones_activos_log;
CREATE POLICY eliminaciones_activos_select ON public.eliminaciones_activos_log
  FOR SELECT TO authenticated
  USING (public.can_access_entidad(entidad_id));

COMMENT ON TABLE public.eliminaciones_activos_log IS
  'Registro de códigos eliminados físicamente (altas erróneas).';

CREATE OR REPLACE FUNCTION public.preview_delete_activos_por_codigos(
  p_entidad_id UUID,
  p_codigos TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codigo TEXT;
  v_normalizados TEXT[] := '{}';
  v_encontrados JSONB := '[]'::JSONB;
  v_no_encontrados TEXT[] := '{}';
  v_no_elegibles JSONB := '[]'::JSONB;
  v_activo public.activos%ROWTYPE;
  v_sede_nombre TEXT;
  v_ambiente_nombre TEXT;
BEGIN
  IF NOT public.is_contador() THEN
    RAISE EXCEPTION 'Solo el contador puede eliminar activos por código';
  END IF;

  IF NOT public.can_access_entidad(p_entidad_id) THEN
    RAISE EXCEPTION 'Sin permiso para esta entidad';
  END IF;

  IF p_codigos IS NULL OR array_length(p_codigos, 1) IS NULL THEN
    RAISE EXCEPTION 'Indique al menos un código de barras';
  END IF;

  IF array_length(p_codigos, 1) > 500 THEN
    RAISE EXCEPTION 'Máximo 500 códigos por operación';
  END IF;

  FOREACH v_codigo IN ARRAY p_codigos
  LOOP
    v_codigo := trim(v_codigo);
    IF v_codigo = '' THEN
      CONTINUE;
    END IF;
    IF NOT (v_codigo = ANY (v_normalizados)) THEN
      v_normalizados := array_append(v_normalizados, v_codigo);
    END IF;
  END LOOP;

  IF array_length(v_normalizados, 1) IS NULL THEN
    RAISE EXCEPTION 'Indique al menos un código de barras válido';
  END IF;

  FOREACH v_codigo IN ARRAY v_normalizados
  LOOP
    SELECT * INTO v_activo
    FROM public.activos a
    WHERE a.entidad_id = p_entidad_id
      AND a.codigo_barras = v_codigo
    LIMIT 1;

    IF NOT FOUND THEN
      v_no_encontrados := array_append(v_no_encontrados, v_codigo);
      CONTINUE;
    END IF;

    IF v_activo.estado_registro <> 'REGISTRADO' THEN
      v_no_elegibles := v_no_elegibles || jsonb_build_object(
        'codigo_barras', v_codigo,
        'estado_registro', v_activo.estado_registro::TEXT,
        'nombre', v_activo.nombre
      );
      CONTINUE;
    END IF;

    SELECT s.nombre, amb.nombre
    INTO v_sede_nombre, v_ambiente_nombre
    FROM public.activos a
    LEFT JOIN public.sedes s ON s.id = a.sede_id
    LEFT JOIN public.ambientes amb ON amb.id = a.ambiente_id
    WHERE a.id = v_activo.id;

    v_encontrados := v_encontrados || jsonb_build_object(
      'id', v_activo.id,
      'codigo_barras', v_activo.codigo_barras,
      'nombre', v_activo.nombre,
      'sede_nombre', v_sede_nombre,
      'ambiente_nombre', v_ambiente_nombre,
      'foto_path', v_activo.foto_path,
      'comprobante_path', v_activo.comprobante_path
    );
  END LOOP;

  RETURN jsonb_build_object(
    'solicitados', array_length(v_normalizados, 1),
    'encontrados', v_encontrados,
    'no_encontrados', to_jsonb(v_no_encontrados),
    'no_elegibles', v_no_elegibles
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.preview_delete_activos_por_codigos(UUID, TEXT[]) TO authenticated;

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

GRANT EXECUTE ON FUNCTION public.delete_activos_por_codigos(UUID, TEXT[]) TO authenticated;

NOTIFY pgrst, 'reload schema';
