"use server";

import type { CatalogoNacional } from "@inventario/types";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/profile";

export async function searchCatalogo(query: string, limit = 20): Promise<CatalogoNacional[]> {
  const profile = await getProfile();
  if (!profile) return [];

  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_catalogo_nacional", {
    p_query: trimmed,
    p_limit: limit,
  });

  if (error) {
    console.error("search_catalogo_nacional:", error.message);
    return [];
  }

  return (data ?? []) as CatalogoNacional[];
}

export async function getCatalogoByCodigo(codigo: string): Promise<CatalogoNacional | null> {
  const profile = await getProfile();
  if (!profile) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("catalogo_nacional")
    .select("*")
    .eq("codigo", codigo.trim())
    .maybeSingle();

  if (error || !data) return null;
  return data as CatalogoNacional;
}
