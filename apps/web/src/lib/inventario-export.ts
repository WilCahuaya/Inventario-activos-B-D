import type { Activo } from "@inventario/types";
import { exportReporte, type ActivoReporte } from "@/lib/reportes";

/** @deprecated Use exportReporte from @/lib/reportes */
export const INVENTARIO_EXPORT_HEADERS = [
  "N°",
  "Cant.",
  "Und.",
  "Cat.",
  "Código",
  "Corr.",
  "Nombre del bien",
  "Descripción",
  "Fecha adq.",
  "Estado",
  "Precio adq.",
  "V. mercado",
  "% Deprec.",
  "Periodo",
  "Dep. acum.",
  "Valor neto",
  "Observación",
  "CP",
] as const;

export interface InventarioExportMeta {
  ambienteNombre: string;
  responsable?: string | null;
  entidadNombre?: string;
  usuarioNombre?: string;
  usuarioEmail?: string;
  fechaCorte?: string;
}

function toActivoReporte(activo: Activo, meta: InventarioExportMeta): ActivoReporte {
  return {
    ...activo,
    entidad_nombre: meta.entidadNombre,
    ambiente_nombre: meta.ambienteNombre,
  };
}

function buildContext(meta: InventarioExportMeta, reporteId: "inventario_ambiente_valorizado" | "inventario_ambiente_sin_valores") {
  const hoy = new Date().toISOString().slice(0, 10);
  return {
    reporteId,
    entidadNombre: meta.entidadNombre ?? "Entidad",
    ambienteNombre: meta.ambienteNombre,
    responsable: meta.responsable,
    usuarioNombre: meta.usuarioNombre ?? "Usuario",
    usuarioEmail: meta.usuarioEmail ?? "",
    fechaGeneracion: new Date(),
    fechaCorte: meta.fechaCorte ?? hoy,
  };
}

export async function exportInventarioExcel(
  activos: Activo[],
  meta: InventarioExportMeta,
  valorizado = true,
): Promise<void> {
  const reporteId = valorizado ? "inventario_ambiente_valorizado" : "inventario_ambiente_sin_valores";
  const rows = activos.map((a) => toActivoReporte(a, meta));
  await exportReporte("excel", rows, buildContext(meta, reporteId));
}

export async function exportInventarioPdf(
  activos: Activo[],
  meta: InventarioExportMeta,
  valorizado = true,
): Promise<void> {
  const reporteId = valorizado ? "inventario_ambiente_valorizado" : "inventario_ambiente_sin_valores";
  const rows = activos.map((a) => toActivoReporte(a, meta));
  await exportReporte("pdf", rows, buildContext(meta, reporteId));
}

