import type { AccesoInvitacionEstado } from "@inventario/auth-invite";
import { getAccesoEstadoByEmails } from "@inventario/auth-invite";
import { createAdminClient } from "./supabase-admin";

export async function getUsuariosAccesoEstado(
  emails: string[],
): Promise<Record<string, AccesoInvitacionEstado>> {
  const admin = createAdminClient();
  const result: Record<string, AccesoInvitacionEstado> = {};

  if (!admin) {
    for (const email of emails) {
      result[email.trim().toLowerCase()] = "desconocido";
    }
    return result;
  }

  return getAccesoEstadoByEmails(admin, emails);
}
