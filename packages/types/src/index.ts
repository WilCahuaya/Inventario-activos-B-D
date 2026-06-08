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
