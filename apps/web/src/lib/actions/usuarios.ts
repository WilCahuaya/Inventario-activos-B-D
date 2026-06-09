"use server";

import type { Profile } from "@inventario/types";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/profile";

export interface ProfileConEntidad extends Profile {
  entidad_nombre?: string | null;
}

export async function listUsuarios(): Promise<ProfileConEntidad[]> {
  await requireProfile("CONTADOR");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*, entidades(nombre)")
    .order("nombre");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const { entidades, ...profile } = row as Profile & {
      entidades: { nombre: string } | null;
    };
    return {
      ...profile,
      entidad_nombre: entidades?.nombre ?? null,
    };
  });
}
