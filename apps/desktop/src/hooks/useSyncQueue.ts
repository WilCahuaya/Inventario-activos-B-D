import { useCallback, useEffect, useRef, useState } from "react";
import { getPendingCount } from "../lib/offline";
import { processSyncQueue } from "../lib/sync-processor";
import { syncAllMasterData } from "../lib/master-sync";
import { useOnline } from "./useOnline";

export function useSyncQueue(enabled: boolean, onSynced?: () => void) {
  const online = useOnline();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const onSyncedRef = useRef(onSynced);
  onSyncedRef.current = onSynced;

  const refreshCount = useCallback(async () => {
    if (!enabled) {
      setPending(0);
      return;
    }
    const count = await getPendingCount();
    setPending(count);
  }, [enabled]);

  const syncNow = useCallback(async () => {
    if (!enabled || !online) return;
    setSyncing(true);
    setLastResult(null);
    try {
      const result = await processSyncQueue();
      try {
        await syncAllMasterData();
      } catch {
        /* pull de maestros no bloquea la subida */
      }
      if (result.processed > 0) {
        setLastResult(
          result.failed > 0
            ? `Sincronizados ${result.processed}; ${result.failed} con error.`
            : `Sincronizados ${result.processed} cambio(s).`,
        );
        onSyncedRef.current?.();
      } else if (result.failed > 0 && result.lastError) {
        setLastResult(result.lastError);
      }
    } catch (err) {
      setLastResult(err instanceof Error ? err.message : "Error al sincronizar");
    } finally {
      setSyncing(false);
      await refreshCount();
    }
  }, [enabled, online, refreshCount]);

  useEffect(() => {
    void refreshCount();
    const timer = setInterval(() => void refreshCount(), 5000);
    return () => clearInterval(timer);
  }, [refreshCount]);

  const prevOnline = useRef(online);
  useEffect(() => {
    if (enabled && online && !prevOnline.current) {
      void syncNow();
    }
    prevOnline.current = online;
  }, [enabled, online, syncNow]);

  return { pending, syncing, lastResult, refreshCount, syncNow };
}
