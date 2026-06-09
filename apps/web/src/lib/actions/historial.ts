"use server";

import type { HistorialCambio } from "@inventario/types";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/profile";

export interface HistorialConUsuario extends HistorialCambio {
  usuario_nombre?: string;
}

export async function listHistorialActivo(activoId: string): Promise<HistorialConUsuario[]> {
  const profile = await getProfile();
  if (!profile) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("historial_cambios")
    .select("*, profiles(nombre)")
    .eq("activo_id", activoId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const { profiles, ...rest } = row as HistorialCambio & {
      profiles: { nombre: string } | null;
    };
    return {
      ...rest,
      usuario_nombre: profiles?.nombre,
    };
  });
}
