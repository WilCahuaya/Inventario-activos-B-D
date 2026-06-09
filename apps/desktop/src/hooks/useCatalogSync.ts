import { useEffect, useState } from "react";
import { getLocalCatalogMeta, syncCatalogToLocalDb } from "../lib/catalog-sync";

export interface CatalogSyncState {
  syncing: boolean;
  count: number;
  syncedAt: string | null;
  error: string | null;
}

export function useCatalogSync(enabled: boolean): CatalogSyncState {
  const [state, setState] = useState<CatalogSyncState>({
    syncing: false,
    count: 0,
    syncedAt: null,
    error: null,
  });

  useEffect(() => {
    if (!enabled || !window.electronAPI?.syncCatalog) return;

    let cancelled = false;

    async function run() {
      setState((prev) => ({ ...prev, syncing: true, error: null }));

      try {
        const meta = await getLocalCatalogMeta();
        if (meta.count > 0 && !cancelled) {
          setState({ syncing: false, ...meta, error: null });
        }

        const synced = await syncCatalogToLocalDb();
        if (!cancelled) {
          setState({ syncing: false, ...synced, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setState((prev) => ({
            ...prev,
            syncing: false,
            error: err instanceof Error ? err.message : "Error al sincronizar catálogo",
          }));
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
