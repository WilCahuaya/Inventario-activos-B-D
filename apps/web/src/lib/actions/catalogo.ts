"use server";

import type { CatalogoNacional, CreateCatalogoNacionalInput } from "@inventario/types";
import {
  buildCreateCatalogoPayload,
  validarCreateCatalogoInput,
} from "@inventario/types";
import { createClient } from "@/lib/supabase/server";
import { getProfile, requireProfile } from "@/lib/auth/profile";

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

export async function createCatalogoNacional(
  input: CreateCatalogoNacionalInput,
): Promise<{ data?: CatalogoNacional; error?: string }> {
  await requireProfile("CONTADOR");

  const validationError = validarCreateCatalogoInput(input);
  if (validationError) return { error: validationError };

  const payload = buildCreateCatalogoPayload(input);
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("catalogo_nacional")
    .select("codigo")
    .eq("codigo", payload.codigo)
    .maybeSingle();

  if (existing) {
    return { error: `El código ${payload.codigo} ya existe en el catálogo.` };
  }

  const { data, error } = await supabase
    .from("catalogo_nacional")
    .insert(payload)
    .select()
    .single();

  if (error) return { error: error.message };
  return { data: data as CatalogoNacional };
}
