"use server";

import type { Ambiente, Sede } from "@inventario/types";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/profile";

export async function listSedes(entidadId: string): Promise<Sede[]> {
  const profile = await getProfile();
  if (!profile) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sedes")
    .select("*")
    .eq("entidad_id", entidadId)
    .eq("activo", true)
    .order("nombre");

  if (error) return [];
  return (data ?? []) as Sede[];
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
    .order("nombre");

  if (error) return [];
  return (data ?? []) as Ambiente[];
}

export async function createSede(entidadId: string, nombre: string) {
  const profile = await getProfile();
  if (!profile) return { error: "Sesión no válida." };

  const trimmed = nombre.trim();
  if (!trimmed) return { error: "Nombre de sede obligatorio." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sedes")
    .insert({ entidad_id: entidadId, nombre: trimmed })
    .select()
    .single();

  if (error) return { error: error.message };
  return { success: true, data: data as Sede };
}

export async function createAmbiente(sedeId: string, nombre: string) {
  const profile = await getProfile();
  if (!profile) return { error: "Sesión no válida." };

  const trimmed = nombre.trim();
  if (!trimmed) return { error: "Nombre de ambiente obligatorio." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ambientes")
    .insert({ sede_id: sedeId, nombre: trimmed })
    .select()
    .single();

  if (error) return { error: error.message };
  return { success: true, data: data as Ambiente };
}
