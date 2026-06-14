-- Origen del ítem en catálogo: oficial SBN (NACIONAL) o extensión de la entidad (PROPIO)

ALTER TABLE public.catalogo_nacional
  ADD COLUMN IF NOT EXISTS origen TEXT NOT NULL DEFAULT 'NACIONAL';

COMMENT ON COLUMN public.catalogo_nacional.origen IS
  'NACIONAL = catálogo oficial SBN; PROPIO = extensión registrada por la entidad';

ALTER TABLE public.catalogo_nacional
  DROP CONSTRAINT IF EXISTS catalogo_nacional_origen_check;

ALTER TABLE public.catalogo_nacional
  ADD CONSTRAINT catalogo_nacional_origen_check
  CHECK (origen IN ('NACIONAL', 'PROPIO'));

CREATE INDEX IF NOT EXISTS idx_catalogo_origen
  ON public.catalogo_nacional (origen);

-- El contador solo puede insertar extensiones propias (no marcar ítems como nacionales)
DROP POLICY IF EXISTS catalogo_insert_contador ON public.catalogo_nacional;
CREATE POLICY catalogo_insert_contador ON public.catalogo_nacional
  FOR INSERT TO authenticated
  WITH CHECK (public.is_contador() AND origen = 'PROPIO');
