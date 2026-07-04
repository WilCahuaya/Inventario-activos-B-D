"use server";

import { revalidatePath } from "next/cache";
import type { Ambiente, Sede, SedeConConteo } from "@inventario/types";
import { createClient } from "@/lib/supabase/server";
import { loadSedesForEntidad } from "@/lib/sede-principal-direccion";
import { getProfile, requireProfile } from "@/lib/auth/profile";

function revalidateEntidad(entidadId: string, sedeId?: string) {
  revalidatePath("/contador/entidades");
  revalidatePath(`/contador/entidades/${entidadId}`);
  revalidatePath(`/contador/entidades/${entidadId}/responsables`);
  if (sedeId) {
    revalidatePath(`/contador/entidades/${entidadId}/sedes/${sedeId}`);
    revalidatePath(`/admin/sedes/${sedeId}`);
  }
  revalidatePath("/admin/activos");
  revalidatePath("/admin/responsables");
  revalidatePath("/admin");
}

export async function getSedePrincipal(entidadId: string): Promise<Sede | null> {
  const supabase = await createClient();
  const sedes = await loadSedesForEntidad(supabase, entidadId);
  return sedes.find((sede) => sede.es_principal) ?? null;
}

export async function getSede(sedeId: string): Promise<Sede | null> {
  const profile = await getProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sedes")
    .select("*")
    .eq("id", sedeId)
    .eq("activo", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as Sede;
}

/** Asegura el ambiente sistema de preregistros (nombre con año actual) y lo devuelve. */
export async function getAmbientePreregistro(entidadId: string): Promise<Ambiente | null> {
  const profile = await getProfile();
  if (!profile) return null;

  const supabase = await createClient();
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

export async function listSedesConConteo(entidadId: string): Promise<SedeConConteo[]> {
  const profile = await getProfile();
  if (!profile) return [];

  const supabase = await createClient();
  const sedes = await loadSedesForEntidad(supabase, entidadId);

  const sorted = sedes.sort((a, b) => {
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

export async function listSedes(entidadId: string): Promise<Sede[]> {
  const profile = await getProfile();
  if (!profile) return [];

  const supabase = await createClient();
  return loadSedesForEntidad(supabase, entidadId);
}

export type AmbienteConSede = Ambiente & {
  sede_nombre: string;
  sede_es_principal: boolean;
  activo_count: number;
};

async function activoCountByAmbienteIds(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ambienteIds: string[],
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (ambienteIds.length === 0) return counts;

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

export async function listAmbientesPorEntidad(
  entidadId: string,
  sedeId?: string,
): Promise<AmbienteConSede[]> {
  const profile = await getProfile();
  if (!profile) return [];

  const supabase = await createClient();
  let query = supabase
    .from("ambientes")
    .select("*, sedes!inner(nombre, es_principal, entidad_id)")
    .eq("activo", true);

  if (sedeId) {
    query = query.eq("sede_id", sedeId);
  } else {
    query = query.eq("sedes.entidad_id", entidadId);
  }

  const { data, error } = await query.order("nombre");

  if (error || !data) return [];

  const mapped = data.map((row) => {
    const sede = row.sedes as { nombre: string; es_principal: boolean } | null;
    const { sedes: _, ...ambiente } = row;
    return {
      ...(ambiente as Ambiente),
      sede_nombre: sede?.nombre ?? "",
      sede_es_principal: sede?.es_principal ?? false,
      activo_count: 0,
    };
  });

  const activoCounts = await activoCountByAmbienteIds(
    supabase,
    mapped.map((ambiente) => ambiente.id),
  );

  const withCounts = mapped.map((ambiente) => ({
    ...ambiente,
    activo_count: activoCounts.get(ambiente.id) ?? 0,
  }));

  return withCounts.sort((a, b) => {
    if (a.es_preregistro !== b.es_preregistro) return a.es_preregistro ? -1 : 1;
    if (a.sede_es_principal !== b.sede_es_principal) {
      return a.sede_es_principal ? -1 : 1;
    }
    if (a.sede_nombre !== b.sede_nombre) {
      return a.sede_nombre.localeCompare(b.sede_nombre);
    }
    return a.nombre.localeCompare(b.nombre);
  });
}

export async function listAmbientes(sedeId: string): Promise<Ambiente[]> {
  const profile = await getProfile();
  if (!profile) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ambientes")
    .select("*")
    .eq("sede_id", sedeId)
    .eq("activo", true)
    .eq("es_preregistro", false)
    .order("nombre");

  if (error) return [];
  return (data ?? []) as Ambiente[];
}

export async function getAmbiente(ambienteId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ambientes")
    .select("*, sedes(entidad_id, nombre)")
    .eq("id", ambienteId)
    .eq("activo", true)
    .maybeSingle();

  if (!data) return null;
  const sede = data.sedes as { entidad_id: string; nombre: string } | null;
  const { sedes: _, ...ambiente } = data;
  return {
    ambiente: ambiente as Ambiente,
    entidad_id: sede?.entidad_id ?? "",
    sede_nombre: sede?.nombre ?? "",
  };
}

export async function createSede(entidadId: string, nombre: string, direccion?: string) {
  await requireProfile("CONTADOR");
  const trimmed = nombre.trim();
  if (!trimmed) return { error: "Nombre de sucursal obligatorio." };
  if (trimmed.toLowerCase() === "principal") {
    return { error: 'Use otro nombre; "Principal" está reservado.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sedes")
    .insert({
      entidad_id: entidadId,
      nombre: trimmed,
      direccion: direccion?.trim() || null,
      es_principal: false,
    })
    .select()
    .single();

  if (error) return { error: error.message };
  revalidateEntidad(entidadId);
  return { success: true, data: data as Sede };
}

export async function updateSede(sedeId: string, nombre: string, direccion?: string) {
  await requireProfile("CONTADOR");
  const trimmed = nombre.trim();
  if (!trimmed) return { error: "Nombre obligatorio." };

  const supabase = await createClient();
  const { data: sede } = await supabase.from("sedes").select("*").eq("id", sedeId).single();
  if (!sede) return { error: "Sucursal no encontrada." };
  if ((sede as Sede).es_principal) return { error: "La sucursal Principal no se puede editar." };

  const { error } = await supabase
    .from("sedes")
    .update({
      nombre: trimmed,
      direccion: direccion?.trim() || null,
    })
    .eq("id", sedeId);
  if (error) return { error: error.message };

  revalidateEntidad((sede as Sede).entidad_id);
  return { success: true };
}

export async function deleteSede(sedeId: string) {
  await requireProfile("CONTADOR");
  const supabase = await createClient();
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

  revalidateEntidad((sede as Sede).entidad_id);
  return { success: true };
}

export interface CreateAmbienteInput {
  sedeId: string;
  nombre: string;
  descripcion?: string;
  responsableId?: string | null;
}

export async function createAmbiente(input: CreateAmbienteInput) {
  const profile = await getProfile();
  if (!profile) return { error: "Sesión no válida." };

  const trimmed = input.nombre.trim();
  if (!trimmed) return { error: "Nombre de ambiente obligatorio." };

  const supabase = await createClient();
  const { data: sede } = await supabase
    .from("sedes")
    .select("entidad_id")
    .eq("id", input.sedeId)
    .single();

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

  if (sede?.entidad_id) revalidateEntidad(sede.entidad_id as string);
  revalidatePath(`/contador/entidades/${sede?.entidad_id}/ambientes/${data.id}`);
  return { success: true, data: data as Ambiente };
}

/** Crea ambiente en la sede Principal de la entidad */
export async function createAmbienteEnPrincipal(
  entidadId: string,
  input: Omit<CreateAmbienteInput, "sedeId">,
) {
  const principal = await getSedePrincipal(entidadId);
  if (!principal) return { error: "No existe sede Principal para esta entidad." };
  return createAmbiente({ ...input, sedeId: principal.id });
}

export async function updateAmbiente(
  ambienteId: string,
  input: Omit<CreateAmbienteInput, "sedeId">,
) {
  const profile = await getProfile();
  if (!profile) return { error: "Sesión no válida." };
  if (profile.rol !== "CONTADOR" && profile.rol !== "ADMIN_ENTIDAD") {
    return { error: "No autorizado." };
  }

  const trimmed = input.nombre.trim();
  if (!trimmed) return { error: "Nombre de ambiente obligatorio." };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("ambientes")
    .select("id, sede_id, es_preregistro")
    .eq("id", ambienteId)
    .eq("activo", true)
    .single();

  if (!existing) return { error: "Ambiente no encontrado." };
  if ((existing as Ambiente).es_preregistro) {
    return { error: "El ambiente de preregistros no se puede editar." };
  }

  if (profile.rol === "ADMIN_ENTIDAD") {
    const { data: sedeRow } = await supabase
      .from("sedes")
      .select("entidad_id")
      .eq("id", existing.sede_id)
      .maybeSingle();
    if (!sedeRow || sedeRow.entidad_id !== profile.entidad_id) {
      return { error: "No autorizado." };
    }
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

  const { data: sede } = await supabase
    .from("sedes")
    .select("entidad_id")
    .eq("id", existing.sede_id)
    .single();
  const entidadId = sede?.entidad_id as string | undefined;
  if (entidadId) revalidateEntidad(entidadId);
  revalidatePath(`/contador/entidades/${entidadId}/ambientes/${ambienteId}`);
  return { success: true };
}

export async function deleteAmbiente(ambienteId: string) {
  await requireProfile("CONTADOR");
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("ambientes")
    .select("id, sede_id, es_preregistro")
    .eq("id", ambienteId)
    .eq("activo", true)
    .single();

  if (!existing) return { error: "Ambiente no encontrado." };
  if ((existing as Ambiente).es_preregistro) {
    return { error: "El ambiente de preregistros no se puede eliminar." };
  }

  const { count } = await supabase
    .from("activos")
    .select("*", { count: "exact", head: true })
    .eq("ambiente_id", ambienteId);

  if ((count ?? 0) > 0) {
    return { error: "No puede eliminar un ambiente que tiene activos registrados." };
  }

  const { error } = await supabase.from("ambientes").update({ activo: false }).eq("id", ambienteId);
  if (error) return { error: error.message };

  const { data: sede } = await supabase
    .from("sedes")
    .select("entidad_id")
    .eq("id", existing.sede_id)
    .single();
  const entidadId = sede?.entidad_id as string | undefined;
  if (entidadId) revalidateEntidad(entidadId);
  return { success: true };
}
