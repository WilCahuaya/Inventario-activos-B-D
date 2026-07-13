import { useCallback, useEffect, useRef, useState } from "react";
import type { Entidad } from "@inventario/types";
import type { ActivoConUbicacion } from "../lib/activos";
import { listActivosGlobal } from "../lib/activos";
import { listCachedActivos } from "../lib/offline";
import { useOnline } from "./useOnline";

export function useGlobalActivosCache(entidades: Entidad[], enabled: boolean) {
  const online = useOnline();
  const [activos, setActivos] = useState<ActivoConUbicacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const hasDataRef = useRef(false);

  const loadFromCache = useCallback(async () => {
    if (!enabled || entidades.length === 0) {
      setActivos([]);
      return;
    }
    const merged: ActivoConUbicacion[] = [];
    for (const entidad of entidades) {
      const cached = await listCachedActivos(entidad.id);
      for (const activo of cached as ActivoConUbicacion[]) {
        merged.push({
          ...activo,
          entidad_nombre: activo.entidad_nombre ?? entidad.nombre,
        });
      }
    }
    merged.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    setActivos(merged);
    if (merged.length > 0) hasDataRef.current = true;
  }, [enabled, entidades]);

  const refresh = useCallback(async () => {
    if (!enabled || !online) return;
    const showSpinner = !hasDataRef.current;
    if (showSpinner) setLoading(true);
    try {
      const fetched = await listActivosGlobal();
      setActivos(fetched);
      setUpdatedAt(new Date().toISOString());
      hasDataRef.current = true;
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, [enabled, online]);

  useEffect(() => {
    if (!enabled) {
      setActivos([]);
      return;
    }
    void loadFromCache();
  }, [enabled, loadFromCache]);

  useEffect(() => {
    if (enabled && online) {
      void refresh();
    }
  }, [enabled, online, refresh]);

  return { activos, loading, updatedAt, refresh, loadFromCache };
}
