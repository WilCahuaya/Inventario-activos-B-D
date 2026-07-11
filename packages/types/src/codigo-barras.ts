import type { CodigoBarrasPayload } from "./codigo-barras-types";

export const CODIGO_BARRAS_CATALOGO_DIGITS = 8;
export const CORRELATIVO_DIGITS = 4;
export const CODIGO_BARRAS_SIMBOLO_LENGTH = CODIGO_BARRAS_CATALOGO_DIGITS + CORRELATIVO_DIGITS;
/** Catálogo + guion + correlativo (ej. 74643712-0003). */
export const CODIGO_BARRAS_DISPLAY_LENGTH = CODIGO_BARRAS_CATALOGO_DIGITS + 1 + CORRELATIVO_DIGITS;

/**
 * Prefijo numérico del catálogo propio en el símbolo Code 128.
 * B→2, D→4 (orden alfabético). Reserva SBN grupo 24 / clase 00 (`2400xxxx`).
 */
export const CATALOGO_PROPIO_SIMBOLO_PREFIX = "24";

const CATALOGO_PROPIO_CODIGO_RE = /^BD(\d{6})$/i;
const CATALOGO_PROPIO_SIMBOLO_RE = /^24(\d{6})$/;

/** BD000001 → 24000001 (solo símbolo de barras; el texto legible sigue en BD…). */
export function encodeCatalogoPropioParaSimbolo(codigoCatalogo: string): string {
  const match = codigoCatalogo.trim().match(CATALOGO_PROPIO_CODIGO_RE);
  if (!match) return codigoCatalogo.trim();
  return `${CATALOGO_PROPIO_SIMBOLO_PREFIX}${match[1]}`;
}

/** 24000001 → BD000001; null si no es símbolo de catálogo propio. */
export function decodeCatalogoPropioDesdeSimbolo(codigoCatalogo: string): string | null {
  const match = codigoCatalogo.trim().match(CATALOGO_PROPIO_SIMBOLO_RE);
  if (!match) return null;
  return `BD${match[1]}`;
}

function padCorrelativo(correlativo: number): string {
  return String(correlativo).padStart(CORRELATIVO_DIGITS, "0");
}

/** Legible en web y texto de etiqueta: 74643712-0003 o BD000003-0001 */
export function formatCodigoBarras(payload: CodigoBarrasPayload): string {
  return `${payload.codigo_catalogo}-${padCorrelativo(payload.correlativo)}`;
}

/**
 * Símbolo Code 128 (sin guion).
 * Nacional: 746437120003 · Propio BD…: 240000030001 (numérico para subset C).
 */
