-- Habilita Supabase Realtime en la tabla activos (sync web ↔ desktop).

ALTER TABLE public.activos REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'activos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activos;
  END IF;
END $$;
