import { useCallback, useEffect, useState } from "react";
import {
  getLocalAtributoVocabMeta,
  syncAtributoVocabToLocalDb,
} from "../lib/atributo-vocab-sync";

export interface AtributoVocabSyncState {
  syncing: boolean;
  count: number;
  syncedAt: string | null;
  error: string | null;
}

export function useAtributoVocabSync(enabled: boolean, online: boolean) {
  const [state, setState] = useState<AtributoVocabSyncState>({
    syncing: false,
    count: 0,
    syncedAt: null,
    error: null,
  });

  const refreshMeta = useCallback(async () => {
    if (!enabled || !window.electronAPI?.getAtributoVocabMeta) {
      return { count: 0, syncedAt: null };
    }
    return getLocalAtributoVocabMeta();
  }, [enabled]);

  const syncNow = useCallback(async () => {
    if (!enabled || !window.electronAPI?.syncAtributoVocab) {
      return;
    }

    if (!online) return;

    setState((prev) => ({ ...prev, syncing: true, error: null }));

    try {
      const synced = await syncAtributoVocabToLocalDb();
      setState({ syncing: false, ...synced, error: null });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error al sincronizar vocabulario de atributos";
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
