import type { ActivoAtributoCampo } from "@inventario/types";
import { getSupabaseClient } from "./supabase";

const PAGE_SIZE = 1000;

export interface AtributoVocabRow {
  campo: ActivoAtributoCampo;
  valor: string;
  valor_normalizado: string;
  uso_count: number;
}

export async function fetchAtributoVocabFromSupabase(): Promise<AtributoVocabRow[]> {
  const supabase = getSupabaseClient();
  const all: AtributoVocabRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("activo_atributos_vocab")
      .select("campo, valor, valor_normalizado, uso_count")
      .order("campo")
      .order("valor_normalizado")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    all.push(...(data as AtributoVocabRow[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

export async function syncAtributoVocabToLocalDb(): Promise<{
  count: number;
  syncedAt: string | null;
}> {
  if (!window.electronAPI?.syncAtributoVocab) {
    throw new Error("SQLite local no disponible fuera de Electron.");
  }

  const rows = await fetchAtributoVocabFromSupabase();
  return window.electronAPI.syncAtributoVocab(rows);
}

export async function getLocalAtributoVocabMeta(): Promise<{
  count: number;
  syncedAt: string | null;
}> {
  if (!window.electronAPI?.getAtributoVocabMeta) {
    return { count: 0, syncedAt: null };
  }
  return window.electronAPI.getAtributoVocabMeta();
}
