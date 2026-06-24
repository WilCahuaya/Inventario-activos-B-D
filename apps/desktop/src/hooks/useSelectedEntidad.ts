import { useCallback, useEffect, useState } from "react";
import type { EntidadConConteo } from "@inventario/types";
import { listEntidades } from "../lib/entidades";

const STORAGE_KEY = "inventario.desktop.entidadId";

export function useSelectedEntidad(enabled: boolean) {
  const [entidades, setEntidades] = useState<EntidadConConteo[]>([]);
  const [entidadId, setEntidadIdState] = useState<string>("");
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const loadEntidades = useCallback(async () => {
    const items = await listEntidades();
    setEntidades(items);
    setEntidadIdState((current) => {
      const valid = items.find((e) => e.id === current);
      if (valid) return current;
      const saved = localStorage.getItem(STORAGE_KEY);
      const fromStorage = items.find((e) => e.id === saved);
      if (fromStorage) return fromStorage.id;
      if (items.length === 1) return items[0].id;
      return "";
    });
    return items;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    void loadEntidades()
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error al cargar entidades");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, loadEntidades]);

  function setEntidadId(id: string) {
    setEntidadIdState(id);
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  }

  function setEntidadesList(items: EntidadConConteo[]) {
    setEntidades(items);
    setEntidadIdState((current) => {
      if (current && items.some((e) => e.id === current)) return current;
      if (items.length === 1) return items[0].id;
      return "";
    });
  }

  const entidad = entidades.find((e) => e.id === entidadId) ?? null;

  return {
    entidades,
    entidad,
    entidadId,
    setEntidadId,
    setEntidadesList,
    refreshEntidades: loadEntidades,
    loading,
    error,
  };
}
