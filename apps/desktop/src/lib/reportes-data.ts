import type { EstadoRegistro } from "@inventario/types";
import { REPORTES } from "@reportes/types";
import type { ActivoReporte } from "@reportes/types";
import { getSupabaseClient } from "./supabase";

function esReportePorAmbiente(reporteId: string): boolean {
  const def = REPORTES.find((r) => r.id === reporteId);
  return def?.scope === "ambiente";
}

function mapActivoReporteRows(data: Record<string, unknown>[] | null): ActivoReporte[] {
  return (data ?? []).map((row) => {
    const entidades = row.entidades as { nombre: string } | null;
    const sedes = row.sedes as { nombre: string } | null;
    const ambientes = row.ambientes as { nombre: string; responsable?: string | null } | null;
    const catalogo = row.catalogo_nacional as
      | { cuenta_codigo: string | null; grupo: string | null }
      | null
      | Array<{ cuenta_codigo: string | null; grupo: string | null }>;
    const cat = Array.isArray(catalogo) ? catalogo[0] : catalogo;
    const { entidades: _e, sedes: _s, ambientes: _a, catalogo_nacional: _c, ...activo } = row;
    return {
      ...(activo as unknown as ActivoReporte),
      entidad_nombre: entidades?.nombre,
      sede_nombre: sedes?.nombre,
      ambiente_nombre: ambientes?.nombre,
      cuenta_contable: cat?.cuenta_codigo ?? null,
      grupo_contable: cat?.grupo ?? null,
    };
  });
}

export interface CargarActivosReporteInput {
  reporteId: string;
  entidadId: string;
  ambienteId?: string;
  sedeId?: string;
}

export async function cargarActivosReporte(
  input: CargarActivosReporteInput,
): Promise<{ data?: ActivoReporte[]; error?: string }> {
  if (!input.entidadId) return { error: "Seleccione una entidad." };

  const supabase = getSupabaseClient();
  let query = supabase
    .from("activos")
    .select(
      "*, entidades(nombre), sedes:sede_id(nombre), ambientes:ambiente_id(nombre, responsable), catalogo_nacional:codigo_catalogo(cuenta_codigo, grupo)",
    )
    .eq("entidad_id", input.entidadId)
    .order("codigo_catalogo")
    .order("correlativo", { ascending: true });

  if (esReportePorAmbiente(input.reporteId)) {
    if (input.sedeId) query = query.eq("sede_id", input.sedeId);
    if (input.ambienteId) query = query.eq("ambiente_id", input.ambienteId);
  }

  if (input.reporteId === "reporte_bajas") {
    query = query.eq("estado_registro", "DADO_DE_BAJA" as EstadoRegistro);
  } else {
    query = query.eq("estado_registro", "REGISTRADO" as EstadoRegistro);
  }

  const { data, error } = await query;
  if (error) return { error: error.message };

  return { data: mapActivoReporteRows(data as Record<string, unknown>[]) };
}

export type { ActivoReporte, ReporteFormato, ReporteId } from "@reportes/types";
export {
  REPORTES,
  REPORTE_PREVIEW_MAX_ROWS,
  buildReporteResumenPreview,
  buildReporteRows,
  exportReporte,
  reporteHeaders,
  reportesDisponiblesParaRol,
  reportesAmbienteParaRol,
} from "@reportes";
