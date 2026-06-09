import { useCallback, useEffect, useState } from "react";
import { getLocalCatalogMeta, syncCatalogToLocalDb } from "../lib/catalog-sync";

export interface CatalogSyncState {
  syncing: boolean;
  count: number;
  syncedAt: string | null;
  error: string | null;
}

export function useCatalogSync(enabled: boolean, online: boolean) {
  const [state, setState] = useState<CatalogSyncState>({
    syncing: false,
    count: 0,
    syncedAt: null,
    error: null,
  });

  const refreshMeta = useCallback(async () => {
    if (!enabled || !window.electronAPI?.getCatalogMeta) {
      return { count: 0, syncedAt: null };
    }
    return getLocalCatalogMeta();
  }, [enabled]);

  const syncNow = useCallback(async () => {
    if (!enabled || !window.electronAPI?.syncCatalog) {
      setState((prev) => ({
        ...prev,
        error: "SQLite local no disponible (abra la app de escritorio).",
      }));
      return;
    }

    if (!online) {
      setState((prev) => ({
        ...prev,
        error: "Sin conexión. Conéctese a internet para descargar el catálogo.",
      }));
      return;
    }

    setState((prev) => ({ ...prev, syncing: true, error: null }));

    try {
      const synced = await syncCatalogToLocalDb();
      setState({ syncing: false, ...synced, error: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al sincronizar catálogo";
      const meta = await refreshMeta();
      setState({
        syncing: false,
        count: meta.count,
        syncedAt: meta.syncedAt,
        error: message,
      });
    }
  }, [enabled, online, refreshMeta]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    void refreshMeta().then((meta) => {
      if (!cancelled) {
        setState((prev) => ({
          ...prev,
          count: meta.count,
          syncedAt: meta.syncedAt ?? prev.syncedAt,
        }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enabled, refreshMeta]);

  useEffect(() => {
    if (!enabled || !online) return;
    void syncNow();
  }, [enabled, online, syncNow]);

  return { ...state, syncNow, refreshMeta };
}
