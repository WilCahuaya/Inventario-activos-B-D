/** Roles del sistema MVP */
export type RolUsuario = "CONTADOR" | "ADMIN_ENTIDAD";

/** Ciclo de vida del registro del activo */
export type EstadoRegistro = "PREREGISTRADO" | "REGISTRADO" | "DADO_DE_BAJA";

/** Nombre del ambiente sistema donde se alojan los preregistros de una entidad. */
export function buildAmbientePreregistroNombre(year = new Date().getFullYear()): string {
  return `Adquisicion ${year}`;
}

/** Estado físico del bien */
export type EstadoBien = "BUENO" | "REGULAR" | "MALO";

/** Categoría contable del bien */
export type CategoriaBien = "ACTIVO" | "CUENTA_ORDEN";

/** Campos con vocabulario global para autocompletado */
export type ActivoAtributoCampo =
  | "marca"
  | "modelo"
  | "serie"
  | "color"
  | "medidas"
  | "detalle";

export const ACTIVO_ATRIBUTO_CAMPOS = [
  "marca",
  "modelo",
  "serie",
  "color",
  "medidas",
  "detalle",
] as const;

/** Estado de una ronda de visita de campo en la entidad */
export type EstadoVisitaCampo = "ABIERTO" | "CERRADO";

/** Progreso de un ambiente dentro de una visita de campo */
export type EstadoVisitaAmbiente = "EN_PROCESO" | "CULMINADO";

/** Visita de campo abierta (resumen para UI) */
export interface VisitaCampoActiva {
  id: string;
  entidad_id: string;
  numero: number;
  estado: EstadoVisitaCampo;
  abierto_at: string;
  abierto_por_nombre: string | null;
  /** null = visita en todas las sucursales */
  sede_id: string | null;
  sede_nombre: string | null;
  ambientes_total: number;
  ambientes_culminados: number;
}

/** Fila del historial de visitas de campo por entidad */
export interface VisitaCampoHistorial {
  id: string;
  numero: number;
  estado: EstadoVisitaCampo;
  abierto_at: string;
  cerrado_at: string | null;
  abierto_por_nombre: string | null;
  cerrado_por_nombre: string | null;
  sede_id: string | null;
  sede_nombre: string | null;
  ambientes_total: number;
  ambientes_culminados: number;
}

/** Detalle de ambientes en una visita cerrada o abierta */
export interface VisitaCampoAmbienteDetalle {
  ambiente_id: string;
  ambiente_nombre: string;
  sede_nombre: string;
  es_preregistro: boolean;
  estado: EstadoVisitaAmbiente | null;
  culminado_at: string | null;
  culminado_por_nombre: string | null;
}

