import { sendUserInvitation, type InviteMode } from "@inventario/auth-invite";
import { getSiteOrigin } from "./env";
import { createAdminClient } from "./supabase-admin";

export interface InviteEntidadAdminInput {
  entidadId: string;
  email: string;
  nombre: string;
  entidadNombre?: string;
  mode?: InviteMode;
}

export interface InviteEntidadAdminResult {
  success?: boolean;
  invited?: boolean;
  resent?: boolean;
  message?: string;
  warning?: string;
  error?: string;
}

export interface InviteContadorInput {
  email: string;
  nombre: string;
  mode?: InviteMode;
}

export interface InviteContadorResult {
  success?: boolean;
  invited?: boolean;
  resent?: boolean;
  message?: string;
  warning?: string;
  error?: string;
}

export interface ResendInvitacionInput {
  email: string;
  nombre: string;
  rol: "CONTADOR" | "ADMIN_ENTIDAD";
  entidadId?: string | null;
  entidadNombre?: string | null;
}

function missingServiceRoleWarning(context: "entidad" | "contador" | "resend") {
  if (context === "entidad") {
    return "Entidad guardada. Configure SUPABASE_SERVICE_ROLE_KEY en apps/desktop/.env.local para enviar la invitación por correo; el admin podrá ingresar con Google usando ese correo.";
  }
  if (context === "contador") {
    return "Configure SUPABASE_SERVICE_ROLE_KEY en apps/desktop/.env.local para enviar la invitación por correo; el contador podrá ingresar con Google usando ese correo.";
  }
  return "Configure SUPABASE_SERVICE_ROLE_KEY en apps/desktop/.env.local para enviar la invitación por correo.";
}

export async function inviteEntidadAdmin(
  input: InviteEntidadAdminInput,
): Promise<InviteEntidadAdminResult> {
  const admin = createAdminClient();
  if (!admin) {
    return {
      success: true,
      invited: false,
      warning: missingServiceRoleWarning("entidad"),
    };
  }

  return sendUserInvitation(admin, {
    email: input.email,
    nombre: input.nombre,
    rol: "ADMIN_ENTIDAD",
    entidadId: input.entidadId,
    entidadNombre: input.entidadNombre,
    mode: input.mode ?? "invite",
    redirectTo: `${getSiteOrigin()}/auth/callback`,
  });
}

export async function inviteContador(input: InviteContadorInput): Promise<InviteContadorResult> {
  const admin = createAdminClient();
  if (!admin) {
    return {
      success: true,
      invited: false,
      warning: missingServiceRoleWarning("contador"),
    };
  }

  return sendUserInvitation(admin, {
    email: input.email,
    nombre: input.nombre,
    rol: "CONTADOR",
    mode: input.mode ?? "invite",
    redirectTo: `${getSiteOrigin()}/auth/callback`,
  });
}

export async function resendInvitacionUsuario(
  input: ResendInvitacionInput,
): Promise<InviteContadorResult> {
  const admin = createAdminClient();
  if (!admin) {
    return { error: missingServiceRoleWarning("resend") };
  }

  return sendUserInvitation(admin, {
    email: input.email,
    nombre: input.nombre,
    rol: input.rol,
    entidadId: input.entidadId,
    entidadNombre: input.entidadNombre,
    mode: "resend",
    redirectTo: `${getSiteOrigin()}/auth/callback`,
  });
}
