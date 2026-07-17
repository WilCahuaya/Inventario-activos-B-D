-- Permite al contador registrar ítems faltantes del catálogo oficial SBN (origen NACIONAL).
-- Antes solo se permitía origen PROPIO, lo que bloqueaba "Agregar al catálogo" nacional.

DROP POLICY IF EXISTS catalogo_insert_contador ON public.catalogo_nacional;
CREATE POLICY catalogo_insert_contador ON public.catalogo_nacional
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_contador()
    AND origen IN ('PROPIO', 'NACIONAL')
  );
