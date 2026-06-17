import type { ActivoAtributoCampo } from "@inventario/types";
import { getSupabaseClient } from "./supabase";

export async function suggestActivoAtributo(
  campo: ActivoAtributoCampo,
  query: string,
  limit = 10,
): Promise<string[]> {
  const trimmed = query.trim();
  if (trimmed.length < 1) return [];

  if (window.electronAPI?.searchAtributoVocabLocal) {
    const local = await window.electronAPI.searchAtributoVocabLocal(campo, trimmed, limit);
    if (local.length > 0) return local;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc("suggest_activo_atributo", {
    p_campo: campo,
    p_query: trimmed,
    p_limit: limit,
  });

  if (error) {
    console.error("suggest_activo_atributo:", error.message);
    return [];
  }

  return (data ?? []).map((row: { valor: string }) => row.valor);
}

export function upsertLocalAtributosFromActivo(values: {
  marca?: string | null;
  modelo?: string | null;
  serie?: string | null;
  color?: string | null;
  medidas?: string | null;
}): void {
  const upsert = window.electronAPI?.upsertAtributoVocabLocal;
  if (!upsert) return;

  if (values.marca?.trim()) upsert("marca", values.marca);
  if (values.modelo?.trim()) upsert("modelo", values.modelo);
  if (values.serie?.trim()) upsert("serie", values.serie);
  if (values.color?.trim()) upsert("color", values.color);
  if (values.medidas?.trim()) upsert("medidas", values.medidas);
}
