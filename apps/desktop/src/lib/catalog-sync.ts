import type { CatalogoNacional } from "@inventario/types";
import { getSupabaseClient } from "./supabase";

const PAGE_SIZE = 1000;

export async function fetchCatalogoFromSupabase(): Promise<CatalogoNacional[]> {
  const supabase = getSupabaseClient();
  const all: CatalogoNacional[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("catalogo_nacional")
      .select(
        "codigo, denominacion, grupo, clase, cuenta_codigo, contabilidad, depreciacion, resolucion, estado",
      )
      .order("codigo")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data?.length) break;

    all.push(...(data as CatalogoNacional[]));
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return all;
}

export async function syncCatalogToLocalDb(): Promise<{ count: number; syncedAt: string | null }> {
  if (!window.electronAPI?.syncCatalog) {
    throw new Error("SQLite local no disponible fuera de Electron.");
  }

  const rows = await fetchCatalogoFromSupabase();
  if (rows.length === 0) {
    throw new Error(
      "Sin catálogo en el servidor. Ejecute «pnpm import:catalogo» en el proyecto y vuelva a sincronizar.",
    );
  }

  return window.electronAPI.syncCatalog(rows);
}

export async function getLocalCatalogMeta(): Promise<{ count: number; syncedAt: string | null }> {
  if (!window.electronAPI?.getCatalogMeta) {
    return { count: 0, syncedAt: null };
  }
  return window.electronAPI.getCatalogMeta();
}