/** Perfil de usuario (tabla profiles) */
export interface Profile {
  id: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  entidad_id: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Entidad {
  id: string;
  nombre: string;
  nombre_etiqueta: string | null;
  ruc: string | null;
  direccion: string | null;
  admin_nombre: string | null;
  admin_email: string | null;
  admin_dni: string | null;
  admin_telefono: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface EntidadConConteo extends Entidad {
  ambiente_count: number;
  /** Cantidad de activos de la entidad (cualquier estado). */
  activo_count: number;
}

export interface Sede {
  id: string;
  entidad_id: string;
  nombre: string;
  direccion: string | null;
  es_principal: boolean;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ambiente {
  id: string;
  sede_id: string;
  nombre: string;
  descripcion: string | null;
  responsable_id: string | null;
  responsable: string | null;
  es_preregistro: boolean;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

/** Persona responsable de ámbitos/ambientes (sin cuenta de usuario) */
export interface Responsable {
  id: string;
  entidad_id: string;
  nombre: string;
  dni: string | null;
  email: string | null;
  telefono: string | null;
  cargo: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResponsableConConteo extends Responsable {
  ambiente_count: number;
  /** Nombres de ambientes activos asignados (sede entre paréntesis si aplica). */
  ambiente_nombres?: string[];
  /** Coincide con el administrador de la entidad (correo en entidades.admin_email). */
  es_administrador?: boolean;
}

export interface CreateResponsableInput {
  nombre: string;
  dni: string;
  email?: string;
  telefono?: string;
  /** @deprecated El cargo se asigna automáticamente al crear. */
  cargo?: string;
}

/** Cargo por defecto al registrar un responsable (no editable en el formulario). */
export const RESPONSABLE_CARGO_DEFAULT = "Responsable";

/** Cargo del administrador de entidad sincronizado en responsables. */
export const RESPONSABLE_CARGO_ADMIN = "Administrador";

export interface UpdateResponsableInput extends CreateResponsableInput {
  activo?: boolean;
}

export function normalizeResponsableNombre(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/** Normaliza DNI peruano: solo dígitos. */
export function normalizeResponsableDni(value: string): string {
  return value.replace(/\D/g, "");
}

export function validarCreateResponsableInput(input: CreateResponsableInput): string | null {
  if (!normalizeResponsableNombre(input.nombre)) {
    return "El nombre del responsable es obligatorio.";
  }
  const dni = normalizeResponsableDni(input.dni ?? "");
  if (dni && dni.length !== 8) {
    return "El DNI debe tener 8 dígitos.";
  }
  return null;
}

export function validarAdminEntidadDni(dni: string | undefined): string | null {
  const normalized = normalizeResponsableDni(dni ?? "");
  if (!normalized) {
    return "El DNI del administrador es obligatorio.";
  }
  if (normalized.length !== 8) {
    return "El DNI debe tener 8 dígitos.";
  }
  return null;
}

export interface SedeConConteo extends Sede {
  ambiente_count: number;
}

export interface Activo {
  id: string;
  entidad_id: string;
  sede_id: string | null;
  ambiente_id: string | null;
  posible_ambiente_id: string | null;
  codigo_catalogo: string;
  correlativo: number | null;
  codigo_barras: string | null;
  nombre: string;
  nombre_etiqueta: string | null;
  descripcion: string | null;
  caracteristicas: string | null;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  color: string | null;
  medidas: string | null;
  medida_largo: number | null;
  medida_ancho: number | null;
  medida_altura: number | null;
  depreciacion: string | null;
  observacion: string | null;
  responsable: string | null;
  valor_es_mercado: boolean;
  estado_registro: EstadoRegistro;
  estado_bien: EstadoBien;
  categoria: CategoriaBien;
  valor_adquisicion: number | null;
  fecha_adquisicion: string | null;
  vida_util_meses: number | null;
  foto_path: string | null;
  comprobante_path: string | null;
  comprobante_serie: string | null;
  /** Snapshot por bien; si es null, se usa el catálogo nacional. */
  cuenta_contable_codigo: string | null;
  cuenta_contable_nombre: string | null;
  motivo_baja: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Máximo de unidades por operación «agregar bienes similares». */
export const MAX_ACTIVOS_SIMILARES_CANTIDAD = 500;

export interface ActivosSimilaresPreview {
  es_registrado: boolean;
  primer_codigo?: string | null;
  ultimo_codigo?: string | null;
}

export interface CreateActivosSimilaresResult {
  creados: number;
  estado_registro: string;
  primer_codigo_barras?: string | null;
  ultimo_codigo_barras?: string | null;
}

export interface EjemplaresSimilaresResumen {
  total: number;
  registrados: number;
  preregistrados: number;
}

/** Campos permitidos en edición masiva de un lote (contador). */
export interface UpdateActivosSimilaresInput {
  categoria?: CategoriaBien;
  depreciacion?: string | null;
  valor_adquisicion?: number | null;
  valor_es_mercado?: boolean;
  fecha_adquisicion?: string | null;
  comprobante_serie?: string | null;
  comprobante_path?: string | null;
  foto_path?: string | null;
  observacion?: string | null;
  /** Solo admin: mover todo el lote de ubicación. */
  sede_id?: string | null;
  ambiente_id?: string | null;
  posible_ambiente_id?: string | null;
}

export interface UpdateActivosSimilaresResult {
  actualizados: number;
}

/** Máximo de códigos por operación de eliminación masiva. */
export const MAX_ELIMINAR_ACTIVOS_POR_CODIGOS = 500;

export interface ActivoEliminarPreviewItem {
  id: string;
  codigo_barras: string;
  nombre: string;
  sede_nombre?: string | null;
  ambiente_nombre?: string | null;
}

export interface ActivoEliminarNoElegibleItem {
  codigo_barras: string;
  estado_registro: string;
  nombre: string;
}

export interface PreviewDeleteActivosPorCodigosResult {
  solicitados: number;
  encontrados: ActivoEliminarPreviewItem[];
  no_encontrados: string[];
  no_elegibles: ActivoEliminarNoElegibleItem[];
}

export interface DeleteActivosPorCodigosResult {
  eliminados: number;
  codigos: string[];
  foto_paths: string[];
  comprobante_paths: string[];
}

export const MAX_ELIMINAR_ACTIVOS_PREREGISTRADOS_POR_LOTE = 500;

export function esActivoPreregistrado(activo: { estado_registro: string }): boolean {
  return activo.estado_registro === "PREREGISTRADO";
}

export interface DeleteActivosPreregistradosResult {
  eliminados: number;
  activo_ids: string[];
  foto_paths: string[];
  comprobante_paths: string[];
}

export function formatEjemplaresEnAmbienteTexto(resumen: EjemplaresSimilaresResumen): string {
  const { total } = resumen;
  if (total <= 0) return "";
  return total === 1 ? "1 ejemplar en este lote" : `${total} ejemplares en este lote`;
}

/** @deprecated Usar formatEjemplaresEnAmbienteTexto en la ficha. */
export function formatEjemplaresSimilaresTexto(resumen: EjemplaresSimilaresResumen): string {
  const { total, registrados, preregistrados } = resumen;
  if (total <= 0) return "Sin ejemplares";
  if (total === 1) return "1 ejemplar en este lote";
  const partes = [`${total} ejemplares en este lote`];
  if (registrados > 0) partes.push(`${registrados} registrados`);
  if (preregistrados > 0) partes.push(`${preregistrados} preregistrados`);
  return partes.join(" · ");
}

export const CATEGORIA_BIEN_AYUDA =
  "Ambos duran más de un año. La diferencia es el valor: si es importante para el patrimonio contable, elija Activo; si es bajo pero igual conviene controlarlo, elija Cuenta de orden.";

export const CATEGORIA_BIEN_LABELS: Record<
  CategoriaBien,
  { titulo: string; descripcion: string; ejemplos: string }
> = {
  ACTIVO: {
    titulo: "Activo",
    descripcion:
      "Bien importante que la institución usa varios años. Tiene valor económico relevante, forma parte del patrimonio y se registra en contabilidad (se deprecia).",
    ejemplos:
      "Computadoras, impresoras, vehículos, equipos médicos, mobiliario de oficina, maquinaria.",
  },
  CUENTA_ORDEN: {
    titulo: "Cuenta de orden",
    descripcion:
      "Bien que también dura más de un año y debe controlarse, pero por su bajo valor no se considera patrimonio contable importante.",
    ejemplos: "Sillas plásticas, tachos, sartenes, herramientas pequeñas.",
  },
};

/** Convierte DD/MM/AAAA a ISO (YYYY-MM-DD) o null si es inválida. */
export function parseFechaDDMMYYYY(text: string): string | null {
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

/** Formatea dígitos al escribir: 06062026 → 06/06/2026. Con barras, edita día/mes/año por segmento. */
export function formatFechaInputDDMMYYYY(value: string): string {
  if (value.includes("/")) {
    const parts = value.split("/");
    const day = (parts[0] ?? "").replace(/\D/g, "").slice(0, 2);
    let month = "";
    let year = "";

    if (parts.length >= 3) {
      month = (parts[1] ?? "").replace(/\D/g, "").slice(0, 2);
      year = (parts[2] ?? "").replace(/\D/g, "").slice(0, 4);
    } else if (parts.length === 2) {
      const rest = (parts[1] ?? "").replace(/\D/g, "");
      if (rest.length > 2) {
        month = rest.slice(0, 2);
        year = rest.slice(2, 6);
      } else {
        month = rest.slice(0, 2);
      }
    }

    let out = day;
    if (parts.length > 1 || value.includes("/")) {
      out += `/${month}`;
      if (parts.length > 2) {
        out += `/${year}`;
      } else if (year) {
        out += `/${year}`;
      }
    }
    return out;
  }

  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

/** ISO (YYYY-MM-DD) → DD/MM/AAAA para listados e informes. */
export function formatFechaISOToDDMMYYYY(iso: string | null | undefined): string {
  if (!iso) return "";
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return iso;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

const MESES_CORTO_ES = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

const MESES_LARGO_ES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

function partesFechaReporte(iso: string): { day: number; month: number; year: number } | null {
  const isoMatch = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return {
      year: Number(isoMatch[1]),
      month: Number(isoMatch[2]),
      day: Number(isoMatch[3]),
    };
  }
  const dmy = iso.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmy) {
    return {
      day: Number(dmy[1]),
      month: Number(dmy[2]),
      year: Number(dmy[3]),
    };
  }
  return null;
}

/** ISO (YYYY-MM-DD) o DD/MM/AAAA → «10 de julio de 2026». */
export function formatFechaISOToLargoES(iso: string | null | undefined): string {
  if (!iso?.trim()) return "";
  const partes = partesFechaReporte(iso.trim());
  if (!partes) return iso;
  const month = MESES_LARGO_ES[partes.month - 1];
  if (!month) return formatFechaISOToDDMMYYYY(iso);
  return `${partes.day} de ${month} de ${partes.year}`;
}

export function labelFechaEmision(fecha: Date): string {
  const largo = formatFechaISOToLargoES(fecha.toISOString().slice(0, 10));
  return largo ? `Fecha de emisión: ${largo}` : "";
}

export function labelFechaCorte(fechaCorteIso: string): string {
  const largo = formatFechaISOToLargoES(fechaCorteIso);
  return largo ? `Fecha de corte: ${largo}` : "";
}

/** ISO (YYYY-MM-DD) → «08 oct 2026» para listados. */
export function formatFechaISOToCortoES(iso: string | null | undefined): string {
  if (!iso) return "";
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return iso;
  const day = Number(match[3]);
  const monthIndex = Number(match[2]) - 1;
  const year = match[1];
  if (monthIndex < 0 || monthIndex > 11) return formatFechaISOToDDMMYYYY(iso);
  const mes = MESES_CORTO_ES[monthIndex];
  return `${String(day).padStart(2, "0")} ${mes} ${year}`;
}

export function categoriaBienLetra(categoria: CategoriaBien): "A" | "C" {
  return categoria === "CUENTA_ORDEN" ? "C" : "A";
}

export {
  entidadMuestraSelectorSede,
  entidadTieneMultiplesSedes,
  findSedePrincipal,
  sedeIdSinSelector,
  sedeImplicitaEntidad,
  type SedeRef,
} from "./sede-entidad";

export function depreciacionPorcentajeNumero(depreciacion: string | null | undefined): string {
  if (!depreciacion?.trim()) return "—";
  const m = depreciacion.trim().match(/(\d+(?:[.,]\d+)?)/);
  if (!m) return "—";
  return m[1].replace(",", ".");
}

/** Formato compacto: «10 · 24 · 9.67 = 30.33» (montos sin S/). */
export function formatDepreciacionResumida(
  depreciacion: string | null | undefined,
  periodoMeses: number,
  depAcumulada: number | null,
  valorNeto: number | null,
): string {
  const pct = depreciacionPorcentajeNumero(depreciacion);
  const meses = periodoMeses > 0 ? String(Math.round(periodoMeses)) : "—";
  const dep = depAcumulada != null ? formatMonedaPE(depAcumulada) : "—";
  const neto = valorNeto != null ? formatMonedaPE(valorNeto) : "—";
  if (pct === "—" && meses === "—" && dep === "—" && neto === "—") return "—";
  return `${pct} · ${meses} · ${dep} = ${neto}`;
}

export type { CodigoBarrasPayload } from "./codigo-barras-types";

import {
  CODIGO_BARRAS_CATALOGO_DIGITS,
  CORRELATIVO_DIGITS,
  formatCodigoBarras,
  normalizeCodigoBarrasDisplay,
} from "./codigo-barras";

export {
  CATALOGO_PROPIO_SIMBOLO_PREFIX,
  CODIGO_BARRAS_CATALOGO_DIGITS,
  CODIGO_BARRAS_DISPLAY_LENGTH,
  CODIGO_BARRAS_ELIMINAR_INPUT_RE,
  CODIGO_BARRAS_SIMBOLO_LENGTH,
  CORRELATIVO_DIGITS,
  codigoBarrasLookupVariants,
  decodeCatalogoPropioDesdeSimbolo,
  encodeCatalogoPropioParaSimbolo,
  formatCodigoBarras,
  formatCodigoBarrasSimbolo,
  formatCodigoBarrasSimboloFromPayload,
  matchesCodigoBarrasQuery,
  normalizeCodigoBarrasDisplay,
  normalizeCodigoBarrasForSearch,
  parseCodigoBarras,
  parseCodigosBarrasInput,
  parseCodigosBarrasInputDetailed,
  formatCodigosBarrasLinesWithGuion,
  insertGuionCodigoBarras12,
} from "./codigo-barras";
export type { ParseCodigosBarrasInputResult } from "./codigo-barras";
/** Correlativo con ceros (4 dígitos por defecto, ej. 0003). */
export function formatCorrelativoDisplay(
  correlativo: number | null,
  digits = CORRELATIVO_DIGITS,
): string {
  if (correlativo == null) return "";
  return String(correlativo).padStart(digits, "0");
}

/** Código completo catálogo-correlativo (ej. 74643712-0003 o BD000003-0001). */
export function formatCorrelativoCompleto(
  codigoCatalogo: string,
  correlativo: number | null,
): string {
  if (correlativo == null || !codigoCatalogo.trim()) return "";
  return formatCodigoBarras({ codigo_catalogo: codigoCatalogo.trim(), correlativo });
}

/** Código legible del activo para tablas y reportes (barras, catálogo-correlativo o solo catálogo). */
export function formatActivoCodigoDisplay(activo: {
  codigo_barras?: string | null;
  codigo_catalogo: string;
  correlativo?: number | null;
}): string {
  const barras = activo.codigo_barras?.trim();
  if (barras) return normalizeCodigoBarrasDisplay(barras);
  const completo = formatCorrelativoCompleto(activo.codigo_catalogo, activo.correlativo ?? null);
  if (completo) return completo;
  return activo.codigo_catalogo?.trim() || "—";
}

/** Código de cuenta contable: 1 a 6 dígitos. */
export const CUENTA_CONTABLE_CODIGO_RE = /^\d{1,6}$/;
const CUENTA_CONTA_COMBINADA_RE = /^(\d{1,6})\s+(.+)$/;

export function normalizeCuentaCodigo(value?: string | null): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  return CUENTA_CONTABLE_CODIGO_RE.test(digits) ? digits : null;
}

export function normalizeNombreCuentaContable(
  cuentaCodigo: string | null,
  contabilidad?: string | null,
): string | null {
  let nombre = contabilidad?.trim().replace(/\s+/g, " ") ?? "";
  if (!nombre) return null;
  if (cuentaCodigo && (nombre === cuentaCodigo || nombre.startsWith(`${cuentaCodigo} `))) {
    nombre = nombre.slice(cuentaCodigo.length).trim();
  }
  if (!nombre || nombre === cuentaCodigo) return null;
  return nombre;
}

export function normalizeCuentaContableFields(
  cuentaCodigo?: string | null,
  contabilidad?: string | null,
): { cuenta_codigo: string | null; contabilidad: string | null } {
  let codigo = normalizeCuentaCodigo(cuentaCodigo);
  let rawNombre = contabilidad?.trim().replace(/\s+/g, " ") ?? "";

  if (!codigo && rawNombre) {
    const soloCodigo = normalizeCuentaCodigo(rawNombre);
    if (soloCodigo && rawNombre === soloCodigo) {
      return { cuenta_codigo: soloCodigo, contabilidad: null };
    }
    const match = CUENTA_CONTA_COMBINADA_RE.exec(rawNombre);
    if (match) {
      codigo = match[1];
      rawNombre = match[2].trim();
    }
  }

  return {
    cuenta_codigo: codigo,
    contabilidad: normalizeNombreCuentaContable(codigo, rawNombre || null),
  };
}

export interface ActivoCuentaContableSource {
  cuenta_contable_codigo?: string | null;
  cuenta_contable_nombre?: string | null;
}

export interface CatalogoCuentaContableSource {
  cuenta_codigo?: string | null;
  contabilidad?: string | null;
}

export function activoTieneCuentaContablePropia(activo: ActivoCuentaContableSource): boolean {
  return Boolean(activo.cuenta_contable_codigo?.trim() || activo.cuenta_contable_nombre?.trim());
}

/** Cuenta efectiva: override del activo o respaldo del catálogo. */
export function resolveCuentaContableActivo(
  activo: ActivoCuentaContableSource,
  catalogo?: CatalogoCuentaContableSource | null,
): { cuenta_codigo: string | null; contabilidad: string | null } {
  if (activoTieneCuentaContablePropia(activo)) {
    return normalizeCuentaContableFields(
      activo.cuenta_contable_codigo,
      activo.cuenta_contable_nombre,
    );
  }
  return {
    cuenta_codigo: catalogo?.cuenta_codigo?.trim() || null,
    contabilidad: catalogo?.contabilidad?.trim() || null,
  };
}

/** Normaliza y persiste cuenta contable en columnas del activo (texto, sin FK). */
export function buildActivoCuentaContablePayload(
  cuentaCodigo?: string | null,
  cuentaNombre?: string | null,
  categoria: CategoriaBien = "ACTIVO",
): { cuenta_contable_codigo: string | null; cuenta_contable_nombre: string | null } {
  if (categoria === "CUENTA_ORDEN") {
    const normalized = normalizeCuentaContableFields(
      cuentaCodigo?.trim() || CATALOGO_CUENTA_ORDEN_CONTABILIDAD,
      cuentaNombre,
    );
    return {
      cuenta_contable_codigo: normalized.cuenta_codigo,
      cuenta_contable_nombre: normalized.contabilidad,
    };
  }
  if (!cuentaCodigo?.trim() && !cuentaNombre?.trim()) {
    return { cuenta_contable_codigo: null, cuenta_contable_nombre: null };
  }
  const normalized = normalizeCuentaContableFields(cuentaCodigo, cuentaNombre);
  return {
    cuenta_contable_codigo: normalized.cuenta_codigo,
    cuenta_contable_nombre: normalized.contabilidad,
  };
}

/** Solo persistir cuenta en el activo si el usuario la definió distinta a la referencia (p. ej. catálogo). */
export function debePersistirCuentaContableEnActivo(input: {
  esEdicion: boolean;
  activoTienePropia: boolean;
  cuentaCodigo: string;
  cuentaNombre: string;
  referenciaCodigo: string;
  referenciaNombre: string;
}): boolean {
  const codigo = input.cuentaCodigo.trim();
  const nombre = input.cuentaNombre.trim();
  const refCodigo = input.referenciaCodigo.trim();
  const refNombre = input.referenciaNombre.trim();

  if (input.esEdicion && input.activoTienePropia) return true;

  return codigo !== refCodigo || nombre !== refNombre;
}

export function applyCuentaContableToPayloadIfProvided<
  T extends Record<string, unknown>,
>(
  payload: T,
  input: {
    cuenta_contable_codigo?: string | null;
    cuenta_contable_nombre?: string | null;
    categoria?: CategoriaBien;
  },
): T {
  if (
    input.cuenta_contable_codigo === undefined &&
    input.cuenta_contable_nombre === undefined
  ) {
    return payload;
  }
  const cuenta = buildActivoCuentaContablePayload(
    input.cuenta_contable_codigo,
    input.cuenta_contable_nombre,
    input.categoria ?? "ACTIVO",
  );
  return {
    ...payload,
    cuenta_contable_codigo: cuenta.cuenta_contable_codigo,
    cuenta_contable_nombre: cuenta.cuenta_contable_nombre,
  };
}

export function formatCuentaContableDisplay(
  cuentaCodigo?: string | null,
  contabilidad?: string | null,
): string {
  const codigo = cuentaCodigo?.trim();
  const texto = contabilidad?.trim();
  if (texto) {
    if (codigo && !texto.startsWith(codigo)) return `${codigo} ${texto}`;
    return texto;
  }
  return codigo || "—";
}

export function formatMonedaPE(value: number | null | undefined): string {
  if (value == null) return "";
  return value.toLocaleString("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function categoriaBienCorto(categoria: CategoriaBien): string {
  return categoria === "CUENTA_ORDEN" ? "Cta Orden" : "Activo";
}

export function validarFechaDDMMYYYY(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    return "Use el formato DD/MM/AAAA.";
  }
  if (!parseFechaDDMMYYYY(trimmed)) {
    return "Fecha inválida.";
  }
  return null;
}

function parseFechaToDate(fecha: string | null): Date | null {
  if (!fecha?.trim()) return null;
  const iso = fecha.includes("/") ? parseFechaDDMMYYYY(fecha.trim()) : fecha.trim();
  if (!iso?.match(/^\d{4}-\d{2}-\d{2}$/)) return null;
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Meses transcurridos desde la fecha de adquisición hasta hoy */
export function calcPeriodoMeses(fechaAdquisicion: string | null): number {
  return calcPeriodoMesesHasta(fechaAdquisicion, new Date());
}

/** Meses transcurridos desde la fecha de adquisición hasta una fecha de corte */
export function calcPeriodoMesesHasta(fechaAdquisicion: string | null, fechaHasta: Date): number {
  const start = parseFechaToDate(fechaAdquisicion);
  if (!start) return 0;
  const end = new Date(fechaHasta.getFullYear(), fechaHasta.getMonth(), fechaHasta.getDate());
  return Math.max(
    0,
    (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()),
  );
}

/** Valor neto mínimo mientras el activo está vigente (no dado de baja). */
export const VALOR_NETO_MINIMO_ACTIVO = 1;

export function calcDepreciacionAcumulada(
  valor: number | null,
  vidaUtilMeses: number | null,
  periodoMeses: number,
  dadoDeBaja = false,
): number | null {
  if (valor == null || vidaUtilMeses == null || vidaUtilMeses <= 0) return null;
  const mensual = valor / vidaUtilMeses;
  const topeDepreciacion = dadoDeBaja
    ? valor
    : Math.max(0, valor - VALOR_NETO_MINIMO_ACTIVO);
  return Math.min(topeDepreciacion, mensual * periodoMeses);
}

export function calcValorNeto(
  valor: number | null,
  depreciacionAcumulada: number | null,
  dadoDeBaja = false,
): number | null {
  if (valor == null) return null;
  if (dadoDeBaja) return 0;
  if (depreciacionAcumulada == null) return null;
  const neto = valor - depreciacionAcumulada;
  if (valor <= VALOR_NETO_MINIMO_ACTIVO) return valor;
  return Math.max(VALOR_NETO_MINIMO_ACTIVO, neto);
}

/** Extrae el % anual de textos como "10 %", "10%" o "10,5 %". Acepta solo el número. */
export function parsePorcentajeDepreciacion(text: string): number | null {
  const normalized = text.replace(/\u00a0/g, " ").trim();
  const match = normalized.match(/^(\d+(?:[.,]\d+)?)\s*%?$/);
  if (!match) return null;
  const value = Number(match[1].replace(",", "."));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Vida útil en meses a partir de tasa anual lineal: 100 % ÷ tasa × 12 meses. */
export function vidaUtilMesesFromPorcentaje(porcentajeAnual: number): number {
  if (porcentajeAnual <= 0) return 0;
  return Math.round(1200 / porcentajeAnual);
}

/** Tasa anual equivalente a una vida útil en meses. */
export function porcentajeFromVidaUtilMeses(meses: number): number {
  if (meses <= 0) return 0;
  return Math.round((1200 / meses) * 100) / 100;
}

export function formatPorcentajeDepreciacion(porcentaje: number): string {
  const rounded = Math.round(porcentaje * 100) / 100;
  const texto = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2).replace(/\.?0+$/, "");
  return `${texto} %`;
}

function caracteristicasPartes(
  marca?: string | null,
  modelo?: string | null,
  serie?: string | null,
  color?: string | null,
  medidas?: string | null,
): string[] {
  const partes: string[] = [];
  if (marca?.trim()) partes.push(`marca: ${marca.trim()}`);
  if (modelo?.trim()) partes.push(`modelo: ${modelo.trim().toLowerCase()}`);
  if (serie?.trim()) partes.push(`serie: ${serie.trim().toLowerCase()}`);
  if (color?.trim()) partes.push(`color: ${color.trim().toLowerCase()}`);
  if (medidas?.trim()) partes.push(medidas.trim().toLowerCase());
  return partes;
}

/** Marca, modelo, serie, color y medidas en un solo texto (sin nombre del bien). */
export function buildDescripcionBien(
  marca?: string | null,
  modelo?: string | null,
  serie?: string | null,
  color?: string | null,
  medidas?: string | null,
): string {
  return caracteristicasPartes(marca, modelo, serie, color, medidas).join(", ");
}

export function estadoBienLabel(estado: EstadoBien): string {
  if (estado === "BUENO") return "Bueno";
  if (estado === "REGULAR") return "Regular";
  return "Malo";
}

/** Nombre del bien + marca, modelo, serie, color, medidas y detalle (en ese orden). */
export function buildNombreConsolidado(
  nombre: string,
  marca?: string | null,
  modelo?: string | null,
  serie?: string | null,
  color?: string | null,
  medidas?: string | null,
  detalle?: string | null,
): string {
  const base = nombre.trim().toUpperCase();
  if (!base) return "";

  const partes = caracteristicasPartes(marca, modelo, serie, color, medidas);
  const detalleTrim = detalle?.trim();
  if (detalleTrim) partes.push(detalleTrim);

  if (partes.length === 0) return base;
  return `${base} ${partes.join(", ")}`;
}

/** Serie de comprobante: mayúsculas; letras, números, guión, barra y espacios (ej. F/E001 - 0007). */
export function formatComprobanteSerieInput(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9/ -]/g, "");
}

export function normalizarSerieComprobante(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  return formatComprobanteSerieInput(value).replace(/\s+/g, " ").trim();
}

export function activoTieneComprobante(activo: {
  comprobante_path?: string | null;
  comprobante_serie?: string | null;
}): boolean {
  return Boolean(
    activo.comprobante_path?.trim() || activo.comprobante_serie?.trim(),
  );
}

export function seriesComprobanteDesdeActivos(
  activos: { comprobante_serie?: string | null }[],
): string[] {
  const series = new Set<string>();
  for (const a of activos) {
    const s = a.comprobante_serie?.trim();
    if (s) series.add(normalizarSerieComprobante(s));
  }
  return [...series].sort((a, b) => a.localeCompare(b));
}

export function anioAdquisicionActivo(fecha_adquisicion: string | null | undefined): number | null {
  if (!fecha_adquisicion?.trim()) return null;
  const y = Number(fecha_adquisicion.slice(0, 4));
  return Number.isFinite(y) ? y : null;
}

export function aniosAdquisicionDesdeActivos(
  activos: { fecha_adquisicion: string | null }[],
): number[] {
  const years = new Set<number>();
  for (const a of activos) {
    const y = anioAdquisicionActivo(a.fecha_adquisicion);
    if (y != null) years.add(y);
  }
  return [...years].sort((a, b) => b - a);
}

export function pasoFiltroAnioAdquisicion(
  fecha_adquisicion: string | null | undefined,
  anioFiltro: string,
): boolean {
  if (!anioFiltro) return true;
  return anioAdquisicionActivo(fecha_adquisicion) === Number(anioFiltro);
}

export function pasoFiltroSerieComprobante(
  activo: { comprobante_serie?: string | null },
  filtroSerie: string,
): boolean {
  const query = normalizarSerieComprobante(filtroSerie);
  if (!query) return true;
  const serie = normalizarSerieComprobante(activo.comprobante_serie);
  if (!serie) return false;
  return serie.includes(query);
}

export function formatMedidas(
  largo: number | null | undefined,
  ancho: number | null | undefined,
  altura: number | null | undefined,
): string {
  const parts = [largo, ancho, altura].filter((v) => v != null && !Number.isNaN(v));
  if (parts.length === 0) return "";
  return parts.join(" × ");
}

export type CatalogoOrigen = "NACIONAL" | "PROPIO";

export const CATALOGO_ORIGEN_LABELS: Record<CatalogoOrigen, string> = {
  NACIONAL: "Nacional (catálogo oficial SBN)",
  PROPIO: "Propio (extensión de la entidad)",
};

/** Mínimo de caracteres para buscar en catálogo (1 si solo dígitos, 2 si hay texto). */
export function minCatalogoQueryLength(query: string): number {
  return /^\d+$/.test(query.trim()) ? 1 : 2;
}

/** Tope de resultados en búsqueda de catálogo del picker (coincide con tope histórico RPC). */
export const CATALOGO_SEARCH_MAX_RESULTS = 50;

/** Tope de resultados en consulta de catálogo nacional (paginación UI de 25). */
export const CATALOGO_CONSULTA_MAX_RESULTS = 500;

/** Ítem del catálogo nacional SBN (tabla catalogo_nacional) */
export interface CuentaContable {
  codigo: string;
  nombre: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UpsertCuentaContableInput {
  codigo: string;
  nombre: string;
}

export function validarUpsertCuentaContableInput(input: UpsertCuentaContableInput): string | null {
  const codigo = normalizeCuentaCodigo(input.codigo);
  if (!codigo) {
    return "El código de cuenta contable debe tener entre 1 y 6 dígitos.";
  }
  if (!input.nombre?.trim()) {
    return "El nombre de la cuenta contable es obligatorio.";
  }
  return null;
}

/** Ítem del catálogo nacional SBN (tabla catalogo_nacional) */
export interface CatalogoNacional {
  codigo: string;
  denominacion: string;
  grupo: string | null;
  clase: string | null;
  cuenta_codigo: string | null;
  contabilidad: string | null;
  depreciacion: string | null;
  resolucion: string | null;
  estado: string | null;
  origen: CatalogoOrigen;
  created_at?: string;
}

export type CatalogoEstadoSbn = "ACTIVO" | "EXCLUIDO";

/** Prefijo de códigos propios (cuenta de orden) agregados por la entidad. */
export const CATALOGO_PROPIO_PREFIX = "BD";

export const CATALOGO_CUENTA_ORDEN_CONTABILIDAD = "2524";
export const CATALOGO_CUENTA_ORDEN_ESTADO: CatalogoEstadoSbn = "EXCLUIDO";

/** @deprecated Usar selección de clase en formulario; valor histórico por defecto. */
export const CATALOGO_CUENTA_ORDEN_CLASE = "25 OTROS SUMINISTROS";

export const CATALOGO_PROPIO_CODIGO_RE = /^BD\d{6}$/;

/** Grupos disponibles al dar de alta ítems propios (cuenta de orden). */
export const CATALOGO_GRUPOS_OPCIONES = [
  "04 AGRICOLA Y PESQUERO",
  "11 AIRE ACONDICIONADO Y REFRIGERACION",
  "18 ANIMALES",
  "25 ASEO Y LIMPIEZA",
  "32 COCINA Y COMEDOR",
  "39 CULTURA Y ARTE",
  "46 ELECTRICIDAD Y ELECTRONICA",
  "53 HOSPITALIZACION",
  "60 INSTRUMENTO DE MEDICION",
  "67 MAQUINARIA, VEHICULOS Y OTROS",
  "74 OFICINA",
  "81 RECREACION Y DEPORTE",
  "88 SEGURIDAD INDUSTRIAL",
  "95 TELECOMUNICACIONES",
] as const;

export function resolveCatalogoGrupos(extra?: string[]): string[] {
  const merged = new Set<string>(CATALOGO_GRUPOS_OPCIONES);
  for (const grupo of extra ?? []) {
    const t = grupo.trim();
    if (t) merged.add(t);
  }
  return [...merged].sort((a, b) => a.localeCompare(b, "es"));
}

/** Clases SBN disponibles al dar de alta ítems propios (cuenta de orden). */
export const CATALOGO_CLASES_OPCIONES = [
  "04 AERONAVE",
  "08 COMPUTO",
  "22 EQUIPO",
  "29 FERROCARRIL",
  "36 MAQUINARIA PESADA",
  "50 MAQUINA",
  "64 MOBILIARIO",
  "71 NAVE O ARTEFACTO NAVAL",
  "78 PRODUCCION Y SEGURIDAD",
  "82 VEHICULO",
] as const;

export function resolveCatalogoClases(extra?: string[]): string[] {
  const merged = new Set<string>(CATALOGO_CLASES_OPCIONES);
  for (const clase of extra ?? []) {
    const t = clase.trim();
    if (t) merged.add(t);
  }
  return [...merged].sort((a, b) => a.localeCompare(b, "es"));
}

export type CatalogoOpcionTipo = "grupo" | "clase";

export interface CatalogoCampoOpciones {
  opciones: string[];
  personalizadas: string[];
}

const CATALOGO_GRUPOS_PREDETERMINADOS = new Set<string>(CATALOGO_GRUPOS_OPCIONES);
const CATALOGO_CLASES_PREDETERMINADAS = new Set<string>(CATALOGO_CLASES_OPCIONES);

export function isCatalogoGrupoPredeterminado(grupo: string): boolean {
  return CATALOGO_GRUPOS_PREDETERMINADOS.has(grupo.trim());
}

export function isCatalogoClasePredeterminada(clase: string): boolean {
  return CATALOGO_CLASES_PREDETERMINADAS.has(clase.trim());
}

export function shouldRegistrarCatalogoOpcionPersonalizada(
  tipo: CatalogoOpcionTipo,
  valor: string,
): boolean {
  const texto = valor.trim();
  if (!texto) return false;
  return tipo === "grupo"
    ? !isCatalogoGrupoPredeterminado(texto)
    : !isCatalogoClasePredeterminada(texto);
}

export function buildCatalogoCampoOpciones(
  tipo: CatalogoOpcionTipo,
  personalizadas: string[],
  extras: string[] = [],
): CatalogoCampoOpciones {
  const mergedExtras = [...personalizadas, ...extras];
  const opciones =
    tipo === "grupo"
      ? resolveCatalogoGrupos(mergedExtras)
      : resolveCatalogoClases(mergedExtras);
  const personalizadasVisibles = personalizadas
    .map((v) => v.trim())
    .filter((v) => v && opciones.includes(v));
  return {
    opciones,
    personalizadas: [...new Set(personalizadasVisibles)].sort((a, b) =>
      a.localeCompare(b, "es"),
    ),
  };
}

export interface CreateCatalogoNacionalInput {
  codigo: string;
  denominacion: string;
  grupo?: string;
  clase?: string;
  cuenta_codigo?: string;
  contabilidad?: string;
  depreciacion?: string;
  resolucion?: string;
  estado: CatalogoEstadoSbn;
}

export function formatCodigoCatalogoPropio(secuencia: number): string {
  if (!Number.isInteger(secuencia) || secuencia < 1 || secuencia > 999_999) {
    throw new Error("Secuencia de catálogo propio fuera de rango.");
  }
  return `${CATALOGO_PROPIO_PREFIX}${String(secuencia).padStart(6, "0")}`;
}

export function parseCodigoCatalogoPropioSecuencia(codigo: string): number | null {
  const match = codigo.trim().match(/^BD(\d{6})$/);
  if (!match) return null;
  const secuencia = Number.parseInt(match[1], 10);
  return secuencia >= 1 ? secuencia : null;
}

export function nextCodigoCatalogoPropioFromMax(maxCodigo: string | null | undefined): string {
  if (!maxCodigo) return formatCodigoCatalogoPropio(1);
  const secuencia = parseCodigoCatalogoPropioSecuencia(maxCodigo);
  if (secuencia === null) return formatCodigoCatalogoPropio(1);
  return formatCodigoCatalogoPropio(secuencia + 1);
}

export function normalizeCatalogoDenominacion(value: string): string {
  return value.trim().replace(/\s+/g, " ").toUpperCase();
}

export function validarCreateCatalogoCuentaOrdenInput(
  input: CreateCatalogoNacionalInput,
): string | null {
  const codigo = input.codigo.trim();
  if (!CATALOGO_PROPIO_CODIGO_RE.test(codigo)) {
    return "El código debe tener el formato BD000001.";
  }
  if (!normalizeCatalogoDenominacion(input.denominacion)) {
    return "La denominación es obligatoria.";
  }
  if (!input.grupo?.trim()) {
    return "Seleccione un grupo del catálogo.";
  }
  if (!input.clase?.trim()) {
    return "Seleccione una clase del catálogo.";
  }
  return validarCuentaContableParaCatalogo(input.cuenta_codigo, input.contabilidad);
}

/** Cuenta contable del ítem propio: vacío → 2524 (cuenta de orden). */
export function resolveCatalogoPropioCuenta(
  cuentaCodigo?: string | null,
  nombre?: string | null,
): { cuenta_codigo: string | null; contabilidad: string | null } {
  const codigoRaw = cuentaCodigo?.trim() ?? "";
  const nombreRaw = nombre?.trim() ?? "";
  if (!codigoRaw && !nombreRaw) {
    return {
      cuenta_codigo: CATALOGO_CUENTA_ORDEN_CONTABILIDAD,
      contabilidad: null,
    };
  }
  return normalizeCuentaContableFields(cuentaCodigo, nombre);
}

export function validarCuentaContableParaCatalogo(
  cuentaCodigo?: string | null,
  nombre?: string | null,
  options?: { codigosEnMaestra?: readonly string[] },
): string | null {
  const codigoRaw = cuentaCodigo?.trim() ?? "";
  const nombreRaw = nombre?.trim() ?? "";
  if (!codigoRaw && !nombreRaw) return null;

  const cuenta = normalizeCuentaContableFields(cuentaCodigo, nombre);
  if (!cuenta.cuenta_codigo) {
    return "El código de cuenta contable debe tener entre 1 y 6 dígitos.";
  }

  const codigos = options?.codigosEnMaestra;
  if (codigos) {
    const existeEnMaestra = codigos.includes(cuenta.cuenta_codigo);
    const esCuentaOrden = cuenta.cuenta_codigo === CATALOGO_CUENTA_ORDEN_CONTABILIDAD;
    if (!existeEnMaestra && !esCuentaOrden && !nombreRaw) {
      return `Indique el nombre para crear la cuenta contable ${cuenta.cuenta_codigo}.`;
    }
  }

  return null;
}

export function buildCreateCatalogoCuentaOrdenPayload(
  input: CreateCatalogoNacionalInput,
): Omit<CatalogoNacional, "created_at"> {
  const cuentaContable = resolveCatalogoPropioCuenta(input.cuenta_codigo, input.contabilidad);

  return {
    codigo: input.codigo.trim(),
    denominacion: normalizeCatalogoDenominacion(input.denominacion),
    grupo: input.grupo!.trim(),
    clase: input.clase!.trim(),
    cuenta_codigo: cuentaContable.cuenta_codigo,
    contabilidad: cuentaContable.contabilidad,
    depreciacion: null,
    resolucion: null,
    estado: CATALOGO_CUENTA_ORDEN_ESTADO,
    origen: "PROPIO",
  };
}

export function normalizeCodigoCatalogoNacional(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length >= CODIGO_BARRAS_CATALOGO_DIGITS) {
    return digits.slice(0, CODIGO_BARRAS_CATALOGO_DIGITS);
  }
  return digits.padStart(CODIGO_BARRAS_CATALOGO_DIGITS, "0");
}

export function validarCreateCatalogoNacionalExtensionInput(
  input: CreateCatalogoNacionalInput,
): string | null {
  const codigo = normalizeCodigoCatalogoNacional(input.codigo.trim());
  if (!/^\d{8}$/.test(codigo)) {
    return "El código debe tener 8 dígitos (catálogo nacional SBN).";
  }
  if (CATALOGO_PROPIO_CODIGO_RE.test(input.codigo.trim())) {
    return "Use el catálogo propio para códigos BD…";
  }
  if (!normalizeCatalogoDenominacion(input.denominacion)) {
    return "La denominación es obligatoria.";
  }
  if (!input.grupo?.trim()) {
    return "Seleccione un grupo del catálogo.";
  }
  if (!input.clase?.trim()) {
    return "Seleccione una clase del catálogo.";
  }
  return validarCuentaContableParaCatalogo(input.cuenta_codigo, input.contabilidad);
}

export function buildCreateCatalogoNacionalExtensionPayload(
  input: CreateCatalogoNacionalInput,
): Omit<CatalogoNacional, "created_at"> {
  const cuenta = normalizeCuentaContableFields(input.cuenta_codigo, input.contabilidad);

  return {
    codigo: normalizeCodigoCatalogoNacional(input.codigo),
    denominacion: normalizeCatalogoDenominacion(input.denominacion),
    grupo: input.grupo!.trim(),
    clase: input.clase!.trim(),
    cuenta_codigo: cuenta.cuenta_codigo,
    contabilidad: cuenta.contabilidad,
    depreciacion: input.depreciacion?.trim() || null,
    resolucion: input.resolucion?.trim() || null,
    estado: "ACTIVO",
    origen: "NACIONAL",
  };
}

export interface UpdateCatalogoPropioInput {
  denominacion: string;
  grupo: string;
  clase: string;
  cuenta_codigo?: string | null;
  contabilidad?: string | null;
}

export interface UpdateCatalogoNacionalContabilidadInput {
  cuenta_codigo?: string | null;
  contabilidad?: string | null;
  depreciacion?: string | null;
}

export function buildUpdateCatalogoNacionalContabilidadPayload(
  input: UpdateCatalogoNacionalContabilidadInput,
) {
  const cuenta = normalizeCuentaContableFields(input.cuenta_codigo, input.contabilidad);
  return {
    cuenta_codigo: cuenta.cuenta_codigo,
    contabilidad: cuenta.contabilidad,
    depreciacion: input.depreciacion?.trim() || null,
  };
}

export function validarUpdateCatalogoPropioInput(input: UpdateCatalogoPropioInput): string | null {
  if (!normalizeCatalogoDenominacion(input.denominacion)) {
    return "La denominación es obligatoria.";
  }
  if (!input.grupo?.trim()) {
    return "Seleccione un grupo del catálogo.";
  }
  if (!input.clase?.trim()) {
    return "Seleccione una clase del catálogo.";
  }
  return validarCuentaContableParaCatalogo(input.cuenta_codigo, input.contabilidad);
}

export function buildUpdateCatalogoPropioPayload(input: UpdateCatalogoPropioInput) {
  const cuentaContable = resolveCatalogoPropioCuenta(input.cuenta_codigo, input.contabilidad);

  return {
    denominacion: normalizeCatalogoDenominacion(input.denominacion),
    grupo: input.grupo.trim(),
    clase: input.clase.trim(),
    cuenta_codigo: cuentaContable.cuenta_codigo,
    contabilidad: cuentaContable.contabilidad,
    estado: CATALOGO_CUENTA_ORDEN_ESTADO,
  };
}

export function isCatalogoPropio(item: Pick<CatalogoNacional, "codigo" | "origen">): boolean {
  return item.origen === "PROPIO" || CATALOGO_PROPIO_CODIGO_RE.test(item.codigo.trim());
}

export function isCatalogoNacionalOficial(
  item: Pick<CatalogoNacional, "codigo" | "origen">,
): boolean {
  return !isCatalogoPropio(item);
}

export function suggestGrupoFromCatalogoItems(items: CatalogoNacional[]): string | null {
  const counts = new Map<string, number>();
  for (const item of items) {
    const grupo = item.grupo?.trim();
    if (!grupo) continue;
    counts.set(grupo, (counts.get(grupo) ?? 0) + 1);
  }

  let mejor: string | null = null;
  let mejorConteo = 0;
  for (const [grupo, conteo] of counts) {
    if (conteo > mejorConteo) {
      mejor = grupo;
      mejorConteo = conteo;
    }
  }
  return mejor;
}

/** Coincide palabras de la denominación con nombres de grupo del catálogo. */
export function suggestGrupoByDenominacionKeywords(
  denominacion: string,
  grupos: string[],
): string | null {
  const tokens = normalizeCatalogoDenominacion(denominacion)
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 3);

  if (tokens.length === 0) return null;

  let mejor: string | null = null;
  let mejorPuntaje = 0;

  for (const grupo of grupos) {
    const grupoLower = grupo.toLowerCase();
    let puntaje = 0;
    for (const token of tokens) {
      if (grupoLower.includes(token)) puntaje += token.length;
    }
    if (puntaje > mejorPuntaje) {
      mejor = grupo;
      mejorPuntaje = puntaje;
    }
  }

  return mejor;
}

export function suggestGrupoForDenominacion(
  denominacion: string,
  catalogItems: CatalogoNacional[],
  grupos?: string[],
): string | null {
  const lista = resolveCatalogoGrupos(grupos);
  return (
    suggestGrupoFromCatalogoItems(catalogItems) ??
    suggestGrupoByDenominacionKeywords(denominacion, lista)
  );
}

/** @deprecated Usar validarCreateCatalogoCuentaOrdenInput para ítems propios. */
export function validarCreateCatalogoInput(input: CreateCatalogoNacionalInput): string | null {
  return validarCreateCatalogoCuentaOrdenInput(input);
}

export function buildCreateCatalogoPayload(
  input: CreateCatalogoNacionalInput,
): Omit<CatalogoNacional, "created_at"> {
  return buildCreateCatalogoCuentaOrdenPayload(input);
}

export interface HistorialCambio {
  id: string;
  activo_id: string;
  entidad_id: string;
  usuario_id: string;
  accion: string;
  campo: string | null;
  valor_anterior: string | null;
  valor_nuevo: string | null;
  created_at: string;
}

export function homePathForRole(rol: RolUsuario): string {
  return rol === "ADMIN_ENTIDAD" ? "/admin/portal" : "/contador/portal";
}

export type UsuarioGestionResumen = Pick<Profile, "id" | "rol" | "activo" | "nombre" | "email">;

export function countContadoresActivos(usuarios: UsuarioGestionResumen[]): number {
  return usuarios.filter((u) => u.rol === "CONTADOR" && u.activo).length;
}

export function validarDesactivarUsuario(input: {
  target: UsuarioGestionResumen;
  actorId: string;
  usuarios: UsuarioGestionResumen[];
}): string | null {
  const { target, actorId, usuarios } = input;
  if (!target.activo) return "El usuario ya está inactivo.";
  if (target.id === actorId) return "No puede desactivar su propio usuario.";
  if (target.rol === "CONTADOR" && countContadoresActivos(usuarios) <= 1) {
    return "Debe quedar al menos un contador activo en el sistema.";
  }
  return null;
}

export function validarReactivarUsuario(target: UsuarioGestionResumen): string | null {
  if (target.activo) return "El usuario ya está activo.";
  return null;
}

export function validarEliminarUsuario(input: {
  target: UsuarioGestionResumen;
  actorId: string;
  activosVinculados: number;
  historialVinculado: number;
}): string | null {
  const { target, actorId, activosVinculados, historialVinculado } = input;
  if (target.id === actorId) return "No puede eliminar su propio usuario.";
  if (target.activo) return "Desactive el usuario antes de eliminarlo.";
  if (activosVinculados > 0) {
    return `No se puede eliminar: ${activosVinculados} activo(s) registrados por este usuario.`;
  }
  if (historialVinculado > 0) {
    return `No se puede eliminar: ${historialVinculado} registro(s) en el historial asociados a este usuario.`;
  }
  return null;
}

export const APP_NAME = "Inventario de Activos Fijos";
export const APP_CLIENT = "B&D Consultores Global EIRL";

export {
  MAX_IMPORT_ACTIVOS_FILAS,
  IMPORT_ACTIVOS_COLUMN_ERROR,
  IMPORT_ACTIVOS_HEADERS,
  buildCuentaContableLookup,
  buildUbicacionLookup,
  emptyImportActivoFila,
  importErrorFilaFromItem,
  mapImportHeaders,
  normalizeImportDepreciacionRaw,
  normalizeImportKey,
  validateImportActivoFila,
  type ImportActivoCatalogoContabilidadUpdate,
  type ImportActivoCatalogoItem,
  type ImportActivoErrorFila,
  type ImportActivoErrorItem,
  type ImportActivoFila,
  type ImportActivoHeader,
  type ImportActivoInsertPayload,
  type ImportActivosResult,
  type ImportUbicacionRef,
} from "./import-activos";

export {
  MAX_IMPORT_AMBIENTES_FILAS,
  IMPORT_AMBIENTES_COLUMN_ERROR,
  IMPORT_AMBIENTES_HEADERS,
  buildExistingAmbienteKeys,
  buildResponsableDniLookup,
  buildResponsableNombreLookup,
  buildSedeLookup,
  emptyImportAmbienteFila,
  findPrincipalSede,
  importAmbienteErrorFilaFromItem,
  isPrincipalSedeNombre,
  mapImportAmbienteHeaders,
  parseImportAmbienteFila,
  validateImportAmbienteDuplicado,
  type ImportAmbienteErrorFila,
  type ImportAmbienteErrorItem,
  type ImportAmbienteExistingRef,
  type ImportAmbienteFila,
  type ImportAmbienteHeader,
  type ImportAmbienteInsertPayload,
  type ImportAmbienteResponsableRef,
  type ImportAmbienteRowData,
  type ImportAmbienteSedeRef,
  type ImportAmbientesContext,
  type ImportAmbientesResult,
} from "./import-ambientes";

export {
  assessLabelPrintWarnings,
  describeLabelPrintWarning,
  estimateTextWidthDots,
  fitLabelLine,
  fitLabelPrintLine,
  formatLabelPrintWarnings,
  LABEL_FIT_FONT_STEPS,
  LABEL_PRINT_LAYOUT_FONTS,
  LABEL_PRINT_WIDTH_DOTS,
  entidadNombreRequiereEtiquetaOverride,
  nombreRequiereEtiquetaOverride,
  resolveNombreEtiqueta,
  sanitizeLabelPrintText,
  suggestNombreEtiqueta,
  type FitLabelLineOptions,
  type LabelFitFont,
  type LabelLineFit,
  type LabelPrintField,
  type LabelPrintWarning,
} from "./label-text";

export {
  OBSERVACION_ADMIN_SEPARATOR,
  resolveObservacionAdmin,
  mergeObservacionActivo,
  splitObservacionActivo,
  type ObservacionActivoPartes,
} from "./observacion-activo";

export {
  buildHistorialEventos,
  collectHistorialLookupIds,
  formatHistorialValor,
  groupHistorialItems,
  labelHistorialCampo,
  type HistorialActivoCambio,
  type HistorialActivoEvento,
  type HistorialActivoEventoTipo,
  type HistorialActivoItem,
  type HistorialLookupMaps,
} from "./historial-activo";

export {
  buildClasificacionResumen,
  buildValorizacionTotales,
  cuentaGrupoActivoValorizacion,
  type ActivoValorizacionFuente,
  type ClasificacionResumen,
  type ValorizacionTotales,
} from "./clasificacion-resumen";

export {
  BD_PORTAL_CONTACTO,
  BD_PORTAL_ESTUDIO,
  BD_PORTAL_FOOTER_INSTITUCIONAL,
  BD_PORTAL_INTRO,
  BD_PORTAL_LOGIN_HINT,
  BD_PORTAL_RAZON_SOCIAL,
  adminPortalPath,
  contadorGestionInventariosPath,
  contadorPortalHomePath,
  contadorPortalPath,
  BD_PORTAL_HERO_DARK,
  BD_PORTAL_HERO_LIGHT,
  displayContadorNombre,
  isGenericContadorNombre,
  validarNombreContador,
} from "./bd-portal";
