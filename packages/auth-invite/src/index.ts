import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { RolUsuario } from "@inventario/types";

export type InviteMode = "invite" | "resend";

export type AccesoInvitacionEstado = "confirmado" | "pendiente" | "sin_cuenta" | "desconocido";

export interface SendUserInvitationInput {
  email: string;
  nombre: string;
  rol: RolUsuario;
  entidadId?: string | null;
  entidadNombre?: string | null;
  mode?: InviteMode;
  redirectTo: string;
}

export interface SendUserInvitationResult {
  success?: boolean;
  invited?: boolean;
  resent?: boolean;
  message?: string;
  warning?: string;
  error?: string;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function isUserConfirmed(user: User) {
  return Boolean(user.email_confirmed_at);
}

function inviteMetadata(input: SendUserInvitationInput) {
  if (input.rol === "ADMIN_ENTIDAD") {
    return {
      nombre: input.nombre.trim(),
      entidad_id: input.entidadId ?? null,
      entidad_nombre: input.entidadNombre?.trim() || null,
      rol: "ADMIN_ENTIDAD",
    };
  }
  return {
    nombre: input.nombre.trim(),
    rol: "CONTADOR",
  };
}

export async function findAuthUserByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<User | null> {
  const emailNorm = normalizeEmail(email);
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return null;
  return data.users.find((u) => u.email?.toLowerCase() === emailNorm) ?? null;
}

export function accesoInvitacionEstado(authUser: User | null): AccesoInvitacionEstado {
  if (!authUser) return "sin_cuenta";
  if (isUserConfirmed(authUser)) return "confirmado";
  return "pendiente";
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

async function upsertContadorProfile(
  admin: SupabaseClient,
  userId: string,
  email: string,
  nombre: string,
): Promise<{ error?: string }> {
  const { data: existing } = await admin
    .from("profiles")
    .select("id, rol, activo")
    .eq("id", userId)
    .maybeSingle();

  if (existing?.activo && existing.rol === ("ADMIN_ENTIDAD" as RolUsuario)) {
    return { error: "Este usuario ya es administrador de una entidad." };
  }

  const payload = {
    id: userId,
    email: normalizeEmail(email),
    nombre: nombre.trim(),
    rol: "CONTADOR" as RolUsuario,
    entidad_id: null,
    activo: true,
  };

  if (existing) {
    const { error } = await admin.from("profiles").update(payload).eq("id", userId);
    if (error) return { error: error.message };
  } else {
    const { error } = await admin.from("profiles").insert(payload);
    if (error) return { error: error.message };
  }

  return {};
}

async function upsertProfileForRole(
  admin: SupabaseClient,
  userId: string,
  input: SendUserInvitationInput,
): Promise<{ error?: string }> {
  if (input.rol === "ADMIN_ENTIDAD") {
    if (!input.entidadId) {
      return { error: "La entidad del administrador es obligatoria." };
    }
    return upsertAdminProfile(admin, userId, input.email, input.nombre, input.entidadId);
  }
  return upsertContadorProfile(admin, userId, input.email, input.nombre);
}

async function deliverInvitationEmail(
  admin: SupabaseClient,
  input: SendUserInvitationInput,
  existingUser: User | null,
): Promise<{ userId?: string; resent?: boolean; error?: string }> {
  const emailNorm = normalizeEmail(input.email);
  const metadata = inviteMetadata(input);
  const redirectTo = input.redirectTo;

  if (existingUser && isUserConfirmed(existingUser)) {
    return { userId: existingUser.id };
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(emailNorm, {
    data: metadata,
    redirectTo,
  });

  if (!error) {
    return {
      userId: data.user?.id ?? existingUser?.id,
      resent: Boolean(existingUser),
    };
  }

  return {
    userId: existingUser?.id,
    error: error.message,
  };
}

export async function syncAdminProfile(
  admin: SupabaseClient,
  userId: string,
  input: Pick<SendUserInvitationInput, "email" | "nombre" | "entidadId">,
): Promise<{ error?: string }> {
  if (!input.entidadId) {
    return { error: "La entidad del administrador es obligatoria." };
  }
  return upsertAdminProfile(admin, userId, input.email, input.nombre, input.entidadId);
}

export async function syncContadorProfile(
  admin: SupabaseClient,
  userId: string,
  input: Pick<SendUserInvitationInput, "email" | "nombre">,
): Promise<{ error?: string }> {
  return upsertContadorProfile(admin, userId, input.email, input.nombre);
}

export async function sendUserInvitation(
  admin: SupabaseClient,
  input: SendUserInvitationInput,
): Promise<SendUserInvitationResult> {
  const emailNorm = normalizeEmail(input.email);
  const nombreTrim = input.nombre.trim();
  const mode = input.mode ?? "invite";

  if (!emailNorm) return { error: "El correo es obligatorio." };
  if (!nombreTrim) return { error: "El nombre es obligatorio." };
  if (input.rol === "ADMIN_ENTIDAD" && !input.entidadId) {
    return { error: "La entidad del administrador es obligatoria." };
  }

  const existingUser = await findAuthUserByEmail(admin, emailNorm);
  const confirmed = existingUser ? isUserConfirmed(existingUser) : false;

  if (confirmed) {
    const userId = existingUser!.id;
    const profileResult = await upsertProfileForRole(admin, userId, input);
    if (profileResult.error) return { error: profileResult.error };
    return {
      success: true,
      invited: false,
      message: `${emailNorm} ya ingresó al sistema. Puede acceder con Google usando ese correo.`,
    };
  }

  const delivery = await deliverInvitationEmail(admin, input, existingUser);
  if (delivery.error && !delivery.userId) {
    return { error: delivery.error };
  }

  const userId = delivery.userId;
  if (!userId) {
    return { error: delivery.error ?? "No se pudo identificar al usuario invitado." };
  }

  const profileResult = await upsertProfileForRole(admin, userId, input);
  if (profileResult.error) return { error: profileResult.error };

  if (delivery.error) {
    return {
      success: true,
      invited: false,
      error: `Perfil actualizado, pero el correo falló: ${delivery.error}`,
    };
  }

  const resent = Boolean(delivery.resent || (existingUser && mode === "resend"));
  const verb = resent ? "reenviada" : "enviada";

  return {
    success: true,
    invited: true,
    resent,
    message: `Invitación ${verb} a ${emailNorm}. Podrá ingresar con Google usando ese correo.`,
  };
}
