import { formatFechaISOToDDMMYYYY } from "@inventario/types";
import { EMPRESA } from "./branding";
import {
  buildReporteRows,
  buildValorizacionTotalesFila,
  esReporteInventarioValorizado,
  reporteHeaders,
  reporteTitulo,
} from "./rows";
import {
  CLASIFICACION_HEADERS,
  buildClasificacionResumen,
  buildValorizacionTotales,
  clasificacionToRows,
  clasificacionTotalRow,
} from "./summary";
import type { ActivoReporte, ReporteContexto } from "./types";
import { REPORTES } from "./types";

function slugFilename(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 48);
}

export async function exportReporteExcel(
  activos: ActivoReporte[],
  ctx: ReporteContexto,
): Promise<void> {
  const XLSX = await import("xlsx");
  const def = REPORTES.find((r) => r.id === ctx.reporteId)!;
  const fechaCorte = new Date(ctx.fechaCorte + "T12:00:00");
  const titulo = reporteTitulo(ctx.reporteId, def.valorizado);
  const headers = reporteHeaders(ctx.reporteId, def.valorizado);
  const rows = buildReporteRows(activos, ctx.reporteId, def.valorizado, fechaCorte);

  const metaParts = [
    `Entidad: ${ctx.entidadNombre}`,
    def.scope === "ambiente" && ctx.sedeNombre ? `Sede: ${ctx.sedeNombre}` : null,
    def.scope === "ambiente" && ctx.ambienteNombre ? `Ambiente: ${ctx.ambienteNombre}` : null,
    def.scope === "ambiente" && ctx.responsable?.trim()
      ? `Responsable: ${ctx.responsable.trim()}`
      : null,
    `Registros: ${activos.length}`,
  ].filter(Boolean) as string[];

  const inventarioValorizado = esReporteInventarioValorizado(ctx.reporteId);
  const totales =
    inventarioValorizado && activos.length > 0
      ? buildValorizacionTotales(activos, fechaCorte)
      : null;

  const metaRows: string[][] = [
    [EMPRESA.razonSocial],
    [`${EMPRESA.producto}  ·  RUC ${EMPRESA.ruc}`],
    [titulo],
    [metaParts.join("   |   ")],
    [
      `Generado: ${ctx.fechaGeneracion.toLocaleString("es-PE")}   |   Corte: ${formatFechaISOToDDMMYYYY(ctx.fechaCorte) || ctx.fechaCorte}   |   ${ctx.usuarioNombre} (${ctx.usuarioEmail})`,
    ],
    [],
    [...headers],
    ...rows,
  ];

  if (totales) {
    metaRows.push(buildValorizacionTotalesFila(headers, totales));
  }

  if (def.valorizado && activos.length > 0) {
    const resumen = buildClasificacionResumen(activos, fechaCorte);
    const totalesResumen = totales ?? buildValorizacionTotales(activos, fechaCorte);
    metaRows.push(
      [],
      ["Resumen por clasificación contable"],
      [...CLASIFICACION_HEADERS],
      ...clasificacionToRows(resumen),
      clasificacionTotalRow(totalesResumen),
    );
  }

  const ws = XLSX.utils.aoa_to_sheet(metaRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Reporte");
  const slug = slugFilename(ctx.ambienteNombre ?? ctx.entidadNombre);
  const fecha = ctx.fechaGeneracion.toISOString().slice(0, 10);
  XLSX.writeFile(wb, `reporte-${ctx.reporteId}-${slug}-${fecha}.xlsx`);
}
