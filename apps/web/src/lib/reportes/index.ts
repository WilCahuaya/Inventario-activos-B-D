import { exportReporteExcel } from "./excel";
import { exportReportePdf } from "./pdf";
import type { ActivoReporte, ReporteContexto, ReporteFormato } from "./types";

export * from "./types";
export { REPORTES } from "./types";
export { buildReporteRows, reporteHeaders, reporteTitulo } from "./rows";

export async function exportReporte(
  formato: ReporteFormato,
  activos: ActivoReporte[],
  ctx: ReporteContexto,
): Promise<void> {
  if (activos.length === 0) {
    throw new Error("No hay registros para el reporte seleccionado.");
  }
  if (formato === "pdf") {
    await exportReportePdf(activos, ctx);
  } else {
    await exportReporteExcel(activos, ctx);
  }
}
