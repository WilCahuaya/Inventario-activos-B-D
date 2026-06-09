-- Vocabulario global para autocompletado: marca, modelo, serie, color

CREATE TABLE IF NOT EXISTS public.activo_atributos_vocab (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campo TEXT NOT NULL CHECK (campo IN ('marca', 'modelo', 'serie', 'color')),
  valor TEXT NOT NULL,
  valor_normalizado TEXT NOT NULL,
  uso_count INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT activo_atributos_vocab_campo_valor_unique UNIQUE (campo, valor_normalizado)
);

CREATE INDEX IF NOT EXISTS idx_activo_atributos_vocab_suggest
  ON public.activo_atributos_vocab (campo, valor_normalizado);

ALTER TABLE public.activo_atributos_vocab ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS activo_atributos_vocab_select ON public.activo_atributos_vocab;
CREATE POLICY activo_atributos_vocab_select ON public.activo_atributos_vocab
  FOR SELECT TO authenticated
  USING (true);

CREATE OR REPLACE FUNCTION public.upsert_activo_atributo_vocab(p_campo TEXT, p_valor TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trimmed TEXT;
  v_norm TEXT;
BEGIN
  v_trimmed := trim(p_valor);
  IF v_trimmed IS NULL OR v_trimmed = '' THEN
    RETURN;
  END IF;
  IF p_campo NOT IN ('marca', 'modelo', 'serie', 'color') THEN
    RETURN;
  END IF;

  v_norm := lower(v_trimmed);

  INSERT INTO public.activo_atributos_vocab (campo, valor, valor_normalizado, uso_count, updated_at)
  VALUES (p_campo, v_trimmed, v_norm, 1, now())
  ON CONFLICT (campo, valor_normalizado) DO UPDATE SET
    uso_count = public.activo_atributos_vocab.uso_count + 1,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_activo_atributos_vocab_from_row()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.upsert_activo_atributo_vocab('marca', NEW.marca);
  PERFORM public.upsert_activo_atributo_vocab('modelo', NEW.modelo);
  PERFORM public.upsert_activo_atributo_vocab('serie', NEW.serie);
  PERFORM public.upsert_activo_atributo_vocab('color', NEW.color);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS activos_atributos_vocab_sync ON public.activos;
CREATE TRIGGER activos_atributos_vocab_sync
  AFTER INSERT OR UPDATE OF marca, modelo, serie, color ON public.activos
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_activo_atributos_vocab_from_row();

CREATE OR REPLACE FUNCTION public.suggest_activo_atributo(
  p_campo TEXT,
  p_query TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (valor TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.valor
  FROM public.activo_atributos_vocab v
  WHERE v.campo = p_campo
    AND (
      p_query IS NULL
      OR trim(p_query) = ''
      OR v.valor_normalizado LIKE '%' || lower(trim(p_query)) || '%'
    )
  ORDER BY
    CASE
      WHEN trim(p_query) <> '' AND v.valor_normalizado LIKE lower(trim(p_query)) || '%' THEN 0
      ELSE 1
    END,
    v.uso_count DESC,
    v.valor
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 10), 1), 10);
$$;

GRANT EXECUTE ON FUNCTION public.upsert_activo_atributo_vocab(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.suggest_activo_atributo(TEXT, TEXT, INTEGER) TO authenticated;

-- Poblar desde activos existentes
INSERT INTO public.activo_atributos_vocab (campo, valor, valor_normalizado, uso_count)
SELECT 'marca', trim(marca), lower(trim(marca)), COUNT(*)::INTEGER
FROM public.activos
WHERE marca IS NOT NULL AND trim(marca) <> ''
GROUP BY trim(marca)
ON CONFLICT (campo, valor_normalizado) DO UPDATE SET
  uso_count = GREATEST(public.activo_atributos_vocab.uso_count, EXCLUDED.uso_count);

INSERT INTO public.activo_atributos_vocab (campo, valor, valor_normalizado, uso_count)
SELECT 'modelo', trim(modelo), lower(trim(modelo)), COUNT(*)::INTEGER
FROM public.activos
WHERE modelo IS NOT NULL AND trim(modelo) <> ''
GROUP BY trim(modelo)
ON CONFLICT (campo, valor_normalizado) DO UPDATE SET
  uso_count = GREATEST(public.activo_atributos_vocab.uso_count, EXCLUDED.uso_count);

INSERT INTO public.activo_atributos_vocab (campo, valor, valor_normalizado, uso_count)
SELECT 'serie', trim(serie), lower(trim(serie)), COUNT(*)::INTEGER
FROM public.activos
WHERE serie IS NOT NULL AND trim(serie) <> ''
GROUP BY trim(serie)
ON CONFLICT (campo, valor_normalizado) DO UPDATE SET
  uso_count = GREATEST(public.activo_atributos_vocab.uso_count, EXCLUDED.uso_count);

INSERT INTO public.activo_atributos_vocab (campo, valor, valor_normalizado, uso_count)
SELECT 'color', trim(color), lower(trim(color)), COUNT(*)::INTEGER
FROM public.activos
WHERE color IS NOT NULL AND trim(color) <> ''
GROUP BY trim(color)
ON CONFLICT (campo, valor_normalizado) DO UPDATE SET
  uso_count = GREATEST(public.activo_atributos_vocab.uso_count, EXCLUDED.uso_count);
