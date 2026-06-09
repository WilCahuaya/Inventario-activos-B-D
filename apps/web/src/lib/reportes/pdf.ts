import { formatFechaISOToDDMMYYYY, formatMonedaPE } from "@inventario/types";
import { EMPRESA } from "./branding";
import { addPdfLogoWatermark, getBrandLogoPngDataUrl } from "./logo-watermark";
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

function fechaCortaHora(d: Date): string {
  const fecha = formatFechaISOToDDMMYYYY(d.toISOString().slice(0, 10)) ?? "";
  const hora = d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  return `${fecha} ${hora}`;
}

type JsPDFDoc = import("jspdf").jsPDF;

/** Totales: tono claro distinto al encabezado, texto oscuro para buena legibilidad. */
const TOTAL_ROW_STYLES = {
  fillColor: [186, 230, 253] as [number, number, number],
  textColor: [15, 52, 96] as [number, number, number],
  fontStyle: "bold" as const,
  fontSize: 7,
};

function addInstitutionalHeader(
  doc: JsPDFDoc,
  ctx: ReporteContexto,
  titulo: string,
  totalRegistros: number,
  startY = 10,
): number {
  const def = REPORTES.find((r) => r.id === ctx.reporteId)!;
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 10;
  let y = startY;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(EMPRESA.razonSocial, margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.text(`Generado: ${fechaCortaHora(ctx.fechaGeneracion)}`, pageW - margin, y, {
    align: "right",
  });
  y += 4;

  doc.text(`${EMPRESA.producto}  ·  RUC ${EMPRESA.ruc}`, margin, y);
  const corte = formatFechaISOToDDMMYYYY(ctx.fechaCorte) || ctx.fechaCorte;
  doc.text(`Fecha de corte: ${corte}`, pageW - margin, y, { align: "right" });
  y += 5;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(titulo, margin, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  const metaIzq: string[] = [`Entidad: ${ctx.entidadNombre}`];
  if (def.scope === "ambiente") {
    if (ctx.sedeNombre) metaIzq.push(`Sede: ${ctx.sedeNombre}`);
    if (ctx.ambienteNombre) metaIzq.push(`Ambiente: ${ctx.ambienteNombre}`);
    if (ctx.responsable?.trim()) metaIzq.push(`Responsable: ${ctx.responsable.trim()}`);
  }
  metaIzq.push(`Registros: ${totalRegistros}`);

  doc.text(metaIzq.join("   |   "), margin, y, { maxWidth: pageW - margin * 2 });
  y += 4;

  doc.setFontSize(7);
  doc.setTextColor(90, 90, 90);
  doc.text(`${ctx.usuarioNombre} · ${ctx.usuarioEmail}`, margin, y);
  doc.setTextColor(0, 0, 0);

  return y + 3;
}

function addPageNumbers(doc: JsPDFDoc) {
  const total = doc.getNumberOfPages();

  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    doc.text(`Página ${i} de ${total}`, pageW - 10, pageH - 8, { align: "right" });
  }
}

function addActaFirmas(doc: JsPDFDoc, y: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const colGap = 10;
  const colWidth = (pageW - margin * 2 - colGap * 2) / 3;
  let startY = y + 10;
  if (startY > pageH - 38) {
    doc.addPage();
    startY = 30;
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Conformidad y firmas", margin, startY);
  startY += 9;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const bloques = ["Contador / Auditor", "Representante de la entidad", "Fecha"];
  const labelY = startY;
  const lineY = startY + 12;

  bloques.forEach((titulo, index) => {
    const x = margin + index * (colWidth + colGap);
    doc.text(titulo, x, labelY, { maxWidth: colWidth });
    doc.text("_________________________", x, lineY, { maxWidth: colWidth });
  });

  doc.setFontSize(8);
  doc.text(
    "Las partes declaran haber verificado físicamente los bienes detallados en el presente acta.",
    margin,
    lineY + 12,
    { maxWidth: pageW - margin * 2 },
  );
}

export async function exportReportePdf(
  activos: ActivoReporte[],
  ctx: ReporteContexto,
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const def = REPORTES.find((r) => r.id === ctx.reporteId)!;
  const fechaCorte = new Date(ctx.fechaCorte + "T12:00:00");
  const titulo = reporteTitulo(ctx.reporteId, def.valorizado);
  const headers = reporteHeaders(ctx.reporteId, def.valorizado);
  const rows = buildReporteRows(activos, ctx.reporteId, def.valorizado, fechaCorte);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  let logoPng: string | null = null;
  try {
    logoPng = await getBrandLogoPngDataUrl();
  } catch {
    /* sin marca de agua si falla la rasterización del SVG */
  }

  const startY = addInstitutionalHeader(doc, ctx, titulo, activos.length);
  const inventarioValorizado = esReporteInventarioValorizado(ctx.reporteId);
  const totales =
    inventarioValorizado && activos.length > 0
      ? buildValorizacionTotales(activos, fechaCorte)
      : null;

  autoTable(doc, {
    head: [[...headers]],
    body: rows,
    foot: totales ? [buildValorizacionTotalesFila(headers, totales)] : undefined,
    showFoot: totales ? "lastPage" : undefined,
    startY,
    styles: { fontSize: 6, cellPadding: 1 },
    headStyles: { fillColor: [30, 64, 120], fontSize: 6 },
    footStyles: TOTAL_ROW_STYLES,
    margin: { left: 10, right: 10, top: 8, bottom: 14 },
  });

  const finalY = (doc as JsPDFDoc & { lastAutoTable?: { finalY: number } }).lastAutoTable
    ?.finalY;

  if (def.valorizado && activos.length > 0) {
    const resumen = buildClasificacionResumen(activos, fechaCorte);
    const totalesResumen = totales ?? buildValorizacionTotales(activos, fechaCorte);
    const resumenY = (finalY ?? startY) + 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Resumen por clasificación contable", 10, resumenY);
    autoTable(doc, {
      head: [[...CLASIFICACION_HEADERS]],
      body: clasificacionToRows(resumen).map((row) =>
        row.map((cell, i) =>
          i >= 3 ? `S/ ${formatMonedaPE(Number(cell))}` : cell,
        ),
      ),
      foot: [
        clasificacionTotalRow(totalesResumen).map((cell, i) =>
          i >= 3 ? `S/ ${formatMonedaPE(Number(cell))}` : cell,
        ),
      ],
      showFoot: "lastPage",
      startY: resumenY + 4,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [71, 85, 105] },
      footStyles: TOTAL_ROW_STYLES,
      margin: { left: 10, right: 10, bottom: 14 },
    });
  }

  if (ctx.reporteId === "acta_inventario") {
    const actaY =
      (doc as JsPDFDoc & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ??
      startY;
    addActaFirmas(doc, actaY);
  }

  if (logoPng) {
    addPdfLogoWatermark(doc, logoPng);
  }
  addPageNumbers(doc);

  const slug = slugFilename(ctx.ambienteNombre ?? ctx.entidadNombre);
  const fecha = ctx.fechaGeneracion.toISOString().slice(0, 10);
  doc.save(`reporte-${ctx.reporteId}-${slug}-${fecha}.pdf`);
}
