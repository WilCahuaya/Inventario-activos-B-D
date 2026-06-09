import { useCallback, useEffect, useState } from "react";
import type { ActivoConUbicacion } from "../lib/activos";
import { listActivosForEntidad } from "../lib/activos";
import { listCachedActivos, refreshActivosCache } from "../lib/offline";
import { useOnline } from "./useOnline";

function parseCachedActivos(items: unknown[]): ActivoConUbicacion[] {
  return items as ActivoConUbicacion[];
}

export function useActivosCache(entidadId: string, enabled: boolean) {
  const online = useOnline();
  const [activos, setActivos] = useState<ActivoConUbicacion[]>([]);
  const [count, setCount] = useState(0);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadFromCache = useCallback(async () => {
    if (!enabled || !entidadId) return;
    const cached = await listCachedActivos(entidadId);
    const parsed = parseCachedActivos(cached);
    setActivos(parsed);
    setCount(parsed.length);
  }, [enabled, entidadId]);

  const refresh = useCallback(async () => {
    if (!enabled || !entidadId || !online) return;
    setLoading(true);
    try {
      const fetched = await listActivosForEntidad(entidadId);
      await refreshActivosCache(entidadId, fetched);
      setActivos(fetched);
      setCount(fetched.length);
      setUpdatedAt(new Date().toISOString());
    } finally {
      setLoading(false);
    }
  }, [enabled, entidadId, online]);

  useEffect(() => {
    if (!enabled || !entidadId) {
      setActivos([]);
      setCount(0);
      return;
    }
    void loadFromCache();
    void window.electronAPI?.offlineCacheMeta?.(entidadId).then((meta) => {
      if (meta?.updatedAt) setUpdatedAt(meta.updatedAt);
    });
  }, [enabled, entidadId, loadFromCache]);

  useEffect(() => {
    if (enabled && entidadId && online) {
      void refresh();
    }
  }, [enabled, entidadId, online, refresh]);

  return { activos, count, updatedAt, loading, refresh, loadFromCache };
}
