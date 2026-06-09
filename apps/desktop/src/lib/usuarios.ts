import type { Profile } from "@inventario/types";
import { fetchProfile } from "./profile";
import { getSupabaseClient } from "./supabase";

export interface ProfileConEntidad extends Profile {
  entidad_nombre?: string | null;
}

export async function listUsuarios(): Promise<{ data?: ProfileConEntidad[]; error?: string }> {
  const profile = await fetchProfile();
  if (!profile) return { error: "Sesión no válida." };
  if (profile.rol !== "CONTADOR") return { error: "No autorizado." };

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*, entidades(nombre)")
    .order("nombre");

  if (error) return { error: error.message };

  const usuarios = (data ?? []).map((row) => {
    const { entidades, ...rest } = row as Profile & {
      entidades: { nombre: string } | null;
    };
    return {
      ...rest,
      entidad_nombre: entidades?.nombre ?? null,
    };
  });

  return { data: usuarios };
}
