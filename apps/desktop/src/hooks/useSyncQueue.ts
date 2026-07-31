import { useCallback, useEffect, useRef, useState } from "react";
import { getPendingCount } from "../lib/offline";
import { processSyncQueue } from "../lib/sync-processor";
import { syncAllMasterData } from "../lib/master-sync";
import { useOnline } from "./useOnline";

export type SyncNowOptions = {
  /** Si true, muestra overlay bloqueante «Sincronizando, espere por favor». */
  blockUi?: boolean;
};

export function useSyncQueue(enabled: boolean, onSynced?: () => void) {
  const online = useOnline();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [blockingSync, setBlockingSync] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const onSyncedRef = useRef(onSynced);
  onSyncedRef.current = onSynced;
  const wasEnabledRef = useRef(false);
  const prevOnlineRef = useRef(online);
  const syncingRef = useRef(false);

  const refreshCount = useCallback(async () => {
    if (!enabled) {
      setPending(0);
      return;
    }
    const count = await getPendingCount();
    setPending(count);
  }, [enabled]);

  const syncNow = useCallback(
    async (options?: SyncNowOptions) => {
      if (!enabled || !online || syncingRef.current) return;
      const blockUi = Boolean(options?.blockUi);
      syncingRef.current = true;
      setSyncing(true);
      if (blockUi) {
        const count = await getPendingCount();
        setPending(count);
        setBlockingSync(true);
      }
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
        syncingRef.current = false;
        setSyncing(false);
        setBlockingSync(false);
        await refreshCount();
      }
    },
    [enabled, online, refreshCount],
  );

  useEffect(() => {
    void refreshCount();
    const timer = setInterval(() => void refreshCount(), 5000);
    return () => clearInterval(timer);
  }, [refreshCount]);

  // Al iniciar ya en línea, al cargar el perfil, o al reconectar: subir la cola (bloqueo si hay pendientes).
  useEffect(() => {
    const justEnabled = enabled && !wasEnabledRef.current;
    const cameOnline = online && !prevOnlineRef.current;
    wasEnabledRef.current = enabled;
    prevOnlineRef.current = online;

    if (!(enabled && online && (justEnabled || cameOnline))) return;

    void (async () => {
      const count = await getPendingCount();
      if (count > 0) {
        await syncNow({ blockUi: true });
      } else {
        await syncNow({ blockUi: false });
      }
    })();
  }, [enabled, online, syncNow]);

  // Reintento en segundo plano (sin bloquear la UI).
  useEffect(() => {
    if (!enabled || !online || pending === 0) return;
    const timer = setInterval(() => void syncNow({ blockUi: false }), 20000);
    return () => clearInterval(timer);
  }, [enabled, online, pending, syncNow]);

  return { pending, syncing, blockingSync, lastResult, refreshCount, syncNow };
}
