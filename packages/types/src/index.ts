/** Roles del sistema MVP */
export type RolUsuario = "CONTADOR" | "ADMIN_ENTIDAD";

/** Ciclo de vida del registro del activo */
export type EstadoRegistro = "PREREGISTRADO" | "REGISTRADO" | "DADO_DE_BAJA";

/** Estado físico del bien */
export type EstadoBien = "BUENO" | "REGULAR" | "MALO";

/** Categoría contable del bien */
export type CategoriaBien = "ACTIVO" | "CUENTA_ORDEN";

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
  ruc: string | null;
  direccion: string | null;
  admin_nombre: string | null;
  admin_email: string | null;
  admin_telefono: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Sede {
  id: string;
  entidad_id: string;
  nombre: string;
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
  responsable: string | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface SedeConConteo extends Sede {
  ambiente_count: number;
}

export interface Activo {
  id: string;
  entidad_id: string;
  sede_id: string | null;
  ambiente_id: string | null;
  codigo_catalogo: string;
  correlativo: number | null;
  codigo_barras: string | null;
  nombre: string;
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
  motivo_baja: string | null;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export const CATEGORIA_BIEN_LABELS: Record<
  CategoriaBien,
  { titulo: string; descripcion: string }
> = {
  CUENTA_ORDEN: {
    titulo: "Cta. Orden",
    descripcion:
      "Bienes menores que duran más de un año, pero por su valor no califican como activo. Ej.: silla de plástico, sartén, tacho de basura, balón de gas.",
  },
  ACTIVO: {
    titulo: "Activo",
    descripcion:
      "Bien con vida útil mayor a 1 año y potencial de servicio; costo importante. Ej.: equipo de cómputo, horno a gas, cocina, escritorio.",
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

/** Formatea dígitos al escribir: 06062026 → 06/06/2026 */
export function formatFechaInputDDMMYYYY(value: string): string {
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

/** Correlativo con ceros (6 dígitos por defecto, ej. 000001). */
export function formatCorrelativoDisplay(correlativo: number | null, digits = 6): string {
  if (correlativo == null) return "";
  return String(correlativo).padStart(digits, "0");
}

/** Código completo catálogo-correlativo (ej. 74080500-000001). */
export function formatCorrelativoCompleto(
  codigoCatalogo: string,
  correlativo: number | null,
): string {
  if (correlativo == null || !codigoCatalogo.trim()) return "";
  return formatCodigoBarras({ codigo_catalogo: codigoCatalogo.trim(), correlativo });
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
  const start = parseFechaToDate(fechaAdquisicion);
  if (!start) return 0;
  const now = new Date();
  return Math.max(
    0,
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()),
  );
}

export function calcDepreciacionAcumulada(
  valor: number | null,
  vidaUtilMeses: number | null,
  periodoMeses: number,
): number | null {
  if (valor == null || vidaUtilMeses == null || vidaUtilMeses <= 0) return null;
  const mensual = valor / vidaUtilMeses;
  return Math.min(valor, mensual * periodoMeses);
}

export function calcValorNeto(valor: number | null, depreciacionAcumulada: number | null): number | null {
  if (valor == null || depreciacionAcumulada == null) return null;
  return Math.max(0, valor - depreciacionAcumulada);
}

/** Extrae el % anual de textos como "10 %", "10%" o "10,5 %". */
export function parsePorcentajeDepreciacion(text: string): number | null {
  const normalized = text.replace(/\u00a0/g, " ").trim();
  const match = normalized.match(/(\d+(?:[.,]\d+)?)\s*%/);
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
  if (modelo?.trim()) partes.push(`modelo: ${modelo.trim()}`);
  if (serie?.trim()) partes.push(`serie: ${serie.trim()}`);
  if (color?.trim()) partes.push(`color: ${color.trim()}`);
  if (medidas?.trim()) partes.push(medidas.trim());
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

/** Nombre del bien + marca, modelo, serie, color y medidas (en ese orden). */
export function buildNombreConsolidado(
  nombre: string,
  marca?: string | null,
  modelo?: string | null,
  serie?: string | null,
  color?: string | null,
  medidas?: string | null,
): string {
  const base = nombre.trim();
  if (!base) return "";

  const partes = caracteristicasPartes(marca, modelo, serie, color, medidas);
  if (partes.length === 0) return base;
  return `${base} ${partes.join(", ")}`;
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
  created_at?: string;
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
  return rol === "ADMIN_ENTIDAD" ? "/admin" : "/contador";
}

/** Formato propuesto Code 128 — Fase 0 */
export interface CodigoBarrasPayload {
  codigo_catalogo: string;
  correlativo: number;
}

/** Genera string para Code 128: catálogo-correlativo (6 dígitos) */
export function formatCodigoBarras(payload: CodigoBarrasPayload): string {
  const correlativo = String(payload.correlativo).padStart(6, "0");
  return `${payload.codigo_catalogo}-${correlativo}`;
}

/** Parsea código escaneado; retorna null si formato inválido */
export function parseCodigoBarras(codigo: string): CodigoBarrasPayload | null {
  const match = codigo.trim().match(/^([A-Za-z0-9]+)-(\d{1,6})$/);
  if (!match) return null;
  return {
    codigo_catalogo: match[1],
    correlativo: parseInt(match[2], 10),
  };
}

export const APP_NAME = "Inventario de Activos Fijos";
export const APP_CLIENT = "B&D Consultores Global EIRL";
