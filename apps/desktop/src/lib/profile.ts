import type { Profile } from "@inventario/types";
import { getSupabaseClient } from "./supabase";

export async function fetchProfile(): Promise<Profile | null> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .eq("activo", true)
    .maybeSingle();

  if (error || !data) return null;
  return data as Profile;
}
