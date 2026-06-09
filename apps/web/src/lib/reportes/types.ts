import type { Activo } from "@inventario/types";

export type ReporteId =
  | "inventario_ambiente_sin_valores"
  | "inventario_entidad_sin_valores"
  | "inventario_ambiente_valorizado"
  | "inventario_entidad_valorizado"
  | "acta_inventario"
  | "reporte_bajas";

export type ReporteFormato = "pdf" | "excel";

export type ReporteScope = "ambiente" | "entidad";

export interface ReporteDefinicion {
  id: ReporteId;
  label: string;
  descripcion: string;
  scope: ReporteScope;
  valorizado: boolean;
  formatos: ReporteFormato[];
  soloContador?: boolean;
}

export const REPORTES: ReporteDefinicion[] = [
  {
    id: "inventario_ambiente_sin_valores",
    label: "Inventario por ambiente (sin valores)",
    descripcion: "Listado físico del ambiente sin columnas monetarias.",
    scope: "ambiente",
    valorizado: false,
    formatos: ["pdf", "excel"],
  },
  {
    id: "inventario_entidad_sin_valores",
    label: "Inventario general por entidad (sin valores)",
    descripcion: "Todos los activos registrados de la entidad, sin valores.",
    scope: "entidad",
    valorizado: false,
    formatos: ["pdf", "excel"],
  },
  {
    id: "inventario_ambiente_valorizado",
    label: "Inventario valorizado por ambiente",
    descripcion: "Incluye precio, depreciación acumulada y valor neto.",
    scope: "ambiente",
    valorizado: true,
    formatos: ["pdf", "excel"],
  },
  {
    id: "inventario_entidad_valorizado",
    label: "Inventario valorizado por entidad",
    descripcion: "Inventario completo de la entidad con valores.",
    scope: "entidad",
    valorizado: true,
    formatos: ["pdf", "excel"],
  },
  {
    id: "acta_inventario",
    label: "Acta de inventario",
    descripcion: "Documento PDF con espacios para firmas.",
    scope: "entidad",
    valorizado: false,
    formatos: ["pdf"],
    soloContador: true,
  },
  {
    id: "reporte_bajas",
    label: "Reporte de bajas",
    descripcion: "Activos dados de baja con motivo y fecha.",
    scope: "entidad",
    valorizado: false,
    formatos: ["pdf", "excel"],
    soloContador: true,
  },
];

export interface ActivoReporte extends Activo {
  entidad_nombre?: string;
  sede_nombre?: string;
  ambiente_nombre?: string;
  cuenta_contable?: string | null;
  grupo_contable?: string | null;
}

export interface ReporteContexto {
  reporteId: ReporteId;
  entidadNombre: string;
  ambienteNombre?: string | null;
  sedeNombre?: string | null;
  responsable?: string | null;
  usuarioNombre: string;
  usuarioEmail: string;
  fechaGeneracion: Date;
  fechaCorte: string;
}

export interface ClasificacionResumen {
  cuenta: string;
  grupo: string;
  cantidad: number;
  valorAdquisicion: number;
  depreciacionAcumulada: number;
  valorNeto: number;
}

export interface ValorizacionTotales {
  cantidad: number;
  valorAdquisicion: number;
  depreciacionAcumulada: number;
  valorNeto: number;
}
