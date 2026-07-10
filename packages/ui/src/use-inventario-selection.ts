"use client";

import { useEffect, useState } from "react";
import type { Activo } from "@inventario/types";

export function useInventarioSelection(
  activos: Activo[],
  paginated: Activo[],
  puedeSeleccionar: (activo: Activo) => boolean,
  enabled: boolean,
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const selectableOnPage = enabled ? paginated.filter(puedeSeleccionar) : [];
  const allPageSelected =
    selectableOnPage.length > 0 && selectableOnPage.every((a) => selectedIds.has(a.id));

  useEffect(() => {
    if (!enabled) setSelectedIds(new Set());
  }, [enabled]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        for (const a of selectableOnPage) next.delete(a.id);
      } else {
        for (const a of selectableOnPage) next.add(a.id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  const selectedActivos = activos.filter((a) => selectedIds.has(a.id) && puedeSeleccionar(a));

  return {
    selectedIds,
    selectableOnPage,
    allPageSelected,
    toggleSelect,
    toggleSelectAllPage,
    clearSelection,
    selectedActivos,
  };
}
