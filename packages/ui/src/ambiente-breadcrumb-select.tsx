"use client";

import { useEffect, useMemo, useState } from "react";
import { Select } from "./components";
import type { PanelBreadcrumbItem } from "./panel-breadcrumbs";

export interface AmbienteNavOption {
  id: string;
  nombre: string;
}

export type FetchAmbientesPorSede = (
  entidadId: string,
  sedeId: string,
) => Promise<AmbienteNavOption[]>;

export function AmbienteBreadcrumbSelect({
  entidadId,
  sedeId,
  ambienteId,
  ambienteNombre,
  onAmbienteChange,
  fetchAmbientes,
}: {
  entidadId: string;
  sedeId: string;
  ambienteId: string;
  ambienteNombre: string;
  onAmbienteChange: (ambienteId: string, ambienteNombre: string) => void;
  fetchAmbientes: FetchAmbientesPorSede;
}) {
  const [ambientes, setAmbientes] = useState<AmbienteNavOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchAmbientes(entidadId, sedeId)
      .then((data) => {
        if (!cancelled) setAmbientes(data);
      })
      .catch(() => {
        if (!cancelled) setAmbientes([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [entidadId, sedeId, fetchAmbientes]);

  const options = useMemo(() => {
    const mapped = ambientes.map((a) => ({ value: a.id, label: a.nombre }));
    if (ambienteId && !mapped.some((o) => o.value === ambienteId)) {
      mapped.unshift({ value: ambienteId, label: ambienteNombre });
    }
    return mapped;
  }, [ambientes, ambienteId, ambienteNombre]);

  return (
    <Select
      aria-label="Ambiente"
      size="compact"
      value={ambienteId}
      disabled={loading || options.length === 0}
      onChange={(value) => {
        const nombre = options.find((o) => o.value === value)?.label ?? ambienteNombre;
        onAmbienteChange(value, nombre);
      }}
      className="h-8 min-w-[10rem] max-w-[18rem] font-semibold text-foreground"
      options={options}
    />
  );
}

/** Índice del segmento ambiente tras `withSedeBreadcrumb(..., beforeIndex: 1)`. */
export const AMBIENTE_BREADCRUMB_INDEX_AFTER_SEDE = 2;

export function withAmbienteBreadcrumbSelect(
  items: PanelBreadcrumbItem[],
  ambienteIndex: number,
  selectProps: {
    entidadId: string;
    sedeId: string;
    ambienteId: string;
    ambienteNombre: string;
    onAmbienteChange: (ambienteId: string, ambienteNombre: string) => void;
    fetchAmbientes: FetchAmbientesPorSede;
  },
): PanelBreadcrumbItem[] {
  const item = items[ambienteIndex];
  if (!item) return items;

  const out = [...items];
  out[ambienteIndex] = {
    ...item,
    slot: <AmbienteBreadcrumbSelect {...selectProps} />,
  };
  return out;
}
