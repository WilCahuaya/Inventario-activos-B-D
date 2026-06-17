"use client";

import { useEffect, useMemo, useState } from "react";
import type { CatalogoNacional } from "@inventario/types";
import { CATALOGO_ORIGEN_LABELS, minCatalogoQueryLength } from "@inventario/types";
import { Dialog } from "./components";
import { PanelIconAction, ViewIcon } from "./panel-action-buttons";
import {
  PanelCountLabel,
  PanelEmptyState,
  PanelSearchInput,
  PanelToolbar,
  StatusBadge,
} from "./panel";
import {
  PanelDataTable,
  panelTableBodyRowClass,
  panelTableHeadRowClass,
  panelTableMutedClass,
  panelTableStickyHeadClass,
} from "./panel-list-table";
import {
  PanelTableColgroup,
  PanelTableTd,
  PanelTableTh,
  panelTableNowrapCellClass,
} from "./panel-table-layout";

const CATALOGO_NACIONAL_TABLE_COLS = [
  { type: "shrink" as const },
  { type: "grow" as const },
  { type: "grow" as const },
  { type: "shrink" as const },
  { type: "shrink" as const },
];

export interface CatalogoNacionalConsultaProps {
  searchItems: (query: string) => Promise<CatalogoNacional[]>;
  offlineHint?: string;
}

function CatalogoNacionalDetalle({ item }: { item: CatalogoNacional }) {
  const rows: Array<{ label: string; value: string | null | undefined }> = [
    { label: "Código", value: item.codigo },
    { label: "Denominación", value: item.denominacion },
    { label: "Grupo", value: item.grupo },
    { label: "Clase", value: item.clase },
    { label: "Cuenta contable", value: item.cuenta_codigo },
    { label: "Contabilidad", value: item.contabilidad },
    { label: "Depreciación", value: item.depreciacion },
    { label: "Resolución", value: item.resolucion },
    { label: "Estado", value: item.estado },
    { label: "Origen", value: CATALOGO_ORIGEN_LABELS.NACIONAL },
  ];

  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label} className="space-y-1">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {row.label}
          </dt>
          <dd className="text-sm text-foreground">{row.value?.trim() || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function CatalogoNacionalConsulta({
  searchItems,
  offlineHint,
}: CatalogoNacionalConsultaProps) {
  const [busqueda, setBusqueda] = useState("");
  const [items, setItems] = useState<CatalogoNacional[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [viewTarget, setViewTarget] = useState<CatalogoNacional | null>(null);

  useEffect(() => {
    const trimmed = busqueda.trim();
    if (trimmed.length < minCatalogoQueryLength(trimmed)) {
      setItems([]);
      setSearched(false);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      void (async () => {
        setLoading(true);
        try {
          const result = await searchItems(trimmed);
          setItems(result);
          setSearched(true);
        } finally {
          setLoading(false);
        }
      })();
    }, 300);

    return () => clearTimeout(timer);
  }, [busqueda, searchItems]);

  const filtrados = useMemo(() => items, [items]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Consulta de solo lectura sobre el catálogo oficial SBN. No se pueden modificar estos ítems.
        {offlineHint ? ` ${offlineHint}` : ""}
      </p>

      <PanelToolbar
        left={
          searched ? (
            <PanelCountLabel
              count={filtrados.length}
              singular="resultado"
              plural="resultados"
            />
          ) : (
            <span className="text-sm text-muted-foreground">Escriba para buscar</span>
          )
        }
        right={
          <div className="min-w-[220px] flex-1 sm:max-w-md sm:flex-none">
            <PanelSearchInput
              value={busqueda}
              onChange={setBusqueda}
              placeholder="Código o denominación del catálogo nacional…"
            />
          </div>
        }
      />

      {loading && <p className="text-sm text-muted-foreground">Buscando en catálogo nacional…</p>}

      {!loading && searched && filtrados.length === 0 && (
        <PanelEmptyState message="No se encontraron ítems del catálogo nacional con ese criterio." />
      )}

      {!loading && filtrados.length > 0 && (
        <PanelDataTable layout="auto">
          <PanelTableColgroup cols={CATALOGO_NACIONAL_TABLE_COLS} />
          <thead className={panelTableStickyHeadClass}>
            <tr className={panelTableHeadRowClass}>
              <PanelTableTh className={panelTableNowrapCellClass}>Código</PanelTableTh>
              <PanelTableTh>Denominación</PanelTableTh>
              <PanelTableTh>Grupo</PanelTableTh>
              <PanelTableTh className={panelTableNowrapCellClass}>Estado</PanelTableTh>
              <PanelTableTh align="right" className={panelTableNowrapCellClass}>
                Ver
              </PanelTableTh>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((item) => (
              <tr key={item.codigo} className={panelTableBodyRowClass}>
                <PanelTableTd className={`font-mono text-xs ${panelTableNowrapCellClass}`}>
                  {item.codigo}
                </PanelTableTd>
                <PanelTableTd className="font-medium" title={item.denominacion}>
                  {item.denominacion}
                </PanelTableTd>
                <PanelTableTd className={panelTableMutedClass} title={item.grupo ?? undefined}>
                  {item.grupo ?? "—"}
                </PanelTableTd>
                <PanelTableTd className={panelTableNowrapCellClass}>
                  <StatusBadge variant={item.estado === "ACTIVO" ? "active" : "default"}>
                    {item.estado ?? "—"}
                  </StatusBadge>
                </PanelTableTd>
                <PanelTableTd align="right" className={panelTableNowrapCellClass}>
                  <PanelIconAction label="Ver detalle" onClick={() => setViewTarget(item)}>
                    <ViewIcon />
                  </PanelIconAction>
                </PanelTableTd>
              </tr>
            ))}
          </tbody>
        </PanelDataTable>
      )}

      {!loading && !searched && busqueda.trim().length === 0 && (
        <PanelEmptyState message="Ingrese al menos 2 letras o un dígito para buscar en el catálogo nacional." />
      )}

      <Dialog
        open={Boolean(viewTarget)}
        onClose={() => setViewTarget(null)}
        title="Ítem del catálogo nacional"
      >
        {viewTarget && <CatalogoNacionalDetalle item={viewTarget} />}
      </Dialog>
    </div>
  );
}
