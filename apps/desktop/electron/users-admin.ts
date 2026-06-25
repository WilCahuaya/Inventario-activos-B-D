import { createAdminClient } from "./supabase-admin";

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
