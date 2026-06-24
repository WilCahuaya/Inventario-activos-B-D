import type { AccesoInvitacionEstado } from "@inventario/auth-invite";
import {
  accesoInvitacionEstado,
  findAuthUserByEmail,
} from "@inventario/auth-invite";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServiceRoleKey, getSupabaseUrl } from "./env";

function createAdminClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getServiceRoleKey();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

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

  await Promise.all(
    emails.map(async (email) => {
      const key = email.trim().toLowerCase();
      const authUser = await findAuthUserByEmail(admin, key);
      result[key] = accesoInvitacionEstado(authUser);
    }),
  );

  return result;
}
