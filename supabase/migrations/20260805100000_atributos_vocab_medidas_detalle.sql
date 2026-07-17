-- Autocompletado de medidas y detalle (caracteristicas).
-- En producción el CHECK aún no incluía medidas; detalle nunca estuvo en el vocabulario.

ALTER TABLE public.activo_atributos_vocab
  DROP CONSTRAINT IF EXISTS activo_atributos_vocab_campo_check;

ALTER TABLE public.activo_atributos_vocab
  ADD CONSTRAINT activo_atributos_vocab_campo_check
  CHECK (campo IN ('marca', 'modelo', 'serie', 'color', 'medidas', 'detalle'));

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
  IF p_campo NOT IN ('marca', 'modelo', 'serie', 'color', 'medidas', 'detalle') THEN
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
  PERFORM public.upsert_activo_atributo_vocab('medidas', NEW.medidas);
  PERFORM public.upsert_activo_atributo_vocab('detalle', NEW.caracteristicas);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS activos_atributos_vocab_sync ON public.activos;
CREATE TRIGGER activos_atributos_vocab_sync
  AFTER INSERT OR UPDATE OF marca, modelo, serie, color, medidas, caracteristicas
  ON public.activos
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_activo_atributos_vocab_from_row();

INSERT INTO public.activo_atributos_vocab (campo, valor, valor_normalizado, uso_count)
SELECT 'medidas', trim(medidas), lower(trim(medidas)), COUNT(*)::INTEGER
FROM public.activos
WHERE medidas IS NOT NULL AND trim(medidas) <> ''
GROUP BY trim(medidas)
ON CONFLICT (campo, valor_normalizado) DO UPDATE SET
  uso_count = GREATEST(public.activo_atributos_vocab.uso_count, EXCLUDED.uso_count);

INSERT INTO public.activo_atributos_vocab (campo, valor, valor_normalizado, uso_count)
SELECT 'detalle', trim(caracteristicas), lower(trim(caracteristicas)), COUNT(*)::INTEGER
FROM public.activos
WHERE caracteristicas IS NOT NULL AND trim(caracteristicas) <> ''
GROUP BY trim(caracteristicas)
ON CONFLICT (campo, valor_normalizado) DO UPDATE SET
  uso_count = GREATEST(public.activo_atributos_vocab.uso_count, EXCLUDED.uso_count);
