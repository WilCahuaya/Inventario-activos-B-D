import type { Activo } from "@inventario/types";
import {
  buildDescripcionBien,
  calcDepreciacionAcumulada,
  calcPeriodoMeses,
  calcValorNeto,
  categoriaBienCorto,
  estadoBienLabel,
  formatCorrelativoDisplay,
  formatFechaISOToDDMMYYYY,
  formatMonedaPE,
} from "@inventario/types";

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

function comprobanteExport(activo: Activo): string {
  const serie = activo.comprobante_serie?.trim();
  if (!serie && !activo.comprobante_path) return "SIN CP";
  return serie ?? "PDF adjunto";
}

export function buildInventarioExportRows(activos: Activo[]): string[][] {
  return activos.map((activo, index) => {
    const descripcion = buildDescripcionBien(
      activo.marca,
      activo.modelo,
      activo.serie,
      activo.color,
      activo.medidas,
    );
    const precioAdq = !activo.valor_es_mercado ? activo.valor_adquisicion : null;
    const valorMercado = activo.valor_es_mercado ? activo.valor_adquisicion : null;
    const periodo = calcPeriodoMeses(activo.fecha_adquisicion);
    const depAcum = calcDepreciacionAcumulada(
      activo.valor_adquisicion,
      activo.vida_util_meses,
      periodo,
    );
    const valorNeto = calcValorNeto(activo.valor_adquisicion, depAcum);

    return [
      String(index + 1),
      "1",
      "Und.",
      categoriaBienCorto(activo.categoria),
      activo.codigo_catalogo,
      formatCorrelativoDisplay(activo.correlativo),
      activo.nombre,
      descripcion || "—",
      formatFechaISOToDDMMYYYY(activo.fecha_adquisicion) || "—",
      estadoBienLabel(activo.estado_bien),
      precioAdq != null ? `S/ ${formatMonedaPE(precioAdq)}` : "—",
      valorMercado != null ? `S/ ${formatMonedaPE(valorMercado)}` : "—",
      activo.depreciacion?.trim() || "—",
      periodo > 0 ? periodo.toFixed(2).replace(".", ",") : "—",
      depAcum != null ? `S/ ${formatMonedaPE(depAcum)}` : "—",
      valorNeto != null ? `S/ ${formatMonedaPE(valorNeto)}` : "—",
      activo.observacion?.trim() || "—",
      comprobanteExport(activo),
    ];
  });
}

function slugFilename(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 40);
}

function exportFilename(ambienteNombre: string, ext: "xlsx" | "pdf"): string {
  const fecha = new Date().toISOString().slice(0, 10);
  return `inventario-${slugFilename(ambienteNombre) || "ambiente"}-${fecha}.${ext}`;
}

export interface InventarioExportMeta {
  ambienteNombre: string;
  responsable?: string | null;
  entidadNombre?: string;
}

export async function exportInventarioExcel(
  activos: Activo[],
  meta: InventarioExportMeta,
): Promise<void> {
  const XLSX = await import("xlsx");
  const rows = buildInventarioExportRows(activos);
  const headerRows: string[][] = [
    ["INVENTARIO DE ACTIVOS DEL AMBIENTE"],
    ...(meta.entidadNombre ? [[`Entidad: ${meta.entidadNombre}`]] : []),
    [`Ambiente: ${meta.ambienteNombre}`],
    [`Responsable: ${meta.responsable?.trim() || "—"}`],
    [`Total activos: ${activos.length}`],
    [],
    [...INVENTARIO_EXPORT_HEADERS],
    ...rows,
  ];

  const ws = XLSX.utils.aoa_to_sheet(headerRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inventario");
  XLSX.writeFile(wb, exportFilename(meta.ambienteNombre, "xlsx"));
}

export async function exportInventarioPdf(
  activos: Activo[],
  meta: InventarioExportMeta,
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const rows = buildInventarioExportRows(activos);

  doc.setFontSize(12);
  doc.text("Inventario de activos del ambiente", 14, 14);
  doc.setFontSize(9);
  let y = 20;
  if (meta.entidadNombre) {
    doc.text(`Entidad: ${meta.entidadNombre}`, 14, y);
    y += 5;
  }
  doc.text(`Ambiente: ${meta.ambienteNombre}`, 14, y);
  y += 5;
  doc.text(`Responsable: ${meta.responsable?.trim() || "—"}`, 14, y);
  y += 5;
  doc.text(`Total activos: ${activos.length}`, 14, y);

  autoTable(doc, {
    head: [[...INVENTARIO_EXPORT_HEADERS]],
    body: rows,
    startY: y + 4,
    styles: { fontSize: 6, cellPadding: 1 },
    headStyles: { fillColor: [59, 89, 152], fontSize: 6 },
    margin: { left: 10, right: 10 },
  });

  doc.save(exportFilename(meta.ambienteNombre, "pdf"));
}
