-- Ambiente sistema de preregistros por entidad + posible_ambiente_id en activos.

ALTER TABLE public.ambientes
  ADD COLUMN IF NOT EXISTS es_preregistro BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.activos
  ADD COLUMN IF NOT EXISTS posible_ambiente_id UUID REFERENCES public.ambientes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_activos_posible_ambiente ON public.activos(posible_ambiente_id);

CREATE OR REPLACE FUNCTION public.ambiente_preregistro_nombre(p_anio INTEGER DEFAULT NULL)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 'Adquisiciones preregistrados ' || COALESCE(p_anio, EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER);
$$;

CREATE OR REPLACE FUNCTION public.is_ambiente_preregistro(p_ambiente_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT es_preregistro FROM public.ambientes WHERE id = p_ambiente_id),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.ensure_ambiente_preregistro(p_entidad_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sede_id UUID;
  v_ambiente_id UUID;
  v_nombre TEXT;
  v_anio INTEGER;
BEGIN
  v_anio := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  v_nombre := public.ambiente_preregistro_nombre(v_anio);

  SELECT a.id INTO v_ambiente_id
  FROM public.ambientes a
  INNER JOIN public.sedes s ON s.id = a.sede_id
  WHERE s.entidad_id = p_entidad_id
    AND a.es_preregistro = TRUE
    AND a.activo = TRUE
  LIMIT 1;

  IF v_ambiente_id IS NOT NULL THEN
    UPDATE public.ambientes
    SET nombre = v_nombre, updated_at = NOW()
    WHERE id = v_ambiente_id AND nombre IS DISTINCT FROM v_nombre;
    RETURN v_ambiente_id;
  END IF;

  SELECT id INTO v_sede_id
  FROM public.sedes
  WHERE entidad_id = p_entidad_id AND es_principal = TRUE AND activo = TRUE
  LIMIT 1;

  IF v_sede_id IS NULL THEN
    RAISE EXCEPTION 'La entidad no tiene sede Principal';
  END IF;

  INSERT INTO public.ambientes (sede_id, nombre, es_preregistro, activo)
  VALUES (v_sede_id, v_nombre, TRUE, TRUE)
  RETURNING id INTO v_ambiente_id;

  RETURN v_ambiente_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_ambiente_preregistro(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_ambiente_preregistro_for_entidad()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_ambiente_preregistro(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS entidades_create_ambiente_preregistro ON public.entidades;
CREATE TRIGGER entidades_create_ambiente_preregistro
  AFTER INSERT ON public.entidades
  FOR EACH ROW EXECUTE FUNCTION public.create_ambiente_preregistro_for_entidad();

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.entidades LOOP
    PERFORM public.ensure_ambiente_preregistro(r.id);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.enforce_ambiente_preregistro_unique()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entidad_id UUID;
BEGIN
  IF NOT NEW.es_preregistro THEN
    RETURN NEW;
  END IF;

  SELECT entidad_id INTO v_entidad_id
  FROM public.sedes
  WHERE id = NEW.sede_id;

  IF EXISTS (
    SELECT 1
    FROM public.ambientes a
    INNER JOIN public.sedes s ON s.id = a.sede_id
    WHERE s.entidad_id = v_entidad_id
      AND a.es_preregistro = TRUE
      AND a.activo = TRUE
      AND a.id IS DISTINCT FROM NEW.id
  ) THEN
    RAISE EXCEPTION 'Ya existe un ambiente de preregistro para esta entidad';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ambientes_enforce_preregistro_unique ON public.ambientes;
CREATE TRIGGER ambientes_enforce_preregistro_unique
  BEFORE INSERT OR UPDATE OF es_preregistro, sede_id ON public.ambientes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ambiente_preregistro_unique();

CREATE OR REPLACE FUNCTION public.enforce_ambiente_preregistro_protected()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.es_preregistro THEN
    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.activo = FALSE) THEN
      RAISE EXCEPTION 'El ambiente de preregistros no se puede eliminar';
    END IF;
    IF TG_OP = 'UPDATE' AND (
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

DROP TRIGGER IF EXISTS ambientes_protect_preregistro ON public.ambientes;
CREATE TRIGGER ambientes_protect_preregistro
  BEFORE UPDATE OR DELETE ON public.ambientes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_ambiente_preregistro_protected();

CREATE OR REPLACE FUNCTION public.apply_preregistro_ubicacion(p_activo public.activos)
RETURNS public.activos
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bucket UUID;
  v_sede_id UUID;
BEGIN
  v_bucket := public.ensure_ambiente_preregistro(p_activo.entidad_id);
  SELECT sede_id INTO v_sede_id FROM public.ambientes WHERE id = v_bucket;
  p_activo.ambiente_id := v_bucket;
  p_activo.sede_id := v_sede_id;
  p_activo.estado_registro := 'PREREGISTRADO';
  p_activo.correlativo := NULL;
  p_activo.codigo_barras := NULL;

  IF p_activo.posible_ambiente_id IS NOT NULL
     AND public.is_ambiente_preregistro(p_activo.posible_ambiente_id) THEN
    p_activo.posible_ambiente_id := NULL;
  END IF;

  RETURN p_activo;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_activo_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.created_by := auth.uid();
  NEW.updated_by := auth.uid();

  IF public.is_contador() THEN
    IF NEW.estado_registro = 'REGISTRADO' THEN
      IF NEW.ambiente_id IS NULL THEN
        RAISE EXCEPTION 'Seleccione sede y ambiente para registrar el activo';
      END IF;
      IF public.is_ambiente_preregistro(NEW.ambiente_id) THEN
        RAISE EXCEPTION 'Use preregistrar para el ambiente de preregistros';
      END IF;
      NEW.posible_ambiente_id := NULL;
    ELSE
      NEW := public.apply_preregistro_ubicacion(NEW);
    END IF;
  ELSE
    NEW.entidad_id := public.my_entidad_id();
    NEW := public.apply_preregistro_ubicacion(NEW);
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_activo_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bucket UUID;
BEGIN
  NEW.updated_by := auth.uid();

  IF NOT public.is_contador() THEN
    IF NEW.entidad_id IS DISTINCT FROM OLD.entidad_id THEN
      RAISE EXCEPTION 'No puede cambiar la entidad del activo';
    END IF;
    IF NEW.estado_registro IS DISTINCT FROM OLD.estado_registro
       AND NEW.estado_registro = 'REGISTRADO' THEN
      RAISE EXCEPTION 'Solo el contador puede registrar activos';
    END IF;

    IF OLD.estado_registro = 'PREREGISTRADO' AND NEW.estado_registro = 'PREREGISTRADO' THEN
      v_bucket := public.ensure_ambiente_preregistro(NEW.entidad_id);
      NEW.ambiente_id := v_bucket;
      SELECT sede_id INTO NEW.sede_id FROM public.ambientes WHERE id = v_bucket;
      IF NEW.posible_ambiente_id IS NOT NULL
         AND public.is_ambiente_preregistro(NEW.posible_ambiente_id) THEN
        NEW.posible_ambiente_id := NULL;
      END IF;
    END IF;
  END IF;

  IF NEW.estado_registro = 'REGISTRADO'
     AND OLD.estado_registro = 'PREREGISTRADO' THEN
    IF NEW.ambiente_id IS NULL OR public.is_ambiente_preregistro(NEW.ambiente_id) THEN
      RAISE EXCEPTION 'Seleccione un ambiente destino al registrar el preregistro';
    END IF;
    NEW.posible_ambiente_id := NULL;
  END IF;

  IF NEW.estado_registro = 'REGISTRADO'
     AND OLD.estado_registro = 'PREREGISTRADO'
     AND NEW.correlativo IS NULL THEN
    NEW.correlativo := public.next_correlativo(NEW.entidad_id, NEW.codigo_catalogo);
    NEW.codigo_barras := public.build_codigo_barras(NEW.codigo_catalogo, NEW.correlativo);
  END IF;

  IF NEW.estado_registro != 'REGISTRADO' THEN
    IF NEW.estado_registro = 'PREREGISTRADO' THEN
      NEW.correlativo := NULL;
      NEW.codigo_barras := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_historial_activo()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fields TEXT[] := ARRAY[
    'nombre', 'descripcion', 'estado_registro', 'estado_bien', 'categoria',
    'codigo_catalogo', 'correlativo', 'sede_id', 'ambiente_id', 'posible_ambiente_id',
    'valor_adquisicion', 'fecha_adquisicion', 'vida_util_meses',
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

-- Similares: copiar posible_ambiente_id; preregistros van al bucket vía trigger de insert.
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
  v_posible_ambiente_id UUID;
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
