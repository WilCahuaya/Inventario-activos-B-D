import type { CatalogoNacional, CreateCatalogoNacionalInput } from "@inventario/types";
import {
  buildCreateCatalogoPayload,
  validarCreateCatalogoInput,
} from "@inventario/types";
import { fetchProfile } from "./profile";
import { getSupabaseClient } from "./supabase";

type LocalCatalogRow = {
  codigo: string;
  denominacion: string;
  grupo: string | null;
  clase: string | null;
  cuenta_codigo?: string | null;
  contabilidad?: string | null;
  depreciacion?: string | null;
  resolucion?: string | null;
  estado?: string | null;
};

function mapLocalRow(row: LocalCatalogRow): CatalogoNacional {
  return {
    codigo: row.codigo,
    denominacion: row.denominacion,
    grupo: row.grupo,
    clase: row.clase,
    cuenta_codigo: row.cuenta_codigo ?? null,
    contabilidad: row.contabilidad ?? null,
    depreciacion: row.depreciacion ?? null,
    resolucion: row.resolucion ?? null,
    estado: row.estado ?? null,
  };
}

function minQueryLength(query: string): number {
  return /^\d+$/.test(query) ? 1 : 2;
}

export async function searchCatalogo(query: string, limit = 20): Promise<CatalogoNacional[]> {
  const trimmed = query.trim();
  if (trimmed.length < minQueryLength(trimmed)) return [];

  if (window.electronAPI?.searchCatalogLocal) {
    const rows = await window.electronAPI.searchCatalogLocal(trimmed, limit);
    if (rows.length > 0) {
      return rows.map((row) => mapLocalRow(row));
    }
  }

  const supabase = getSupabaseClient();
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
  const trimmed = codigo.trim();
  if (!trimmed) return null;

  if (window.electronAPI?.getCatalogByCodigo) {
    const row = await window.electronAPI.getCatalogByCodigo(trimmed);
    if (row) return mapLocalRow(row);
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("catalogo_nacional")
    .select("*")
    .eq("codigo", trimmed)
    .maybeSingle();

  if (error || !data) return null;
  return data as CatalogoNacional;
}

export async function createCatalogoNacional(
  input: CreateCatalogoNacionalInput,
): Promise<{ data?: CatalogoNacional; error?: string }> {
  const profile = await fetchProfile();
  if (!profile) return { error: "Sesión no válida." };
  if (profile.rol !== "CONTADOR") return { error: "No autorizado." };

  const validationError = validarCreateCatalogoInput(input);
  if (validationError) return { error: validationError };

  const payload = buildCreateCatalogoPayload(input);
  const supabase = getSupabaseClient();

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

  const row = data as CatalogoNacional;
  await window.electronAPI?.upsertCatalogRow?.({
    codigo: row.codigo,
    denominacion: row.denominacion,
    grupo: row.grupo,
    clase: row.clase,
    cuenta_codigo: row.cuenta_codigo,
    contabilidad: row.contabilidad,
    depreciacion: row.depreciacion,
    resolucion: row.resolucion,
    estado: row.estado,
  });

  return { data: row };
}
