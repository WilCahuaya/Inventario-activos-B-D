-- Ampliar formatos de imagen y tamaño máximo del bucket de fotos de activos.
UPDATE storage.buckets
SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/heic',
    'image/heif',
    'image/avif',
    'image/tiff'
  ]
WHERE id = 'fotos-activos';

-- Comprobantes: permitir también los mismos tipos de imagen de factura.
UPDATE storage.buckets
SET
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/bmp',
    'image/heic',
    'image/heif',
    'image/avif',
    'image/tiff'
  ]
WHERE id = 'comprobantes-activos';
