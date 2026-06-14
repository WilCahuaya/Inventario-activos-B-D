import type { CodigoBarrasPayload } from "./codigo-barras-types";

export const CODIGO_BARRAS_CATALOGO_DIGITS = 8;
export const CORRELATIVO_DIGITS = 4;
export const CODIGO_BARRAS_SIMBOLO_LENGTH = CODIGO_BARRAS_CATALOGO_DIGITS + CORRELATIVO_DIGITS;
/** Catálogo + guion + correlativo (ej. 74643712-0003). */
export const CODIGO_BARRAS_DISPLAY_LENGTH = CODIGO_BARRAS_CATALOGO_DIGITS + 1 + CORRELATIVO_DIGITS;

/** Legible en web y texto de etiqueta: 74643712-0003 */
export function formatCodigoBarras(payload: CodigoBarrasPayload): string {
  const correlativo = String(payload.correlativo).padStart(CORRELATIVO_DIGITS, "0");
  return `${payload.codigo_catalogo}-${correlativo}`;
}

/** Símbolo Code 128 (sin guion): 746437120003 */
export function formatCodigoBarrasSimboloFromPayload(payload: CodigoBarrasPayload): string {
  const correlativo = String(payload.correlativo).padStart(CORRELATIVO_DIGITS, "0");
  return `${payload.codigo_catalogo}${correlativo}`;
}

export function parseCodigoBarras(codigo: string): CodigoBarrasPayload | null {
  const trimmed = codigo.trim();

  const conGuion = trimmed.match(/^(\d{8})-(\d{4}|\d{6})$/);
  if (conGuion) {
    return {
      codigo_catalogo: conGuion[1],
      correlativo: parseInt(conGuion[2], 10),
    };
  }

  const simbolo12 = trimmed.match(/^(\d{8})(\d{4})$/);
  if (simbolo12) {
    return {
      codigo_catalogo: simbolo12[1],
      correlativo: parseInt(simbolo12[2], 10),
    };
  }

  const legado14 = trimmed.match(/^(\d{8})(\d{6})$/);
  if (legado14) {
    return {
      codigo_catalogo: legado14[1],
      correlativo: parseInt(legado14[2], 10),
    };
  }

  const legacyAlpha = trimmed.match(/^([A-Za-z0-9]+)-(\d{4}|\d{6})$/);
  if (legacyAlpha) {
    return {
      codigo_catalogo: legacyAlpha[1],
      correlativo: parseInt(legacyAlpha[2], 10),
    };
  }

  return null;
}

/** Convierte cualquier variante al string del símbolo (12 dígitos). */
export function formatCodigoBarrasSimbolo(codigo: string): string {
  const parsed = parseCodigoBarras(codigo);
  if (parsed) return formatCodigoBarrasSimboloFromPayload(parsed);

  const digits = codigo.trim().replace(/\D/g, "");
  return digits.length === CODIGO_BARRAS_SIMBOLO_LENGTH ? digits : codigo.trim().replace(/-/g, "");
}

/** Normaliza a formato con guion para mostrar en UI y etiqueta. */
export function normalizeCodigoBarrasDisplay(codigo: string): string {
  const parsed = parseCodigoBarras(codigo);
  if (parsed) return formatCodigoBarras(parsed);
  return codigo.trim();
}

/** Variantes para búsqueda al escanear (compacto o con guion). */
export function codigoBarrasLookupVariants(codigo: string): string[] {
  const trimmed = codigo.trim();
  const variants = new Set<string>();
  if (!trimmed) return [];

  variants.add(trimmed);
  const parsed = parseCodigoBarras(trimmed);
  if (parsed) {
    variants.add(formatCodigoBarras(parsed));
    variants.add(formatCodigoBarrasSimboloFromPayload(parsed));
  }

  return [...variants];
}
