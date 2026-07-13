import { useCallback, useEffect, useRef, useState } from "react";
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
  const hasDataRef = useRef(false);

  const loadFromCache = useCallback(async () => {
    if (!enabled || !entidadId) return;
    const cached = await listCachedActivos(entidadId);
    const parsed = parseCachedActivos(cached);
    setActivos(parsed);
    setCount(parsed.length);
    if (parsed.length > 0) hasDataRef.current = true;
  }, [enabled, entidadId]);

  const refresh = useCallback(async () => {
    if (!enabled || !entidadId || !online) return;
    const showSpinner = !hasDataRef.current;
    if (showSpinner) setLoading(true);
    try {
      const fetched = await listActivosForEntidad(entidadId);
      await refreshActivosCache(entidadId, fetched);
      setActivos(fetched);
      setCount(fetched.length);
      setUpdatedAt(new Date().toISOString());
      hasDataRef.current = true;
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [enabled, entidadId, online]);

  useEffect(() => {
    hasDataRef.current = false;
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
