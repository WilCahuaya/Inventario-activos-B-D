-- Conteo y listado de ejemplares similares (misma plantilla que alta masiva).

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
    AND a.codigo_catalogo = t.codigo_catalogo
    AND trim(a.nombre) = trim(t.nombre)
    AND a.ambiente_id IS NOT DISTINCT FROM t.ambiente_id
    AND coalesce(trim(a.marca), '') = coalesce(trim(t.marca), '')
    AND coalesce(trim(a.modelo), '') = coalesce(trim(t.modelo), '')
    AND coalesce(trim(a.color), '') = coalesce(trim(t.color), '')
    AND coalesce(trim(a.medidas), '') = coalesce(trim(t.medidas), '')
    AND a.estado_registro <> 'DADO_DE_BAJA';
$$;

CREATE OR REPLACE FUNCTION public.resumen_ejemplares_similares(p_activo_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template public.activos%ROWTYPE;
  v_total INTEGER;
  v_registrados INTEGER;
  v_preregistrados INTEGER;
BEGIN
  SELECT * INTO v_template
  FROM public.activos
  WHERE id = p_activo_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Activo no encontrado';
  END IF;

  IF NOT public.can_access_entidad(v_template.entidad_id) THEN
    RAISE EXCEPTION 'Sin permiso para esta entidad';
  END IF;

  SELECT
    count(*)::INTEGER,
    count(*) FILTER (WHERE a.estado_registro = 'REGISTRADO')::INTEGER,
    count(*) FILTER (WHERE a.estado_registro = 'PREREGISTRADO')::INTEGER
  INTO v_total, v_registrados, v_preregistrados
  FROM public.activos a
  WHERE public.activo_es_ejemplar_similar(a, v_template);

  RETURN jsonb_build_object(
    'total', v_total,
    'registrados', v_registrados,
    'preregistrados', v_preregistrados
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.resumen_ejemplares_similares(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_activos_similares_ids(
  p_activo_id UUID,
  p_solo_registrados BOOLEAN DEFAULT FALSE
)
RETURNS UUID[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template public.activos%ROWTYPE;
  v_ids UUID[];
BEGIN
  SELECT * INTO v_template
  FROM public.activos
  WHERE id = p_activo_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Activo no encontrado';
  END IF;

  IF NOT public.can_access_entidad(v_template.entidad_id) THEN
    RAISE EXCEPTION 'Sin permiso para esta entidad';
  END IF;

  SELECT coalesce(array_agg(a.id ORDER BY a.correlativo NULLS LAST, a.created_at), '{}')
  INTO v_ids
  FROM public.activos a
  WHERE public.activo_es_ejemplar_similar(a, v_template)
    AND (
      NOT p_solo_registrados
      OR (a.estado_registro = 'REGISTRADO' AND a.codigo_barras IS NOT NULL)
    );

  RETURN v_ids;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_activos_similares_ids(UUID, BOOLEAN) TO authenticated;
