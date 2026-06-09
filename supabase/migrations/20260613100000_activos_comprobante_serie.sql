-- Serie del comprobante de adquisición (puede existir sin PDF adjunto)
ALTER TABLE activos
  ADD COLUMN IF NOT EXISTS comprobante_serie TEXT;

COMMENT ON COLUMN activos.comprobante_serie IS 'Serie o número del comprobante (ej. F/E001-129). Puede registrarse sin archivo PDF.';
