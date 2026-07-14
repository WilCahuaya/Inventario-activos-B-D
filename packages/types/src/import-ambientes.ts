import { normalizeImportKey } from "./import-activos";

function normalizeResponsableNombre(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeResponsableDni(value: string): string {
  return value.replace(/\D/g, "");
}

function validarResponsableImport(nombre: string, dni: string | null): string | null {
  if (!normalizeResponsableNombre(nombre)) {
    return "El nombre del responsable es obligatorio.";
  }
  const dniNorm = normalizeResponsableDni(dni ?? "");
  if (dniNorm && dniNorm.length !== 8) {
    return "El DNI debe tener 8 dígitos.";
  }
  return null;
}

export const MAX_IMPORT_AMBIENTES_FILAS = 500;

export const IMPORT_AMBIENTES_COLUMN_ERROR = "Error" as const;

export const IMPORT_AMBIENTES_HEADERS = [
  "Nombre del ambiente",
  "Descripción del ambiente",
  "Nombre de sucursal",
  "Dirección de sucursal",
  "Nombre de responsable",
  "DNI de responsable",
  "Correo de responsable",
  "Teléfono del responsable",
] as const;

export type ImportAmbienteHeader = (typeof IMPORT_AMBIENTES_HEADERS)[number];

export type ImportAmbienteFila = Record<ImportAmbienteHeader, string>;

export type ImportAmbienteErrorFila = ImportAmbienteFila & {
  [IMPORT_AMBIENTES_COLUMN_ERROR]: string;
};

export interface ImportAmbienteSedeRef {
  sedeId: string;
  sedeNombre: string;
  esPrincipal?: boolean;
}

export interface ImportAmbienteResponsableRef {
  responsableId: string;
  nombre: string;
  dni: string | null;
}

export interface ImportAmbienteExistingRef {
  sedeNombre: string;
  ambienteNombre: string;
}

export interface ImportAmbienteInsertPayload {
  sede_id: string;
  nombre: string;
  descripcion: string | null;
  responsable_id: string | null;
}

export interface ImportAmbienteRowData {
  ambienteNombre: string;
  ambienteDescripcion: string | null;
  sedeNombre: string;
  sedeDireccion: string | null;
  responsableNombre: string | null;
  responsableDni: string | null;
  responsableEmail: string | null;
  responsableTelefono: string | null;
}

export interface ImportAmbienteErrorItem {
  fila: number;
  datos: ImportAmbienteFila;
  motivo: string;
}

export interface ImportAmbientesResult {
  totalFilas: number;
  importados: number;
  sedesCreadas: number;
  responsablesCreados: number;
  errores: ImportAmbienteErrorItem[];
}

export interface ImportAmbientesContext {
  sedes: ImportAmbienteSedeRef[];
  responsables: ImportAmbienteResponsableRef[];
  ambientes: ImportAmbienteExistingRef[];
}

const HEADER_ALIASES: Record<string, ImportAmbienteHeader> = {
  ambiente: "Nombre del ambiente",
  "nombre del ambiente": "Nombre del ambiente",
  "nombre ambiente": "Nombre del ambiente",
  descripcion: "Descripción del ambiente",
  descripción: "Descripción del ambiente",
  "descripcion del ambiente": "Descripción del ambiente",
  "descripción del ambiente": "Descripción del ambiente",
  sucursal: "Nombre de sucursal",
  sede: "Nombre de sucursal",
  "nombre de sucursal": "Nombre de sucursal",
  "nombre sucursal": "Nombre de sucursal",
  "direccion de sucursal": "Dirección de sucursal",
  "dirección de sucursal": "Dirección de sucursal",
  direccion: "Dirección de sucursal",
  dirección: "Dirección de sucursal",
  responsable: "Nombre de responsable",
  "nombre de responsable": "Nombre de responsable",
  "nombre responsable": "Nombre de responsable",
  dni: "DNI de responsable",
  "dni de responsable": "DNI de responsable",
  correo: "Correo de responsable",
  email: "Correo de responsable",
  "correo de responsable": "Correo de responsable",
  telefono: "Teléfono del responsable",
  teléfono: "Teléfono del responsable",
  "telefono del responsable": "Teléfono del responsable",
  "teléfono del responsable": "Teléfono del responsable",
};

export function emptyImportAmbienteFila(): ImportAmbienteFila {
  return Object.fromEntries(IMPORT_AMBIENTES_HEADERS.map((h) => [h, ""])) as ImportAmbienteFila;
}

export function mapImportAmbienteHeaders(headers: string[]): Map<number, ImportAmbienteHeader> {
  const map = new Map<number, ImportAmbienteHeader>();
  headers.forEach((raw, index) => {
    const key = normalizeImportKey(raw);
    if (!key || key === normalizeImportKey(IMPORT_AMBIENTES_COLUMN_ERROR)) return;
    const canonical =
      HEADER_ALIASES[key] ??
      (IMPORT_AMBIENTES_HEADERS as readonly string[]).find((h) => normalizeImportKey(h) === key);
    if (canonical) map.set(index, canonical as ImportAmbienteHeader);
  });
  return map;
}

export function buildSedeLookup(sedes: ImportAmbienteSedeRef[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const sede of sedes) {
    map.set(normalizeImportKey(sede.sedeNombre), sede.sedeId);
  }
  return map;
}

export function findPrincipalSede(sedes: ImportAmbienteSedeRef[]): ImportAmbienteSedeRef | null {
  return (
    sedes.find((s) => s.esPrincipal) ??
    sedes.find((s) => normalizeImportKey(s.sedeNombre) === "principal") ??
    null
  );
}

export function buildResponsableDniLookup(
  responsables: ImportAmbienteResponsableRef[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const responsable of responsables) {
    const dni = normalizeResponsableDni(responsable.dni ?? "");
    if (dni) map.set(dni, responsable.responsableId);
  }
  return map;
}

export function buildResponsableNombreLookup(
  responsables: ImportAmbienteResponsableRef[],
): Map<string, string> {
  const map = new Map<string, string>();
  for (const responsable of responsables) {
    const key = normalizeImportKey(responsable.nombre);
    if (key) map.set(key, responsable.responsableId);
  }
  return map;
}

export function buildExistingAmbienteKeys(ambientes: ImportAmbienteExistingRef[]): Set<string> {
  const keys = new Set<string>();
  for (const ambiente of ambientes) {
    keys.add(ambienteKey(ambiente.sedeNombre, ambiente.ambienteNombre));
  }
  return keys;
}

function ambienteKey(sedeNombre: string, ambienteNombre: string): string {
  return `${normalizeImportKey(sedeNombre)}|${normalizeImportKey(ambienteNombre)}`;
}

function hasResponsableData(data: ImportAmbienteRowData): boolean {
  return Boolean(
    data.responsableNombre ||
      data.responsableDni ||
      data.responsableEmail ||
      data.responsableTelefono,
  );
}

export function parseImportAmbienteFila(
  fila: ImportAmbienteFila,
): { ok: true; data: ImportAmbienteRowData } | { ok: false; motivo: string } {
  const ambienteNombre = fila["Nombre del ambiente"].trim();
  const sedeNombre = fila["Nombre de sucursal"].trim();

  if (!ambienteNombre) {
    return { ok: false, motivo: "Nombre del ambiente es obligatorio." };
  }
  if (!sedeNombre) {
    return { ok: false, motivo: "Nombre de sucursal es obligatorio." };
  }

  const data: ImportAmbienteRowData = {
    ambienteNombre,
    ambienteDescripcion: fila["Descripción del ambiente"].trim() || null,
    sedeNombre,
    sedeDireccion: fila["Dirección de sucursal"].trim() || null,
    responsableNombre: normalizeResponsableNombre(fila["Nombre de responsable"]) || null,
    responsableDni: normalizeResponsableDni(fila["DNI de responsable"]) || null,
    responsableEmail: fila["Correo de responsable"].trim() || null,
    responsableTelefono: fila["Teléfono del responsable"].trim() || null,
  };

  if (!hasResponsableData(data)) {
    return { ok: true, data };
  }

  if (!data.responsableNombre) {
    return { ok: false, motivo: "Indique el nombre del responsable o deje vacíos todos sus datos." };
  }

  const validationError = validarResponsableImport(data.responsableNombre, data.responsableDni);
  if (validationError) {
    return { ok: false, motivo: validationError };
  }

  return { ok: true, data };
}

export function validateImportAmbienteDuplicado(
  data: ImportAmbienteRowData,
  existingKeys: Set<string>,
  batchKeys: Set<string>,
): { ok: true; key: string } | { ok: false; motivo: string } {
  const key = ambienteKey(data.sedeNombre, data.ambienteNombre);
  if (existingKeys.has(key)) {
    return {
      ok: false,
      motivo: `El ambiente "${data.ambienteNombre}" ya existe en la sucursal "${data.sedeNombre}".`,
    };
  }
  if (batchKeys.has(key)) {
    return {
      ok: false,
      motivo: `Ambiente "${data.ambienteNombre}" duplicado en el archivo para la sucursal "${data.sedeNombre}".`,
    };
  }
  return { ok: true, key };
}

export function isPrincipalSedeNombre(nombre: string): boolean {
  return normalizeImportKey(nombre) === "principal";
}

export function importAmbienteErrorFilaFromItem(item: ImportAmbienteErrorItem): ImportAmbienteErrorFila {
  return { ...item.datos, [IMPORT_AMBIENTES_COLUMN_ERROR]: item.motivo };
}
