import { CODIGO_BARRAS_CATALOGO_DIGITS } from "./codigo-barras";

type CategoriaBien = "ACTIVO" | "CUENTA_ORDEN";
type EstadoBien = "BUENO" | "REGULAR" | "MALO";

function parseFechaDDMMYYYY(text: string): string | null {
  const trimmed = text.trim();
  const match = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || year < 1900 || year > 2100) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function validarFechaDDMMYYYY(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (!parseFechaDDMMYYYY(trimmed)) {
    return "Fecha adq. inválida (use DD/MM/AAAA).";
  }
  return null;
}

function parsePorcentajeDepreciacion(text: string): number | null {
  const normalized = text.replace(/\u00a0/g, " ").trim();
  const match = normalized.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

function vidaUtilMesesFromPorcentaje(porcentajeAnual: number): number {
  if (porcentajeAnual <= 0) return 0;
  return Math.round(1200 / porcentajeAnual);
}

export const MAX_IMPORT_ACTIVOS_FILAS = 500;

export const IMPORT_ACTIVOS_COLUMN_ERROR = "Error" as const;

export const IMPORT_ACTIVOS_HEADERS = [
  "Sucursal",
  "Ambiente",
  "Código catálogo",
  "Nombre del bien",
  "Categoría",
  "Estado",
  "Marca",
  "Modelo",
  "Serie",
  "Color",
  "Medidas",
  "Descripción",
  "Fecha adq.",
  "Precio adq.",
  "% Deprec.",
  "Observación",
] as const;

export type ImportActivoHeader = (typeof IMPORT_ACTIVOS_HEADERS)[number];

export type ImportActivoFila = Record<ImportActivoHeader, string>;

export type ImportActivoErrorFila = ImportActivoFila & {
  [IMPORT_ACTIVOS_COLUMN_ERROR]: string;
};

export interface ImportUbicacionRef {
  sedeId: string;
  sedeNombre: string;
  ambienteId: string;
  ambienteNombre: string;
  responsable?: string | null;
}

export interface ImportActivoInsertPayload {
  entidad_id: string;
  codigo_catalogo: string;
  nombre: string;
  categoria: CategoriaBien;
  estado_bien: EstadoBien;
  descripcion: string | null;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  color: string | null;
  medidas: string | null;
  fecha_adquisicion: string | null;
  valor_adquisicion: number | null;
  depreciacion: string | null;
  vida_util_meses: number | null;
  observacion: string | null;
  sede_id: string;
  ambiente_id: string;
}

export interface ImportActivoErrorItem {
  fila: number;
  datos: ImportActivoFila;
  motivo: string;
}

export interface ImportActivosResult {
  totalFilas: number;
  importados: number;
  errores: ImportActivoErrorItem[];
}

const HEADER_ALIASES: Record<string, ImportActivoHeader> = {
  sucursal: "Sucursal",
  sede: "Sucursal",
  ambiente: "Ambiente",
  "codigo catalogo": "Código catálogo",
  "código catálogo": "Código catálogo",
  "codigo catálogo": "Código catálogo",
  catalogo: "Código catálogo",
  cat: "Código catálogo",
  "nombre del bien": "Nombre del bien",
  nombre: "Nombre del bien",
  categoria: "Categoría",
  categoría: "Categoría",
  estado: "Estado",
  "estado bien": "Estado",
  marca: "Marca",
  modelo: "Modelo",
  serie: "Serie",
  color: "Color",
  medidas: "Medidas",
  descripcion: "Descripción",
  descripción: "Descripción",
  "fecha adq": "Fecha adq.",
  "fecha adq.": "Fecha adq.",
  "fecha adquisicion": "Fecha adq.",
  "precio adq": "Precio adq.",
  "precio adq.": "Precio adq.",
  "valor adquisicion": "Precio adq.",
  "% deprec": "% Deprec.",
  "% deprec.": "% Deprec.",
  depreciacion: "% Deprec.",
  depreciación: "% Deprec.",
  observacion: "Observación",
  observación: "Observación",
};

export function normalizeImportKey(text: string): string {
  return text
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function emptyImportActivoFila(): ImportActivoFila {
  return Object.fromEntries(IMPORT_ACTIVOS_HEADERS.map((h) => [h, ""])) as ImportActivoFila;
}

export function mapImportHeaders(headers: string[]): Map<number, ImportActivoHeader> {
  const map = new Map<number, ImportActivoHeader>();
  headers.forEach((raw, index) => {
    const key = normalizeImportKey(raw);
    if (!key || key === normalizeImportKey(IMPORT_ACTIVOS_COLUMN_ERROR)) return;
    const canonical = HEADER_ALIASES[key] ?? (IMPORT_ACTIVOS_HEADERS as readonly string[]).find(
      (h) => normalizeImportKey(h) === key,
    );
    if (canonical) map.set(index, canonical as ImportActivoHeader);
  });
  return map;
}

export function buildUbicacionLookup(
  refs: ImportUbicacionRef[],
): Map<string, { sede_id: string; ambiente_id: string }> {
  const map = new Map<string, { sede_id: string; ambiente_id: string }>();
  for (const ref of refs) {
    const key = `${normalizeImportKey(ref.sedeNombre)}|${normalizeImportKey(ref.ambienteNombre)}`;
    map.set(key, { sede_id: ref.sedeId, ambiente_id: ref.ambienteId });
  }
  return map;
}

function parseCategoria(text: string): CategoriaBien | null {
  const key = normalizeImportKey(text);
  if (!key) return "ACTIVO";
  if (key === "activo") return "ACTIVO";
  if (key === "cuenta de orden" || key === "cuenta_orden" || key === "orden") return "CUENTA_ORDEN";
  return null;
}

function parseEstadoBien(text: string): EstadoBien | null {
  const key = normalizeImportKey(text);
  if (!key) return "BUENO";
  if (key === "bueno") return "BUENO";
  if (key === "regular") return "REGULAR";
  if (key === "malo") return "MALO";
  return null;
}

function parsePrecio(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\s/g, "").replace(/,/g, "");
  const value = Number(normalized);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

function normalizeCodigoCatalogo(text: string): string {
  const digits = text.replace(/\D/g, "");
  if (digits.length >= CODIGO_BARRAS_CATALOGO_DIGITS) {
    return digits.slice(0, CODIGO_BARRAS_CATALOGO_DIGITS);
  }
  return digits.padStart(CODIGO_BARRAS_CATALOGO_DIGITS, "0");
}

export function validateImportActivoFila(
  fila: ImportActivoFila,
  entidadId: string,
  ubicacionLookup: Map<string, { sede_id: string; ambiente_id: string }>,
  catalogoCodigos: Set<string>,
): { ok: true; payload: ImportActivoInsertPayload } | { ok: false; motivo: string } {
  const sucursal = fila.Sucursal.trim();
  const ambiente = fila.Ambiente.trim();

  if (!sucursal) {
    return { ok: false, motivo: "Sucursal es obligatoria." };
  }
  if (!ambiente) {
    return { ok: false, motivo: "Ambiente es obligatorio." };
  }

  const ubicacionKey = `${normalizeImportKey(sucursal)}|${normalizeImportKey(ambiente)}`;
  const ubicacion = ubicacionLookup.get(ubicacionKey);
  if (!ubicacion) {
    return {
      ok: false,
      motivo: `Ambiente "${ambiente}" no encontrado en sucursal "${sucursal}".`,
    };
  }

  const codigoCatalogo = normalizeCodigoCatalogo(fila["Código catálogo"]);
  if (!codigoCatalogo || codigoCatalogo.length !== CODIGO_BARRAS_CATALOGO_DIGITS) {
    return { ok: false, motivo: "Código catálogo inválido (8 dígitos)." };
  }
  if (!catalogoCodigos.has(codigoCatalogo)) {
    return { ok: false, motivo: `Código catálogo "${codigoCatalogo}" no existe en el catálogo nacional.` };
  }

  const nombre = fila["Nombre del bien"].trim();
  if (!nombre) {
    return { ok: false, motivo: "Nombre del bien es obligatorio." };
  }

  const categoria = parseCategoria(fila.Categoría);
  if (!categoria) {
    return { ok: false, motivo: 'Categoría inválida. Use "Activo" o "Cuenta de orden".' };
  }

  const estadoBien = parseEstadoBien(fila.Estado);
  if (!estadoBien) {
    return { ok: false, motivo: 'Estado inválido. Use "Bueno", "Regular" o "Malo".' };
  }

  const fechaRaw = fila["Fecha adq."].trim();
  let fechaAdquisicion: string | null = null;
  if (fechaRaw) {
    const fechaError = validarFechaDDMMYYYY(fechaRaw);
    if (fechaError) {
      return { ok: false, motivo: fechaError };
    }
    fechaAdquisicion = parseFechaDDMMYYYY(fechaRaw);
  }

  const precioRaw = fila["Precio adq."].trim();
  let valorAdquisicion: number | null = null;
  if (precioRaw) {
    valorAdquisicion = parsePrecio(precioRaw);
    if (valorAdquisicion == null) {
      return { ok: false, motivo: "Precio adq. inválido." };
    }
  }

  const deprecRaw = fila["% Deprec."].trim();
  let depreciacion: string | null = null;
  let vidaUtilMeses: number | null = null;
  if (deprecRaw) {
    const pct = parsePorcentajeDepreciacion(deprecRaw.includes("%") ? deprecRaw : `${deprecRaw} %`);
    if (pct == null) {
      return { ok: false, motivo: "% Deprec. inválido (ej. 10 %)." };
    }
    depreciacion = `${pct} %`;
    vidaUtilMeses = vidaUtilMesesFromPorcentaje(pct);
  }

  return {
    ok: true,
    payload: {
      entidad_id: entidadId,
      codigo_catalogo: codigoCatalogo,
      nombre,
      categoria,
      estado_bien: estadoBien,
      descripcion: fila.Descripción.trim() || null,
      marca: fila.Marca.trim() || null,
      modelo: fila.Modelo.trim() || null,
      serie: fila.Serie.trim() || null,
      color: fila.Color.trim() || null,
      medidas: fila.Medidas.trim() || null,
      fecha_adquisicion: fechaAdquisicion,
      valor_adquisicion: valorAdquisicion,
      depreciacion,
      vida_util_meses: vidaUtilMeses,
      observacion: fila.Observación.trim() || null,
      sede_id: ubicacion.sede_id,
      ambiente_id: ubicacion.ambiente_id,
    },
  };
}

export function importErrorFilaFromItem(item: ImportActivoErrorItem): ImportActivoErrorFila {
  return { ...item.datos, [IMPORT_ACTIVOS_COLUMN_ERROR]: item.motivo };
}