export function formatCodigoBarrasSimboloFromPayload(payload: CodigoBarrasPayload): string {
  const catalogo = encodeCatalogoPropioParaSimbolo(payload.codigo_catalogo);
  return `${catalogo}${padCorrelativo(payload.correlativo)}`;
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

  const propioGuion = trimmed.match(/^BD(\d{6})-(\d{4}|\d{6})$/i);
  if (propioGuion) {
    return {
      codigo_catalogo: `BD${propioGuion[1]}`,
      correlativo: parseInt(propioGuion[2], 10),
    };
  }

  const propioCompacto = trimmed.match(/^BD(\d{6})(\d{4}|\d{6})$/i);
  if (propioCompacto) {
    return {
      codigo_catalogo: `BD${propioCompacto[1]}`,
      correlativo: parseInt(propioCompacto[2], 10),
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

/** Convierte cualquier variante al string del símbolo (12 dígitos numéricos si es posible). */
export function formatCodigoBarrasSimbolo(codigo: string): string {
  const parsed = parseCodigoBarras(codigo);
  if (parsed) return formatCodigoBarrasSimboloFromPayload(parsed);

  const digits = codigo.trim().replace(/\D/g, "");
  return digits.length === CODIGO_BARRAS_SIMBOLO_LENGTH ? digits : codigo.trim().replace(/-/g, "");
}

/** Normaliza a formato con guion para mostrar en UI y etiqueta. */
export function normalizeCodigoBarrasDisplay(codigo: string): string {
  const parsed = parseCodigoBarras(codigo);
  if (!parsed) return codigo.trim();

  const decoded = decodeCatalogoPropioDesdeSimbolo(parsed.codigo_catalogo);
  if (decoded) {
    return formatCodigoBarras({
      codigo_catalogo: decoded,
      correlativo: parsed.correlativo,
    });
  }

  return formatCodigoBarras(parsed);
}

/** Variantes para búsqueda al escanear (BD…, 24…, compacto o con guion). */
export function codigoBarrasLookupVariants(codigo: string): string[] {
  const trimmed = codigo.trim();
  const variants = new Set<string>();
  if (!trimmed) return [];

  variants.add(trimmed);
  const parsed = parseCodigoBarras(trimmed);
  if (!parsed) return [...variants];

  const correlativo = padCorrelativo(parsed.correlativo);
  variants.add(formatCodigoBarras(parsed));
  variants.add(formatCodigoBarrasSimboloFromPayload(parsed));

  if (CATALOGO_PROPIO_CODIGO_RE.test(parsed.codigo_catalogo)) {
    const catalogo = parsed.codigo_catalogo.toUpperCase();
    variants.add(`${catalogo}-${correlativo}`);
    variants.add(`${catalogo}${correlativo}`);
  }

  const decoded = decodeCatalogoPropioDesdeSimbolo(parsed.codigo_catalogo);
  if (decoded) {
    variants.add(`${decoded}-${correlativo}`);
    variants.add(`${decoded}${correlativo}`);
  }

  return [...variants];
}

/** Forma compacta para comparar lecturas del escáner con códigos guardados (con guion). */
export function normalizeCodigoBarrasForSearch(codigo: string): string {
  return codigo.trim().toLowerCase().replace(/[\s-]/g, "");
}

function codigoBarrasSearchForms(codigo: string): Set<string> {
  const forms = new Set<string>();
  for (const variant of codigoBarrasLookupVariants(codigo)) {
    const lower = variant.toLowerCase();
    forms.add(lower);
    forms.add(normalizeCodigoBarrasForSearch(variant));
  }
  return forms;
}

/**
 * ¿La consulta del lector/buscador coincide con algún código del activo?
 * Acepta con o sin guion (`746443220001` ↔ `74644322-0001`) y BD↔24.
 */
export function matchesCodigoBarrasQuery(
  query: string,
  ...codigos: Array<string | null | undefined>
): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const queryForms = codigoBarrasSearchForms(trimmed);
  for (const codigo of codigos) {
    if (!codigo?.trim()) continue;
    const storedForms = codigoBarrasSearchForms(codigo);
    for (const qf of queryForms) {
      for (const sf of storedForms) {
        if (sf === qf || sf.includes(qf)) return true;
      }
    }
  }
  return false;
}

/**
 * Formato aceptado al eliminar por códigos (lector sin guion o con guion):
 * 12 dígitos (`746443220001`) o 8+guion+4 (`74644322-0001` = 13 caracteres).
 */
export const CODIGO_BARRAS_ELIMINAR_INPUT_RE = /^(\d{12}|\d{8}-\d{4})$/;

/** Inserta guion tras 8 dígitos: `746443220001` → `74644322-0001`. */
export function insertGuionCodigoBarras12(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d{12}$/.test(trimmed)) {
    return `${trimmed.slice(0, CODIGO_BARRAS_CATALOGO_DIGITS)}-${trimmed.slice(CODIGO_BARRAS_CATALOGO_DIGITS)}`;
  }
  return trimmed;
}

/**
 * Formatea líneas completas de 12 dígitos con guion (p. ej. al pulsar Enter del lector).
 * No toca la línea en edición si `leaveLastIncomplete` y el texto no termina en salto.
 */
export function formatCodigosBarrasLinesWithGuion(
  text: string,
  options?: { leaveLastIncomplete?: boolean },
): string {
  const endsWithNewline = /\r?\n$/.test(text);
  const parts = text.split(/\r?\n/);
  const leaveLast = Boolean(options?.leaveLastIncomplete) && !endsWithNewline && parts.length > 0;

  const formatted = parts.map((line, index) => {
    if (leaveLast && index === parts.length - 1) return line;
    const trimmed = line.trim();
    if (!trimmed) return line;
    return insertGuionCodigoBarras12(trimmed);
  });

  return formatted.join("\n");
}

export interface ParseCodigosBarrasInputResult {
  /** Códigos normalizados con guion (o BD… si venían como 24…). */
  codigos: string[];
  /** Líneas no vacías que no cumplen 12 dígitos / 13 con guion. */
  invalidos: string[];
}

/** Parsea lista de códigos para eliminar: valida formato y añade el guion. */
export function parseCodigosBarrasInputDetailed(text: string): ParseCodigosBarrasInputResult {
  const seen = new Set<string>();
  const codigos: string[] = [];
  const invalidos: string[] = [];

  for (const part of text.split(/[\n,;]+/)) {
    const raw = part.trim();
    if (!raw) continue;
    if (!CODIGO_BARRAS_ELIMINAR_INPUT_RE.test(raw)) {
      if (!invalidos.includes(raw)) invalidos.push(raw);
      continue;
    }
    const normalized = normalizeCodigoBarrasDisplay(raw);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    codigos.push(normalized);
  }

  return { codigos, invalidos };
}

/** Códigos válidos normalizados (sin duplicados). Ignora líneas inválidas. */
export function parseCodigosBarrasInput(text: string): string[] {
  return parseCodigosBarrasInputDetailed(text).codigos;
}
