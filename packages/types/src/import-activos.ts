import { CODIGO_BARRAS_CATALOGO_DIGITS } from "./codigo-barras";

type CategoriaBien = "ACTIVO" | "CUENTA_ORDEN";
type EstadoBien = "BUENO" | "REGULAR" | "MALO";

const IMPORT_CUENTA_CODIGO_RE = /^\d{1,6}$/;

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
    return "Fecha de adquisición inválida (use DD/MM/AAAA).";
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

function normalizeImportCuentaCodigo(value: string): string | null {
  const digits = value.trim().replace(/\D/g, "");
  return IMPORT_CUENTA_CODIGO_RE.test(digits) ? digits : null;
}

function normalizeImportNombreCuenta(cuentaCodigo: string, nombre: string): string | null {
  let texto = nombre.trim().replace(/\s+/g, " ");
  if (!texto) return null;
  if (texto === cuentaCodigo || texto.startsWith(`${cuentaCodigo} `)) {
    texto = texto.slice(cuentaCodigo.length).trim();
  }
  return texto.length >= 2 ? texto : null;
}

export const MAX_IMPORT_ACTIVOS_FILAS = 500;

export const IMPORT_ACTIVOS_COLUMN_ERROR = "Error" as const;

export const IMPORT_ACTIVOS_HEADERS = [
  "Categoría",
  "Código catálogo",
  "Marca",
  "Modelo",
  "Serie",
  "Color",
  "Medidas",
  "Detalle",
  "Estado",
  "Fecha de adquisición",
  "Precio de adquisición (S/)",
  "Valor de mercado (S/)",
  "% Deprec.",
  "Observaciones",
  "Código cuenta contable",
  "Nombre cuenta contable",
  "Sucursal",
  "Ambiente",
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

export interface ImportActivoCatalogoItem {
  denominacion: string;
  cuenta_codigo: string | null;
  contabilidad: string | null;
  depreciacion: string | null;
}

export interface ImportActivoCatalogoContabilidadUpdate {
  codigo_catalogo: string;
  cuenta_codigo: string;
  contabilidad: string;
  depreciacion: string | null;
}

export interface ImportActivoInsertPayload {
  entidad_id: string;
  codigo_catalogo: string;
  nombre: string;
  categoria: CategoriaBien;
  estado_bien: EstadoBien;
  caracteristicas: string | null;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  color: string | null;
  medidas: string | null;
  fecha_adquisicion: string | null;
  valor_adquisicion: number | null;
  valor_es_mercado: boolean;
  depreciacion: string | null;
  vida_util_meses: number | null;
  observacion: string | null;
  sede_id: string;
  ambiente_id: string;
  catalogo_contabilidad?: ImportActivoCatalogoContabilidadUpdate | null;
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
  categoria: "Categoría",
  categoría: "Categoría",
  estado: "Estado",
  "estado bien": "Estado",
  marca: "Marca",
  modelo: "Modelo",
  serie: "Serie",
  color: "Color",
  medidas: "Medidas",
  detalle: "Detalle",
  descripcion: "Detalle",
  descripción: "Detalle",
  "fecha adq": "Fecha de adquisición",
  "fecha adq.": "Fecha de adquisición",
  "fecha de adquisicion": "Fecha de adquisición",
  "fecha de adquisición": "Fecha de adquisición",
  "precio adq": "Precio de adquisición (S/)",
  "precio adq.": "Precio de adquisición (S/)",
  "precio de adquisicion": "Precio de adquisición (S/)",
  "precio de adquisición": "Precio de adquisición (S/)",
  "valor mercado": "Valor de mercado (S/)",
  "valor de mercado": "Valor de mercado (S/)",
  "valor mercado (s/)": "Valor de mercado (S/)",
  "% deprec": "% Deprec.",
  "% deprec.": "% Deprec.",
  depreciacion: "% Deprec.",
  depreciación: "% Deprec.",
  observacion: "Observaciones",
  observación: "Observaciones",
  observaciones: "Observaciones",
  "codigo cuenta contable": "Código cuenta contable",
  "código cuenta contable": "Código cuenta contable",
  "cuenta contable": "Código cuenta contable",
  "codigo cuenta": "Código cuenta contable",
  "nombre cuenta contable": "Nombre cuenta contable",
  "nombre de cuenta contable": "Nombre cuenta contable",
  contabilidad: "Nombre cuenta contable",
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

export function buildCuentaContableLookup(
  rows: Array<{ cuenta_codigo: string | null; contabilidad: string | null }>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of rows) {
    const codigo = row.cuenta_codigo?.trim();
    if (!codigo || !IMPORT_CUENTA_CODIGO_RE.test(codigo)) continue;
    const nombre = normalizeImportNombreCuenta(codigo, row.contabilidad ?? "");
    if (!nombre) continue;
    const existing = map.get(codigo);
    if (!existing) {
      map.set(codigo, nombre);
      continue;
    }
    if (normalizeImportKey(existing) !== normalizeImportKey(nombre)) {
      map.set(codigo, existing);
    }
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

function resolveImportCuentaContable(
  codigoRaw: string,
  nombreRaw: string,
  cuentaLookup: Map<string, string>,
):
  | { ok: true; cuenta_codigo: string; contabilidad: string; lookup: Map<string, string> }
  | { ok: false; motivo: string } {
  const codigoInput = codigoRaw.trim();
  const nombreInput = nombreRaw.trim();

  if (!codigoInput && !nombreInput) {
    return { ok: false, motivo: "SKIP" };
  }

  if (!codigoInput && nombreInput) {
    return { ok: false, motivo: "Indique el código de cuenta contable." };
  }

  const codigo = normalizeImportCuentaCodigo(codigoInput);
  if (!codigo) {
    return { ok: false, motivo: "Código cuenta contable inválido (1 a 6 dígitos)." };
  }

  const nombreExplicito = nombreInput ? normalizeImportNombreCuenta(codigo, nombreInput) : null;
  if (nombreInput && !nombreExplicito) {
    return { ok: false, motivo: "Nombre cuenta contable inválido." };
  }

  const nombreCatalogo = cuentaLookup.get(codigo) ?? null;

  if (!nombreExplicito) {
    if (!nombreCatalogo) {
      return {
        ok: false,
        motivo: `Cuenta contable "${codigo}" no registrada. Indique el nombre.`,
      };
    }
    return { ok: true, cuenta_codigo: codigo, contabilidad: nombreCatalogo, lookup: cuentaLookup };
  }

  if (
    nombreCatalogo &&
    normalizeImportKey(nombreCatalogo) !== normalizeImportKey(nombreExplicito)
  ) {
    return {
      ok: false,
      motivo: `La cuenta "${codigo}" ya está registrada como "${nombreCatalogo}".`,
    };
  }

  const nextLookup = new Map(cuentaLookup);
  nextLookup.set(codigo, nombreExplicito);
  return { ok: true, cuenta_codigo: codigo, contabilidad: nombreExplicito, lookup: nextLookup };
}

export function validateImportActivoFila(
  fila: ImportActivoFila,
  entidadId: string,
  ubicacionLookup: Map<string, { sede_id: string; ambiente_id: string }>,
  catalogoByCodigo: Map<string, ImportActivoCatalogoItem>,
  cuentaLookup: Map<string, string>,
): { ok: true; payload: ImportActivoInsertPayload; cuentaLookup: Map<string, string> } | { ok: false; motivo: string } {
  const codigoCatalogo = normalizeCodigoCatalogo(fila["Código catálogo"]);
  if (!codigoCatalogo || codigoCatalogo.length !== CODIGO_BARRAS_CATALOGO_DIGITS) {
    return { ok: false, motivo: "Código catálogo inválido (8 dígitos)." };
  }

  const catalogoItem = catalogoByCodigo.get(codigoCatalogo);
  if (!catalogoItem) {
    return { ok: false, motivo: `Código catálogo "${codigoCatalogo}" no existe en el catálogo nacional.` };
  }

  const categoria = parseCategoria(fila.Categoría);
  if (!categoria) {
    return { ok: false, motivo: 'Categoría inválida. Use "Activo" o "Cuenta de orden".' };
  }

  const estadoBien = parseEstadoBien(fila.Estado);
  if (!estadoBien) {
    return { ok: false, motivo: 'Estado inválido. Use "Bueno", "Regular" o "Malo".' };
  }

  const precioRaw = fila["Precio de adquisición (S/)"].trim();
  const mercadoRaw = fila["Valor de mercado (S/)"].trim();
  const tienePrecio = Boolean(precioRaw);
  const tieneMercado = Boolean(mercadoRaw);

  if (tienePrecio && tieneMercado) {
    return {
      ok: false,
      motivo: "Indique solo precio de adquisición o valor de mercado, no ambos.",
    };
  }

  let valorAdquisicion: number | null = null;
  let valorEsMercado = false;

  if (tienePrecio) {
    valorAdquisicion = parsePrecio(precioRaw);
    if (valorAdquisicion == null) {
      return { ok: false, motivo: "Precio de adquisición inválido." };
    }
  } else if (tieneMercado) {
    valorAdquisicion = parsePrecio(mercadoRaw);
    if (valorAdquisicion == null) {
      return { ok: false, motivo: "Valor de mercado inválido." };
    }
    valorEsMercado = true;
  }

  const fechaRaw = fila["Fecha de adquisición"].trim();
  let fechaAdquisicion: string | null = null;
  if (fechaRaw) {
    const fechaError = validarFechaDDMMYYYY(fechaRaw);
    if (fechaError) {
      return { ok: false, motivo: fechaError };
    }
    fechaAdquisicion = parseFechaDDMMYYYY(fechaRaw);
  }

  if (tienePrecio && !fechaAdquisicion) {
    return { ok: false, motivo: "Fecha de adquisición es obligatoria con precio de adquisición." };
  }

  const deprecRaw = fila["% Deprec."].trim();
  let depreciacion: string | null = null;
  let vidaUtilMeses: number | null = null;

  if (deprecRaw) {
    if (categoria === "CUENTA_ORDEN") {
      return { ok: false, motivo: "Cuenta de orden no admite depreciación." };
    }
    if (valorEsMercado) {
      return { ok: false, motivo: "Valor de mercado no admite depreciación." };
    }
    const pct = parsePorcentajeDepreciacion(deprecRaw.includes("%") ? deprecRaw : `${deprecRaw} %`);
    if (pct == null) {
      return { ok: false, motivo: "% Deprec. inválido (ej. 10 %)." };
    }
    depreciacion = `${pct} %`;
    vidaUtilMeses = vidaUtilMesesFromPorcentaje(pct);
  }

  let nextCuentaLookup = cuentaLookup;
  let catalogoContabilidad: ImportActivoCatalogoContabilidadUpdate | null = null;
  const cuentaResolved = resolveImportCuentaContable(
    fila["Código cuenta contable"],
    fila["Nombre cuenta contable"],
    cuentaLookup,
  );

  if (!cuentaResolved.ok) {
    if (cuentaResolved.motivo !== "SKIP") {
      return { ok: false, motivo: cuentaResolved.motivo };
    }
  } else {
    nextCuentaLookup = cuentaResolved.lookup;
    const cuentaActual = catalogoItem.cuenta_codigo?.trim() || null;
    const nombreActual = catalogoItem.contabilidad?.trim() || null;
    const cuentaCambia =
      cuentaActual !== cuentaResolved.cuenta_codigo ||
      normalizeImportKey(nombreActual ?? "") !== normalizeImportKey(cuentaResolved.contabilidad);
    if (cuentaCambia) {
      catalogoContabilidad = {
        codigo_catalogo: codigoCatalogo,
        cuenta_codigo: cuentaResolved.cuenta_codigo,
        contabilidad: cuentaResolved.contabilidad,
        depreciacion: catalogoItem.depreciacion,
      };
    }
  }

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

  return {
    ok: true,
    cuentaLookup: nextCuentaLookup,
    payload: {
      entidad_id: entidadId,
      codigo_catalogo: codigoCatalogo,
      nombre: catalogoItem.denominacion.trim(),
      categoria,
      estado_bien: estadoBien,
      caracteristicas: fila.Detalle.trim() || null,
      marca: fila.Marca.trim() || null,
      modelo: fila.Modelo.trim() || null,
      serie: fila.Serie.trim() || null,
      color: fila.Color.trim() || null,
      medidas: fila.Medidas.trim() || null,
      fecha_adquisicion: fechaAdquisicion,
      valor_adquisicion: valorAdquisicion,
      valor_es_mercado: valorEsMercado,
      depreciacion,
      vida_util_meses: vidaUtilMeses,
      observacion: fila.Observaciones.trim() || null,
      sede_id: ubicacion.sede_id,
      ambiente_id: ubicacion.ambiente_id,
      catalogo_contabilidad: catalogoContabilidad,
    },
  };
}

export function importErrorFilaFromItem(item: ImportActivoErrorItem): ImportActivoErrorFila {
  return { ...item.datos, [IMPORT_ACTIVOS_COLUMN_ERROR]: item.motivo };
}
