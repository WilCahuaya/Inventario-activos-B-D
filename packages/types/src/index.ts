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
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Sede {
  id: string;
  entidad_id: string;
  nombre: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ambiente {
  id: string;
  sede_id: string;
  nombre: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
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

/** Meses transcurridos desde la fecha de adquisición hasta hoy */
export function calcPeriodoMeses(fechaAdquisicion: string | null): number {
  if (!fechaAdquisicion) return 0;
  const start = new Date(fechaAdquisicion);
  const now = new Date();
  if (Number.isNaN(start.getTime())) return 0;
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

export function buildNombreConsolidado(
  nombre: string,
  descripcion?: string | null,
  caracteristicas?: string | null,
): string {
  return [nombre.trim(), descripcion?.trim(), caracteristicas?.trim()].filter(Boolean).join(" — ");
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
