import type { Ambiente, Sede, SedeConConteo } from "@inventario/types";
import { getSupabaseClient } from "./supabase";

export { listEntidades } from "./entidades";

export type AmbienteConSede = Ambiente & {
  sede_nombre: string;
  sede_es_principal: boolean;
  activo_count: number;
};

async function activoCountByAmbienteIds(
  ambienteIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (ambienteIds.length === 0) return counts;

  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("activos")
    .select("ambiente_id")
    .in("ambiente_id", ambienteIds);

  for (const row of data ?? []) {
    const ambienteId = row.ambiente_id as string | null;
    if (!ambienteId) continue;
    counts.set(ambienteId, (counts.get(ambienteId) ?? 0) + 1);
  }
  return counts;
}

export interface CreateAmbienteInput {
  sedeId: string;
  nombre: string;
  descripcion?: string;
  responsableId?: string | null;
}

export async function listSedes(entidadId: string): Promise<Sede[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("sedes")
    .select("*")
    .eq("entidad_id", entidadId)
    .eq("activo", true)
    .order("nombre");

  if (error) throw new Error(error.message);
  return (data ?? []) as Sede[];
}

export async function listAmbientes(sedeId: string): Promise<Ambiente[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("ambientes")
    .select("*")
    .eq("sede_id", sedeId)
    .eq("activo", true)
    .eq("es_preregistro", false)
    .order("nombre");

  if (error) throw new Error(error.message);
  return (data ?? []) as Ambiente[];
}

export async function getAmbientePreregistro(entidadId: string): Promise<Ambiente | null> {
  const supabase = getSupabaseClient();
  const { data: ambienteId, error } = await supabase.rpc("ensure_ambiente_preregistro", {
    p_entidad_id: entidadId,
  });

  if (error || !ambienteId) return null;

  const { data } = await supabase
    .from("ambientes")
    .select("*")
    .eq("id", ambienteId as string)
    .maybeSingle();

  return (data as Ambiente) ?? null;
}

export async function listAmbientesPorEntidad(entidadId: string): Promise<AmbienteConSede[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("ambientes")
    .select("*, sedes!inner(nombre, es_principal, entidad_id)")
    .eq("activo", true)
    .eq("sedes.entidad_id", entidadId)
    .order("nombre");

  if (error) throw new Error(error.message);

  const mapped = (data ?? []).map((row) => {
    const sede = row.sedes as { nombre: string; es_principal: boolean } | null;
    const { sedes: _, ...ambiente } = row;
    return {
      ...(ambiente as Ambiente),
      sede_nombre: sede?.nombre ?? "",
      sede_es_principal: sede?.es_principal ?? false,
      activo_count: 0,
    };
  });

  const activoCounts = await activoCountByAmbienteIds(mapped.map((ambiente) => ambiente.id));

  const withCounts = mapped.map((ambiente) => ({
    ...ambiente,
    activo_count: activoCounts.get(ambiente.id) ?? 0,
  }));

  return withCounts.sort((a, b) => {
    if (a.es_preregistro !== b.es_preregistro) return a.es_preregistro ? -1 : 1;
    if (a.sede_es_principal !== b.sede_es_principal) return a.sede_es_principal ? -1 : 1;
    if (a.sede_nombre !== b.sede_nombre) return a.sede_nombre.localeCompare(b.sede_nombre);
    return a.nombre.localeCompare(b.nombre);
  });
}

