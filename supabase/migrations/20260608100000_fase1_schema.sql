-- Fase 1 — Modelo de datos, triggers, RLS y storage
-- Inventario Activos B&D — MVP v1.0

-- ---------------------------------------------------------------------------
-- Extensiones
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tipos enum
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.rol_usuario AS ENUM ('CONTADOR', 'ADMIN_ENTIDAD');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.estado_registro AS ENUM ('PREREGISTRADO', 'REGISTRADO', 'DADO_DE_BAJA');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.estado_bien AS ENUM ('BUENO', 'REGULAR', 'MALO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.categoria_bien AS ENUM ('ACTIVO', 'CUENTA_ORDEN');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.entidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  ruc TEXT,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.sedes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id UUID NOT NULL REFERENCES public.entidades(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ambientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sede_id UUID NOT NULL REFERENCES public.sedes(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nombre TEXT NOT NULL,
  rol public.rol_usuario NOT NULL,
  entidad_id UUID REFERENCES public.entidades(id) ON DELETE SET NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT profiles_admin_entidad_check CHECK (
    (rol = 'CONTADOR' AND entidad_id IS NULL)
    OR (rol = 'ADMIN_ENTIDAD' AND entidad_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS public.activos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entidad_id UUID NOT NULL REFERENCES public.entidades(id) ON DELETE RESTRICT,
  sede_id UUID REFERENCES public.sedes(id) ON DELETE SET NULL,
  ambiente_id UUID REFERENCES public.ambientes(id) ON DELETE SET NULL,
  codigo_catalogo TEXT NOT NULL,
  correlativo INTEGER,
  codigo_barras TEXT,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  estado_registro public.estado_registro NOT NULL DEFAULT 'PREREGISTRADO',
  estado_bien public.estado_bien NOT NULL DEFAULT 'BUENO',
  categoria public.categoria_bien NOT NULL DEFAULT 'ACTIVO',
  valor_adquisicion NUMERIC(14, 2),
  fecha_adquisicion DATE,
  vida_util_meses INTEGER,
  foto_path TEXT,
  comprobante_path TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT activos_correlativo_unique UNIQUE (entidad_id, correlativo),
  CONSTRAINT activos_codigo_barras_unique UNIQUE (codigo_barras),
  CONSTRAINT activos_registrado_correlativo_check CHECK (
    (estado_registro = 'REGISTRADO' AND correlativo IS NOT NULL AND codigo_barras IS NOT NULL)
    OR (estado_registro != 'REGISTRADO')
  )
);

CREATE TABLE IF NOT EXISTS public.historial_cambios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  activo_id UUID NOT NULL REFERENCES public.activos(id) ON DELETE CASCADE,
  entidad_id UUID NOT NULL REFERENCES public.entidades(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES public.profiles(id),
  accion TEXT NOT NULL,
  campo TEXT,
  valor_anterior TEXT,
  valor_nuevo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Índices
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sedes_entidad ON public.sedes(entidad_id);
CREATE INDEX IF NOT EXISTS idx_ambientes_sede ON public.ambientes(sede_id);
CREATE INDEX IF NOT EXISTS idx_activos_entidad ON public.activos(entidad_id);
CREATE INDEX IF NOT EXISTS idx_activos_estado ON public.activos(estado_registro);
CREATE INDEX IF NOT EXISTS idx_activos_ambiente ON public.activos(ambiente_id);
CREATE INDEX IF NOT EXISTS idx_historial_activo ON public.historial_cambios(activo_id);
CREATE INDEX IF NOT EXISTS idx_profiles_entidad ON public.profiles(entidad_id);

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS entidades_updated_at ON public.entidades;
CREATE TRIGGER entidades_updated_at
  BEFORE UPDATE ON public.entidades
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS sedes_updated_at ON public.sedes;
CREATE TRIGGER sedes_updated_at
  BEFORE UPDATE ON public.sedes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS ambientes_updated_at ON public.ambientes;
CREATE TRIGGER ambientes_updated_at
  BEFORE UPDATE ON public.ambientes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS activos_updated_at ON public.activos;
CREATE TRIGGER activos_updated_at
  BEFORE UPDATE ON public.activos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helpers de autorización
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_contador()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND rol = 'CONTADOR' AND activo = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.my_entidad_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT entidad_id FROM public.profiles
  WHERE id = auth.uid() AND activo = TRUE;
$$;

CREATE OR REPLACE FUNCTION public.can_access_entidad(p_entidad_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_contador()
    OR public.my_entidad_id() = p_entidad_id;
$$;

CREATE OR REPLACE FUNCTION public.next_correlativo(p_entidad_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(MAX(correlativo), 0) + 1
  FROM public.activos
  WHERE entidad_id = p_entidad_id;
$$;

CREATE OR REPLACE FUNCTION public.build_codigo_barras(p_catalogo TEXT, p_correlativo INTEGER)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_catalogo || '-' || LPAD(p_correlativo::TEXT, 6, '0');
$$;

CREATE OR REPLACE FUNCTION public.assign_correlativo_if_registrado()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.estado_registro = 'REGISTRADO' AND NEW.correlativo IS NULL THEN
    NEW.correlativo := public.next_correlativo(NEW.entidad_id);
    NEW.codigo_barras := public.build_codigo_barras(NEW.codigo_catalogo, NEW.correlativo);
  END IF;
  RETURN NEW;
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
    IF NEW.estado_registro IS NULL OR NEW.estado_registro = 'PREREGISTRADO' THEN
      NEW.estado_registro := 'REGISTRADO';
    END IF;
  ELSE
    NEW.entidad_id := public.my_entidad_id();
    NEW.estado_registro := 'PREREGISTRADO';
    NEW.correlativo := NULL;
    NEW.codigo_barras := NULL;
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
  END IF;

  IF NEW.estado_registro = 'REGISTRADO'
     AND OLD.estado_registro = 'PREREGISTRADO'
     AND NEW.correlativo IS NULL THEN
    NEW.correlativo := public.next_correlativo(NEW.entidad_id);
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
    'codigo_catalogo', 'correlativo', 'sede_id', 'ambiente_id',
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

DROP TRIGGER IF EXISTS activos_before_insert ON public.activos;
CREATE TRIGGER activos_before_insert
  BEFORE INSERT ON public.activos
  FOR EACH ROW EXECUTE FUNCTION public.enforce_activo_on_insert();

DROP TRIGGER IF EXISTS activos_before_insert_correlativo ON public.activos;
CREATE TRIGGER activos_before_insert_correlativo
  BEFORE INSERT ON public.activos
  FOR EACH ROW EXECUTE FUNCTION public.assign_correlativo_if_registrado();

DROP TRIGGER IF EXISTS activos_before_update ON public.activos;
CREATE TRIGGER activos_before_update
  BEFORE UPDATE ON public.activos
  FOR EACH ROW EXECUTE FUNCTION public.enforce_activo_on_update();

DROP TRIGGER IF EXISTS activos_before_update_correlativo ON public.activos;
CREATE TRIGGER activos_before_update_correlativo
  BEFORE UPDATE ON public.activos
  FOR EACH ROW EXECUTE FUNCTION public.assign_correlativo_if_registrado();

DROP TRIGGER IF EXISTS activos_historial ON public.activos;
CREATE TRIGGER activos_historial
  AFTER INSERT OR UPDATE ON public.activos
  FOR EACH ROW EXECUTE FUNCTION public.log_historial_activo();

-- ---------------------------------------------------------------------------
-- Vista depreciación simplificada
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.activos_valorizados AS
SELECT
  a.*,
  CASE
    WHEN a.vida_util_meses IS NULL OR a.vida_util_meses <= 0 OR a.valor_adquisicion IS NULL THEN NULL
    WHEN a.fecha_adquisicion IS NULL THEN a.valor_adquisicion
    ELSE GREATEST(
      a.valor_adquisicion - (
        a.valor_adquisicion / a.vida_util_meses
      ) * GREATEST(
        0,
        (DATE_PART('year', AGE(CURRENT_DATE, a.fecha_adquisicion)) * 12
          + DATE_PART('month', AGE(CURRENT_DATE, a.fecha_adquisicion)))::INTEGER
      ),
      0
    )
  END AS valor_neto_estimado
FROM public.activos a;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.entidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sedes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ambientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historial_cambios ENABLE ROW LEVEL SECURITY;

-- profiles: usuario ve su perfil; contador ve todos
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_contador());

DROP POLICY IF EXISTS profiles_update_contador ON public.profiles;
CREATE POLICY profiles_update_contador ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_contador()) WITH CHECK (public.is_contador());

-- entidades
DROP POLICY IF EXISTS entidades_select ON public.entidades;
CREATE POLICY entidades_select ON public.entidades FOR SELECT TO authenticated
  USING (public.can_access_entidad(id));

DROP POLICY IF EXISTS entidades_insert ON public.entidades;
CREATE POLICY entidades_insert ON public.entidades FOR INSERT TO authenticated
  WITH CHECK (public.is_contador());

DROP POLICY IF EXISTS entidades_update ON public.entidades;
CREATE POLICY entidades_update ON public.entidades FOR UPDATE TO authenticated
  USING (public.is_contador()) WITH CHECK (public.is_contador());

DROP POLICY IF EXISTS entidades_delete ON public.entidades;
CREATE POLICY entidades_delete ON public.entidades FOR DELETE TO authenticated
  USING (public.is_contador());

-- sedes
DROP POLICY IF EXISTS sedes_select ON public.sedes;
CREATE POLICY sedes_select ON public.sedes FOR SELECT TO authenticated
  USING (public.can_access_entidad(entidad_id));

DROP POLICY IF EXISTS sedes_write ON public.sedes;
CREATE POLICY sedes_write ON public.sedes FOR ALL TO authenticated
  USING (public.is_contador()) WITH CHECK (public.is_contador());

-- ambientes (via sede → entidad)
DROP POLICY IF EXISTS ambientes_select ON public.ambientes;
CREATE POLICY ambientes_select ON public.ambientes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sedes s
      WHERE s.id = sede_id AND public.can_access_entidad(s.entidad_id)
    )
  );

DROP POLICY IF EXISTS ambientes_write ON public.ambientes;
CREATE POLICY ambientes_write ON public.ambientes FOR ALL TO authenticated
  USING (public.is_contador())
  WITH CHECK (public.is_contador());

-- activos
DROP POLICY IF EXISTS activos_select ON public.activos;
CREATE POLICY activos_select ON public.activos FOR SELECT TO authenticated
  USING (public.can_access_entidad(entidad_id));

DROP POLICY IF EXISTS activos_insert ON public.activos;
CREATE POLICY activos_insert ON public.activos FOR INSERT TO authenticated
  WITH CHECK (public.can_access_entidad(entidad_id));

DROP POLICY IF EXISTS activos_update ON public.activos;
CREATE POLICY activos_update ON public.activos FOR UPDATE TO authenticated
  USING (public.can_access_entidad(entidad_id))
  WITH CHECK (public.can_access_entidad(entidad_id));

DROP POLICY IF EXISTS activos_delete ON public.activos;
CREATE POLICY activos_delete ON public.activos FOR DELETE TO authenticated
  USING (public.is_contador());

-- historial
DROP POLICY IF EXISTS historial_select ON public.historial_cambios;
CREATE POLICY historial_select ON public.historial_cambios FOR SELECT TO authenticated
  USING (public.can_access_entidad(entidad_id));

-- ---------------------------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('fotos-activos', 'fotos-activos', FALSE, 524288, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('comprobantes-activos', 'comprobantes-activos', FALSE, 5242880, ARRAY['application/pdf', 'image/jpeg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.storage_entidad_from_path(object_name TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(split_part(object_name, '/', 1), '')::UUID;
$$;

DROP POLICY IF EXISTS fotos_select ON storage.objects;
CREATE POLICY fotos_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'fotos-activos'
    AND public.can_access_entidad(public.storage_entidad_from_path(name))
  );

DROP POLICY IF EXISTS fotos_insert ON storage.objects;
CREATE POLICY fotos_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'fotos-activos'
    AND public.can_access_entidad(public.storage_entidad_from_path(name))
  );

DROP POLICY IF EXISTS fotos_update ON storage.objects;
CREATE POLICY fotos_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'fotos-activos'
    AND public.can_access_entidad(public.storage_entidad_from_path(name))
  );

DROP POLICY IF EXISTS fotos_delete ON storage.objects;
CREATE POLICY fotos_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'fotos-activos'
    AND public.can_access_entidad(public.storage_entidad_from_path(name))
  );

DROP POLICY IF EXISTS comprobantes_select ON storage.objects;
CREATE POLICY comprobantes_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'comprobantes-activos'
    AND public.can_access_entidad(public.storage_entidad_from_path(name))
  );

DROP POLICY IF EXISTS comprobantes_insert ON storage.objects;
CREATE POLICY comprobantes_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'comprobantes-activos'
    AND public.can_access_entidad(public.storage_entidad_from_path(name))
  );

DROP POLICY IF EXISTS comprobantes_update ON storage.objects;
CREATE POLICY comprobantes_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'comprobantes-activos'
    AND public.can_access_entidad(public.storage_entidad_from_path(name))
  );

DROP POLICY IF EXISTS comprobantes_delete ON storage.objects;
CREATE POLICY comprobantes_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'comprobantes-activos'
    AND public.can_access_entidad(public.storage_entidad_from_path(name))
  );

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.activos_valorizados TO authenticated;
