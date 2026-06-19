"use server";

import type { EstadoRegistro } from "@inventario/types";
import { createClient } from "@/lib/supabase/server";
import { getProfile, requireProfile } from "@/lib/auth/profile";
import type { ActivoReporte } from "@/lib/reportes/types";
import { REPORTES, reportePermitidoParaRol, type ReporteId } from "@/lib/reportes/types";

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
  const profile = await getProfile();
  if (!profile) return { error: "Sesión no válida." };

  if (!input.entidadId) return { error: "Seleccione una entidad." };

  if (profile.rol === "ADMIN_ENTIDAD" && profile.entidad_id !== input.entidadId) {
    return { error: "No autorizado para esta entidad." };
  }

  if (!reportePermitidoParaRol(input.reporteId as ReporteId, profile.rol)) {
    return { error: "Este reporte no está disponible para su rol." };
  }

  const supabase = await createClient();
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

export async function getEntidadesParaReportes() {
  const profile = await requireProfile();
  const supabase = await createClient();

  if (profile.rol === "ADMIN_ENTIDAD") {
    const { data } = await supabase
      .from("entidades")
      .select("*")
      .eq("id", profile.entidad_id!)
      .eq("activo", true)
      .maybeSingle();
    return data ? [data] : [];
  }

  if (profile.rol !== "CONTADOR") {
    throw new Error("FORBIDDEN");
  }

  const { data, error } = await supabase
    .from("entidades")
    .select("*")
    .eq("activo", true)
    .order("nombre");

  if (error) throw new Error(error.message);
  return data ?? [];
}