export async function createAmbiente(
  input: CreateAmbienteInput,
): Promise<{ data?: Ambiente; error?: string }> {
  const trimmed = input.nombre.trim();
  if (!trimmed) return { error: "Nombre de ambiente obligatorio." };

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("ambientes")
    .insert({
      sede_id: input.sedeId,
      nombre: trimmed,
      descripcion: input.descripcion?.trim() || null,
      responsable_id: input.responsableId || null,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as Ambiente };
}

export async function updateAmbiente(
  ambienteId: string,
  input: Omit<CreateAmbienteInput, "sedeId">,
): Promise<{ success?: true; error?: string }> {
  const trimmed = input.nombre.trim();
  if (!trimmed) return { error: "Nombre de ambiente obligatorio." };

  const supabase = getSupabaseClient();
  const { data: existing } = await supabase
    .from("ambientes")
    .select("es_preregistro")
    .eq("id", ambienteId)
    .maybeSingle();

  if (existing?.es_preregistro) {
    return { error: "El ambiente de preregistros no se puede editar." };
  }

  const { error } = await supabase
    .from("ambientes")
    .update({
      nombre: trimmed,
      descripcion: input.descripcion?.trim() || null,
      responsable_id: input.responsableId ?? null,
    })
    .eq("id", ambienteId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteAmbiente(
  ambienteId: string,
): Promise<{ success?: true; error?: string }> {
  const supabase = getSupabaseClient();

  const { data: existing } = await supabase
    .from("ambientes")
    .select("es_preregistro")
    .eq("id", ambienteId)
    .maybeSingle();

  if (existing?.es_preregistro) {
    return { error: "El ambiente de preregistros no se puede eliminar." };
  }

  const { count } = await supabase
    .from("activos")
    .select("*", { count: "exact", head: true })
    .eq("ambiente_id", ambienteId);

  if ((count ?? 0) > 0) {
    return { error: "No puede eliminar un ambiente que tiene activos registrados." };
  }

  const { error } = await supabase
    .from("ambientes")
    .update({ activo: false })
    .eq("id", ambienteId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function listSedesConConteo(entidadId: string): Promise<SedeConConteo[]> {
  const sedes = await listSedes(entidadId);
  const supabase = getSupabaseClient();

  const sorted = [...sedes].sort((a, b) => {
    if (a.es_principal !== b.es_principal) return a.es_principal ? -1 : 1;
    return a.nombre.localeCompare(b.nombre);
  });

  const result: SedeConConteo[] = [];
  for (const sede of sorted) {
    const { count } = await supabase
      .from("ambientes")
      .select("*", { count: "exact", head: true })
      .eq("sede_id", sede.id)
      .eq("activo", true);
    result.push({ ...sede, ambiente_count: count ?? 0 });
  }
  return result;
}

export async function createSede(
  entidadId: string,
  nombre: string,
): Promise<{ data?: Sede; error?: string }> {
  const trimmed = nombre.trim();
  if (!trimmed) return { error: "Nombre de sucursal obligatorio." };
  if (trimmed.toLowerCase() === "principal") {
    return { error: 'Use otro nombre; "Principal" está reservado.' };
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("sedes")
    .insert({ entidad_id: entidadId, nombre: trimmed, es_principal: false })
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as Sede };
}

export async function updateSede(
  sedeId: string,
  nombre: string,
): Promise<{ success?: true; error?: string }> {
  const trimmed = nombre.trim();
  if (!trimmed) return { error: "Nombre obligatorio." };

  const supabase = getSupabaseClient();
  const { data: sede } = await supabase.from("sedes").select("*").eq("id", sedeId).single();
  if (!sede) return { error: "Sucursal no encontrada." };
  if ((sede as Sede).es_principal) return { error: "La sucursal Principal no se puede editar." };

  const { error } = await supabase.from("sedes").update({ nombre: trimmed }).eq("id", sedeId);
  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteSede(sedeId: string): Promise<{ success?: true; error?: string }> {
  const supabase = getSupabaseClient();
  const { data: sede } = await supabase.from("sedes").select("*").eq("id", sedeId).single();
  if (!sede) return { error: "Sucursal no encontrada." };
  if ((sede as Sede).es_principal) return { error: "La sucursal Principal no se puede eliminar." };

  const { count } = await supabase
    .from("ambientes")
    .select("*", { count: "exact", head: true })
    .eq("sede_id", sedeId)
    .eq("activo", true);

  if ((count ?? 0) > 0) {
    return { error: "Solo puede eliminar sucursales sin ambientes asociados." };
  }

  const { error } = await supabase.from("sedes").update({ activo: false }).eq("id", sedeId);
  if (error) return { error: error.message };
  return { success: true };
}
