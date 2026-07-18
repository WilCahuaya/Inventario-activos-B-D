/** MIME de imagen admitidos para foto de activo. */
export const ACTIVO_FOTO_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/heic",
  "image/heif",
  "image/avif",
  "image/tiff",
] as const;

/** Extensiones asociadas (por si el navegador no envía MIME). */
export const ACTIVO_FOTO_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
  ".heic",
  ".heif",
  ".avif",
  ".tif",
  ".tiff",
] as const;

/** Valor `accept` para inputs de foto del activo. */
export const ACTIVO_FOTO_ACCEPT = [
  ...ACTIVO_FOTO_MIME_TYPES,
  ...ACTIVO_FOTO_EXTENSIONS,
].join(",");

/** Comprobante: PDF o imagen de factura. */
export const ACTIVO_COMPROBANTE_ACCEPT = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/heic",
  "image/heif",
  "image/avif",
  ".pdf",
  ...ACTIVO_FOTO_EXTENSIONS,
].join(",");
