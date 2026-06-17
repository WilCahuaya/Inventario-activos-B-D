import { formatFechaISOToDDMMYYYY } from "@inventario/types";
import { EMPRESA } from "./branding";
import { reporteTitulo } from "./rows";
import type { ReporteContexto } from "./types";
import { REPORTES } from "./types";

export function fechaCortaHora(d: Date): string {
  const fecha = formatFechaISOToDDMMYYYY(d.toISOString().slice(0, 10)) ?? "";
  const hora = d.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" });
  return `${fecha} ${hora}`;
}

export interface ReporteInstitutionalHeader {
  titulo: string;
  razonSocial: string;
  productoRuc: string;
  generado: string;
  fechaCorte: string;
  metaLine: string;
  usuarioLine: string;
}

export function buildInstitutionalHeader(
  ctx: ReporteContexto,
  totalRegistros: number,
): ReporteInstitutionalHeader {
  const def = REPORTES.find((r) => r.id === ctx.reporteId)!;
  const metaParts: string[] = [`Entidad: ${ctx.entidadNombre}`];

  if (def.scope === "ambiente") {
    if (ctx.sedeNombre) metaParts.push(`Sede: ${ctx.sedeNombre}`);
    if (ctx.ambienteNombre) metaParts.push(`Ambiente: ${ctx.ambienteNombre}`);
    if (ctx.responsable?.trim()) metaParts.push(`Responsable: ${ctx.responsable.trim()}`);
  }
  metaParts.push(`Registros: ${totalRegistros}`);

  return {
    titulo: reporteTitulo(ctx.reporteId, def.valorizado),
    razonSocial: EMPRESA.razonSocial,
    productoRuc: `${EMPRESA.producto}  ·  RUC ${EMPRESA.ruc}`,
    generado: `Generado: ${fechaCortaHora(ctx.fechaGeneracion)}`,
    fechaCorte: `Fecha de corte: ${formatFechaISOToDDMMYYYY(ctx.fechaCorte) || ctx.fechaCorte}`,
    metaLine: metaParts.join("   |   "),
    usuarioLine: `${ctx.usuarioNombre} · ${ctx.usuarioEmail}`,
  };
}
