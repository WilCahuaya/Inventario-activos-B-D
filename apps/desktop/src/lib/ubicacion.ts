import type { Ambiente, Sede, SedeConConteo } from "@inventario/types";
import { getSupabaseClient } from "./supabase";

export { listEntidades } from "./entidades";

export type AmbienteConSede = Ambiente & {
  sede_nombre: string;
  sede_es_principal: boolean;
};

export interface CreateAmbienteInput {
  sedeId: string;
  nombre: string;
  descripcion?: string;
  responsable?: string;
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
    .order("nombre");

  if (error) throw new Error(error.message);
  return (data ?? []) as Ambiente[];
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
    };
  });

  return mapped.sort((a, b) => {
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
      responsable: input.responsable?.trim() || null,
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
  const { error } = await supabase
    .from("ambientes")
    .update({
      nombre: trimmed,
      descripcion: input.descripcion?.trim() || null,
      responsable: input.responsable?.trim() || null,
    })
    .eq("id", ambienteId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteAmbiente(
  ambienteId: string,
): Promise<{ success?: true; error?: string }> {
  const supabase = getSupabaseClient();

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
