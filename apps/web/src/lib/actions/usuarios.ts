"use server";

import type { Profile } from "@inventario/types";
import { revalidatePath } from "next/cache";
import { inviteContador as inviteContadorAuth } from "@/lib/auth/contador-invite";
import {
  deleteUsuarioForAdmin,
  setUsuarioActivoForAdmin,
} from "@/lib/auth/usuario-admin";
import { requireProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

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

export async function inviteContador(input: { email: string; nombre: string }) {
  await requireProfile("CONTADOR");

  const result = await inviteContadorAuth(input.email, input.nombre);
  if (result.error) return { error: result.error };

  revalidatePath("/contador/usuarios");

  return {
    success: true,
    invited: result.invited,
    message: result.message ?? result.warning ?? null,
  };
}

export async function setUsuarioActivo(userId: string, activo: boolean) {
  const actor = await requireProfile("CONTADOR");
  const result = await setUsuarioActivoForAdmin({ userId, activo, actor });
  if (result.error) return { error: result.error };
  revalidatePath("/contador/usuarios");
  return { success: true as const };
}

export async function deleteUsuario(userId: string) {
  const actor = await requireProfile("CONTADOR");
  const result = await deleteUsuarioForAdmin({ userId, actor });
  if (result.error) return { error: result.error };
  revalidatePath("/contador/usuarios");
  return { success: true as const };
}
