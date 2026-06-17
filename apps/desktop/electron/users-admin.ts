import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getServiceRoleKey, getSupabaseUrl } from "./env";

function createAdminClient(): SupabaseClient | null {
  const url = getSupabaseUrl();
  const key = getServiceRoleKey();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function deleteAuthUser(userId: string): Promise<{ error?: string }> {
  const admin = createAdminClient();
  if (!admin) {
    return {
      error: "Configure SUPABASE_SERVICE_ROLE_KEY para eliminar usuarios de forma permanente.",
    };
  }

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  return {};
}
