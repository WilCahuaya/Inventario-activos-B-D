"use server";

import type { Profile } from "@inventario/types";
import type { AccesoInvitacionEstado } from "@inventario/auth-invite";
import { accesoInvitacionEstado, findAuthUserByEmail } from "@inventario/auth-invite";
import { revalidatePath } from "next/cache";
import {
  inviteContador as inviteContadorAuth,
  resendInvitacionUsuario as resendInvitacionAuth,
} from "@/lib/auth/contador-invite";
import {
  deleteUsuarioForAdmin,
  setUsuarioActivoForAdmin,
} from "@/lib/auth/usuario-admin";
import { requireProfile } from "@/lib/auth/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface ProfileConEntidad extends Profile {
  entidad_nombre?: string | null;
  acceso_estado?: AccesoInvitacionEstado;
}

async function enrichUsuariosAcceso(
  usuarios: ProfileConEntidad[],
): Promise<ProfileConEntidad[]> {
  const admin = createAdminClient();
  if (!admin) {
    return usuarios.map((u) => ({ ...u, acceso_estado: "desconocido" as const }));
  }

  const authUsers = await Promise.all(
    usuarios.map((u) => findAuthUserByEmail(admin, u.email)),
  );

  return usuarios.map((usuario, index) => ({
    ...usuario,
    acceso_estado: accesoInvitacionEstado(authUsers[index] ?? null),
  }));
}

export async function listUsuarios(): Promise<ProfileConEntidad[]> {
  await requireProfile("CONTADOR");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*, entidades(nombre)")
    .order("nombre");

  if (error) throw new Error(error.message);

  const usuarios = (data ?? []).map((row) => {
    const { entidades, ...profile } = row as Profile & {
      entidades: { nombre: string } | null;
    };
    return {
      ...profile,
      entidad_nombre: entidades?.nombre ?? null,
    };
  });

  return enrichUsuariosAcceso(usuarios);
}

export async function inviteContador(input: { email: string; nombre: string }) {
  await requireProfile("CONTADOR");

  const result = await inviteContadorAuth(input.email, input.nombre, { mode: "invite" });
  if (result.error) return { error: result.error };

  revalidatePath("/contador/usuarios");

  return {
    success: true,
    invited: result.invited,
    message: result.message ?? result.warning ?? null,
  };
}

export async function resendInvitacionUsuario(userId: string) {
  await requireProfile("CONTADOR");
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("profiles")
    .select("*, entidades(nombre)")
    .eq("id", userId)
    .maybeSingle();

  if (error || !row) return { error: "Usuario no encontrado." };

  const { entidades, ...profile } = row as Profile & {
    entidades: { nombre: string } | null;
  };

  if (profile.rol !== "CONTADOR" && profile.rol !== "ADMIN_ENTIDAD") {
    return { error: "Rol de usuario no admitido para invitación." };
  }

  const result = await resendInvitacionAuth({
    email: profile.email,
    nombre: profile.nombre,
    rol: profile.rol,
    entidadId: profile.entidad_id,
    entidadNombre: entidades?.nombre ?? null,
  });

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
