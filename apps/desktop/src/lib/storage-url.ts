import { getSupabaseClient } from "./supabase";

export async function getSignedStorageUrl(
  bucket: "fotos-activos" | "comprobantes-activos",
  path: string,
  expiresIn = 3600,
): Promise<{ url?: string; error?: string }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);

  if (error) return { error: error.message };
  return { url: data.signedUrl };
}
