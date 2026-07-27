import { useCallback, useEffect, useRef, useState } from "react";
import { syncAllMasterData, syncMasterDataForEntidad } from "../lib/master-sync";
import { useOnline } from "./useOnline";

/** Sincroniza maestros (entidades, sedes, ambientes, espacios, responsables) a SQLite. */
export function useMasterDataSync(enabled: boolean, entidadId?: string | null) {
  const online = useOnline();
  const [syncing, setSyncing] = useState(false);
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const syncedRef = useRef(false);

  const syncNow = useCallback(async () => {
    if (!enabled || !online) return;
    setSyncing(true);
    setError(null);
    try {
      await syncAllMasterData();
      if (entidadId) await syncMasterDataForEntidad(entidadId);
      setLastSyncAt(new Date().toISOString());
      syncedRef.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al sincronizar maestros");
    } finally {
      setSyncing(false);
    }
  }, [enabled, online, entidadId]);

  useEffect(() => {
    if (!enabled || !online) return;
    if (syncedRef.current) return;
    void syncNow();
  }, [enabled, online, syncNow]);

  const prevOnline = useRef(online);
  useEffect(() => {
    if (enabled && online && !prevOnline.current) {
      void syncNow();
    }
    prevOnline.current = online;
  }, [enabled, online, syncNow]);

  useEffect(() => {
    if (!enabled || !online || !entidadId) return;
    void syncMasterDataForEntidad(entidadId).catch(() => undefined);
  }, [enabled, online, entidadId]);

  return { syncing, lastSyncAt, error, syncNow };
}
