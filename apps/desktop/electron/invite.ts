import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { RolUsuario } from "@inventario/types";
import { getServiceRoleKey, getSiteOrigin, getSupabaseUrl } from "./env";

export interface InviteEntidadAdminInput {
  entidadId: string;
  email: string;
  nombre: string;
  entidadNombre?: string;
}

export interface InviteEntidadAdminResult {
  success?: boolean;
  invited?: boolean;
  message?: string;
  warning?: string;
  error?: string;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createAdminClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getServiceRoleKey();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function findAuthUserByEmail(admin: SupabaseClient, email: string) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return null;
  return data.users.find((u) => u.email?.toLowerCase() === email) ?? null;
}

async function upsertAdminProfile(
  admin: SupabaseClient,
  userId: string,
  email: string,
  nombre: string,
  entidadId: string,
): Promise<{ error?: string }> {
  await admin
    .from("profiles")
    .update({ activo: false })
    .eq("entidad_id", entidadId)
    .eq("rol", "ADMIN_ENTIDAD" as RolUsuario)
    .neq("id", userId);

  const payload = {
    id: userId,
    email: normalizeEmail(email),
    nombre: nombre.trim(),
    rol: "ADMIN_ENTIDAD" as RolUsuario,
    entidad_id: entidadId,
    activo: true,
  };

  const { data: existing } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();

  if (existing) {
    const { error } = await admin.from("profiles").update(payload).eq("id", userId);
    if (error) return { error: error.message };
  } else {
    const { error } = await admin.from("profiles").insert(payload);
    if (error) return { error: error.message };
  }

  return {};
}

export async function inviteEntidadAdmin(
  input: InviteEntidadAdminInput,
): Promise<InviteEntidadAdminResult> {
  const emailNorm = normalizeEmail(input.email);
  const nombreTrim = input.nombre.trim();

  if (!emailNorm) return { error: "El correo del administrador es obligatorio." };
  if (!nombreTrim) return { error: "El nombre del administrador es obligatorio." };

  const admin = createAdminClient();
  if (!admin) {
    return {
      success: true,
      invited: false,
      warning:
        "Entidad guardada. Configure SUPABASE_SERVICE_ROLE_KEY en apps/desktop/.env.local para enviar la invitación por correo; el admin podrá ingresar con Google usando ese correo.",
    };
  }

  const existingUser = await findAuthUserByEmail(admin, emailNorm);

  if (existingUser) {
    const result = await upsertAdminProfile(
      admin,
      existingUser.id,
      emailNorm,
      nombreTrim,
      input.entidadId,
    );
    if (result.error) return { error: result.error };
    return { success: true, invited: false, message: "Perfil de administrador actualizado." };
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(emailNorm, {
    data: {
      nombre: nombreTrim,
      entidad_id: input.entidadId,
      entidad_nombre: input.entidadNombre?.trim() || null,
      rol: "ADMIN_ENTIDAD",
    },
    redirectTo: `${getSiteOrigin()}/auth/callback`,
  });

  if (error) return { error: error.message };

  if (data.user) {
    const result = await upsertAdminProfile(
      admin,
      data.user.id,
      emailNorm,
      nombreTrim,
      input.entidadId,
    );
    if (result.error) return { error: result.error };
  }

  return {
    success: true,
    invited: true,
    message: `Invitación enviada a ${emailNorm}. El administrador podrá ingresar con Google usando ese correo.`,
  };
}
