import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { Ambiente, Entidad, EstadoRegistro, Sede } from "@inventario/types";
import { Button, Select } from "@inventario/ui";
import { listAmbientes, listAmbientesPorEntidad, listSedes } from "../lib/ubicacion";
import { PanelSearchInput, panelFilterRowClass, panelStickyToolbarClass, panelToolbarActionsClass } from "@inventario/ui/panel";
import type { ActivoConUbicacion } from "../lib/activos";
import type { InventarioExportMeta } from "../lib/inventario-export";
import type { AmbienteDestinoNavigation } from "./AgregarBienesSimilaresDialog";
import { ActivosInventarioExcelView } from "./ActivosInventarioExcelView";
import { InventarioExportButtons } from "./InventarioExportButtons";

const FILTROS_ESTADO: { value: "" | EstadoRegistro; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "REGISTRADO", label: "Registrados" },
  { value: "PREREGISTRADO", label: "Preregistrados" },
  { value: "DADO_DE_BAJA", label: "Dados de baja" },
];

const FILTROS_ESTADO_AMBIENTE: { value: "" | EstadoRegistro; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "REGISTRADO", label: "Registrados" },
  { value: "DADO_DE_BAJA", label: "Dados de baja" },
];

type ActivosListVariant = "entity" | "global" | "ambiente";

interface ActivosCampoListProps {
  className?: string;
  variant?: ActivosListVariant;
  compactLayout?: boolean;
  toolbarExtra?: ReactNode;
  statusBanner?: ReactNode;
  entidades: Entidad[];
  entidadId: string;
  onEntidadChange?: (id: string) => void;
  activos: ActivoConUbicacion[];
  loading: boolean;
  online: boolean;
  fixedSedeId?: string;
  fixedAmbienteId?: string;
  esAmbientePreregistro?: boolean;
  ambienteFilter?: { id: string; nombre: string };
  onClearAmbienteFilter?: () => void;
  onPrintLabel: (activo: ActivoConUbicacion) => void;
  onPrintBatch?: (activos: ActivoConUbicacion[]) => void;
  onEditActivo?: (activo: ActivoConUbicacion) => void;
  onIrAmbiente?: (activo: ActivoConUbicacion) => void;
  onAbrirAmbienteDestino?: (destino: AmbienteDestinoNavigation) => void;
  onActivoUpdated: (activo: ActivoConUbicacion) => void;
  exportMeta?: InventarioExportMeta;
  reportesExport?: ReactNode;
}

export function ActivosCampoList({
  className,
  variant = "entity",
  compactLayout = false,
  toolbarExtra,
  statusBanner,
  entidades,
  entidadId,
  onEntidadChange,
  activos,
  loading,
  online,
  fixedSedeId,
  fixedAmbienteId,
  esAmbientePreregistro = false,
  ambienteFilter,
  onClearAmbienteFilter,
  onPrintLabel,
  onPrintBatch,
  onEditActivo,
  onIrAmbiente,
  onAbrirAmbienteDestino,
  onActivoUpdated,
  exportMeta,
  reportesExport,
}: ActivosCampoListProps) {
  const isGlobal = variant === "global";
  const isAmbiente = variant === "ambiente";
  const hideUbicacionFilters = isAmbiente;
  const [filter, setFilter] = useState("");
  const [estadoRegistro, setEstadoRegistro] = useState<"" | EstadoRegistro>(
    esAmbientePreregistro ? "PREREGISTRADO" : "",
  );
  const [filterEntidadId, setFilterEntidadId] = useState("");
  const [sedeId, setSedeId] = useState(fixedSedeId ?? "");
  const [ambienteId, setAmbienteId] = useState(fixedAmbienteId ?? ambienteFilter?.id ?? "");
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [selectedActivos, setSelectedActivos] = useState<ActivoConUbicacion[]>([]);

  const sedesEntidadId = isGlobal ? filterEntidadId : entidadId;

  useEffect(() => {
    if (fixedSedeId) setSedeId(fixedSedeId);
  }, [fixedSedeId]);

  useEffect(() => {
    if (fixedAmbienteId) setAmbienteId(fixedAmbienteId);
  }, [fixedAmbienteId]);

  useEffect(() => {
    if (!sedesEntidadId) {
      if (!isAmbiente) {
        setSedes([]);
        if (!fixedSedeId) setSedeId("");
        if (!fixedAmbienteId) setAmbienteId("");
        setAmbientes([]);
      }
      return;
    }
    void listSedes(sedesEntidadId).then(setSedes);
  }, [sedesEntidadId, isAmbiente, fixedSedeId, fixedAmbienteId]);

  useEffect(() => {
    if (!sedeId) {
      setAmbientes([]);
      return;
    }
    void listAmbientes(sedeId).then(setAmbientes);
  }, [sedeId]);

  useEffect(() => {
    if (!ambienteFilter || !entidadId) return;
    setAmbienteId(ambienteFilter.id);
    const match = activos.find((a) => a.ambiente_id === ambienteFilter.id);
    if (match?.sede_id) {
      setSedeId(match.sede_id);
      return;
    }
    void listAmbientesPorEntidad(entidadId).then((all) => {
      const amb = all.find((a) => a.id === ambienteFilter.id);
      if (!amb) return;
      setSedeId(amb.sede_id);
      void listAmbientes(amb.sede_id).then(setAmbientes);
    });
  }, [ambienteFilter, entidadId, activos]);

  async function handleEntidadFilterChange(value: string) {
    if (isGlobal) {
      setFilterEntidadId(value);
    } else {
      onEntidadChange?.(value);
    }
    if (!fixedSedeId) setSedeId("");
    if (!fixedAmbienteId) setAmbienteId("");
    setAmbientes([]);
    onClearAmbienteFilter?.();
    if (!value) {
      setSedes([]);
      return;
    }
    const data = await listSedes(value);
    setSedes(data);
  }

  async function handleSedeFilterChange(value: string) {
    setSedeId(value);
    setAmbienteId("");
    onClearAmbienteFilter?.();
    if (!value) {
      setAmbientes([]);
      return;
    }
    const data = await listAmbientes(value);
    setAmbientes(data);
  }

  function limpiarFiltros() {
    if (isGlobal) setFilterEntidadId("");
    if (!fixedSedeId) setSedeId("");
    if (!fixedAmbienteId) setAmbienteId("");
    setEstadoRegistro(esAmbientePreregistro ? "PREREGISTRADO" : "");
    setFilter("");
    setSedes([]);
    setAmbientes([]);
    onClearAmbienteFilter?.();
  }

  const hasActiveFilters = Boolean(
    (isGlobal && filterEntidadId) ||
      sedeId ||
      ambienteId ||
      estadoRegistro ||
      filter.trim(),
  );

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return activos.filter((a) => {
      if (isGlobal && filterEntidadId && a.entidad_id !== filterEntidadId) return false;
      if (!isGlobal && !isAmbiente && entidadId && a.entidad_id !== entidadId) return false;
      const sedeFiltro = fixedSedeId ?? sedeId;
      const ambienteFiltro = fixedAmbienteId ?? ambienteId;
      if (sedeFiltro && a.sede_id !== sedeFiltro) return false;
      if (ambienteFiltro && a.ambiente_id !== ambienteFiltro) return false;
      if (isAmbiente && esAmbientePreregistro) {
        if (a.estado_registro !== "PREREGISTRADO") return false;
      } else if (isAmbiente && a.estado_registro === "PREREGISTRADO") {
        return false;
      } else if (estadoRegistro && a.estado_registro !== estadoRegistro) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        a.nombre,
        a.codigo_barras,
        a.codigo_catalogo,
        a.entidad_nombre,
        a.ambiente_nombre,
        a.sede_nombre,
        a.marca,
        a.modelo,
        a.motivo_baja,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [
    activos,
    sedeId,
    ambienteId,
    fixedSedeId,
    fixedAmbienteId,
    estadoRegistro,
    filter,
    isGlobal,
    isAmbiente,
    filterEntidadId,
    entidadId,
    esAmbientePreregistro,
  ]);

  const emptyMessage = isAmbiente
    ? activos.length === 0
      ? "Aún no hay activos en este ambiente. Use «Nuevo activo» para registrar el primero."
      : filtered.length === 0
        ? "No hay activos que coincidan con los filtros aplicados."
        : "No hay activos que coincidan con la búsqueda."
    : isGlobal
      ? activos.length === 0
        ? "No hay activos cargados. Sincronice o espere la conexión."
        : filtered.length === 0
          ? "No hay activos que coincidan con los filtros aplicados."
          : "No hay activos que coincidan con la búsqueda."
      : !entidadId
        ? "Seleccione una entidad para ver el inventario de activos."
        : activos.length === 0
          ? "Aún no hay activos en esta entidad. Use «Registrar activo» o espere la sincronización."
          : filtered.length === 0
            ? "No hay activos que coincidan con los filtros aplicados."
            : "No hay activos que coincidan con la búsqueda.";

  const useCompactGlobal = isGlobal && compactLayout;

  return (
    <div className={`${useCompactGlobal ? "flex min-h-0 min-w-0 flex-col gap-1.5" : "space-y-3"} ${className ?? ""}`}>
      {useCompactGlobal ? (
        <>
          <div className={panelStickyToolbarClass}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="panel-toolbar-title min-w-0">
                <h1 className="panel-toolbar-heading text-foreground">
                  Inventario global
                </h1>
                <p className="panel-toolbar-subtitle">
                  Consulta y gestión de activos en todas las entidades
                </p>
              </div>
              <div className={panelToolbarActionsClass}>
                {toolbarExtra}
                {exportMeta && (
                  <InventarioExportButtons activos={filtered} meta={exportMeta} />
                )}
                {onPrintBatch && selectedActivos.length > 0 && (
                  <Button type="button" size="sm" className="h-8 px-2 text-xs" onClick={() => onPrintBatch(selectedActivos)}>
                    Imprimir lote ({selectedActivos.length})
                  </Button>
                )}
                <span className="text-sm text-muted-foreground">
                  {filtered.length} {filtered.length === 1 ? "activo" : "activos"}
                  {loading ? " · …" : ""}
                </span>
              </div>
            </div>

            <div className={panelFilterRowClass} role="tablist" aria-label="Estado del activo">
              <div className="inline-flex flex-wrap gap-0.5 rounded-md border border-border/60 bg-muted/30 p-0.5">
                {FILTROS_ESTADO.map((f) => (
                  <button
                    key={f.value || "all"}
                    type="button"
                    role="tab"
                    aria-selected={estadoRegistro === f.value}
                    className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                      estadoRegistro === f.value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setEstadoRegistro(f.value)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 md:justify-end">
                <div className="min-w-[10rem] flex-1 md:max-w-xs [&_input]:h-8 [&_input]:py-1 [&_input]:text-sm">
                  <PanelSearchInput
                    value={filter}
                    onChange={setFilter}
                    placeholder="Buscar código, nombre, entidad…"
                  />
                </div>

                <Select
                  aria-label="Entidad"
                  size="compact"
                  value={filterEntidadId}
                  onChange={(value) => void handleEntidadFilterChange(value)}
                  options={[
                    { value: "", label: "Entidad: todas" },
                    ...entidades.map((e) => ({ value: e.id, label: e.nombre })),
                  ]}
                />

                <Select
                  aria-label="Sede"
                  size="compact"
                  value={sedeId}
                  disabled={!filterEntidadId}
                  onChange={(value) => void handleSedeFilterChange(value)}
                  options={[
                    { value: "", label: "Sede: todas" },
                    ...sedes.map((s) => ({ value: s.id, label: s.nombre })),
                  ]}
                />

                <Select
                  aria-label="Ambiente"
                  size="compact"
                  value={ambienteId}
                  disabled={!sedeId}
                  onChange={(value) => {
                    setAmbienteId(value);
                    onClearAmbienteFilter?.();
                  }}
                  options={[
                    { value: "", label: "Ambiente: todos" },
                    ...ambientes.map((a) => ({ value: a.id, label: a.nombre })),
                  ]}
                />

                {hasActiveFilters && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-xs"
                    onClick={limpiarFiltros}
                  >
                    Limpiar
                  </Button>
                )}
              </div>
            </div>
          </div>

          {statusBanner}
        </>
      ) : isAmbiente ? (
        <>
          <div className="flex flex-nowrap items-center justify-between gap-2 pb-0.5">
            {!esAmbientePreregistro && (
              <div
                className="inline-flex min-w-0 shrink overflow-x-auto gap-0.5 rounded-md border border-border/60 bg-muted/30 p-0.5"
                role="tablist"
                aria-label="Estado del activo"
              >
                {FILTROS_ESTADO_AMBIENTE.map((f) => (
                  <button
                    key={f.value || "all"}
                    type="button"
                    role="tab"
                    aria-selected={estadoRegistro === f.value}
                    className={`shrink-0 rounded px-2 py-1 text-xs font-medium transition-colors ${
                      estadoRegistro === f.value
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setEstadoRegistro(f.value)}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
            <div className={`flex shrink-0 flex-nowrap items-center gap-2 ${esAmbientePreregistro ? "ml-auto w-full justify-between" : ""}`}>
              {reportesExport ??
                (exportMeta && (
                  <InventarioExportButtons activos={filtered} meta={exportMeta} />
                ))}
              {onPrintBatch && selectedActivos.length > 0 && (
                <Button type="button" size="sm" className="h-8 shrink-0 px-2 text-xs" onClick={() => onPrintBatch(selectedActivos)}>
                  Imprimir lote ({selectedActivos.length})
                </Button>
              )}
              <span className="shrink-0 text-xs text-muted-foreground">
                {filtered.length} {filtered.length === 1 ? "activo" : "activos"}
                {loading ? " · …" : ""}
              </span>
              {toolbarExtra}
            </div>
          </div>

          <PanelSearchInput
            value={filter}
            onChange={setFilter}
            placeholder="Buscar por código, nombre, sede o ambiente…"
          />
        </>
      ) : (
        <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {FILTROS_ESTADO.map((f) => (
            <Button
              key={f.value || "all"}
              type="button"
              size="sm"
              variant={estadoRegistro === f.value ? "default" : "outline"}
              onClick={() => setEstadoRegistro(f.value)}
            >
              {f.label}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {exportMeta && (
            <InventarioExportButtons activos={filtered} meta={exportMeta} />
          )}
          {onPrintBatch && selectedActivos.length > 0 && (
            <Button type="button" size="sm" onClick={() => onPrintBatch(selectedActivos)}>
              Imprimir lote ({selectedActivos.length})
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "activo" : "activos"}
            {loading ? " · …" : ""}
          </span>
        </div>
      </div>

      {!hideUbicacionFilters && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <label htmlFor="filtro_entidad" className="text-xs font-medium text-muted-foreground">
              Entidad
            </label>
            <Select
              id="filtro_entidad"
              value={isGlobal ? filterEntidadId : entidadId}
              onChange={(value) => void handleEntidadFilterChange(value)}
              options={[
                { value: "", label: isGlobal ? "Todas" : "Seleccione…" },
                ...entidades.map((e) => ({ value: e.id, label: e.nombre })),
              ]}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="filtro_sede" className="text-xs font-medium text-muted-foreground">
              Sede
            </label>
            <Select
              id="filtro_sede"
              value={sedeId}
              disabled={!sedesEntidadId}
              onChange={(value) => void handleSedeFilterChange(value)}
              options={[
                { value: "", label: "Todas" },
                ...sedes.map((s) => ({ value: s.id, label: s.nombre })),
              ]}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="filtro_ambiente" className="text-xs font-medium text-muted-foreground">
              Ambiente
            </label>
            <Select
              id="filtro_ambiente"
              value={ambienteId}
              disabled={!sedeId}
              onChange={(value) => {
                setAmbienteId(value);
                onClearAmbienteFilter?.();
              }}
              options={[
                { value: "", label: "Todos" },
                ...ambientes.map((a) => ({ value: a.id, label: a.nombre })),
              ]}
            />
          </div>
          <div className="flex items-end sm:col-span-2 lg:col-span-1">
            <Button type="button" variant="outline" className="w-full" onClick={limpiarFiltros}>
              Limpiar filtros
            </Button>
          </div>
        </div>
      )}

      <PanelSearchInput
        value={filter}
        onChange={setFilter}
        placeholder={
          isGlobal
            ? "Buscar por código, nombre, entidad, sede o ambiente…"
            : "Buscar por código, nombre, sede o ambiente…"
        }
      />
        </>
      )}

      <ActivosInventarioExcelView
        activos={filtered}
        entidadId={entidadId}
        online={online}
        emptyMessage={emptyMessage}
        mostrarPosibleAmbiente={esAmbientePreregistro}
        onPrintLabel={onPrintLabel}
        onActivoUpdated={onActivoUpdated}
        onPrintBatch={onPrintBatch}
        onEditActivo={onEditActivo}
        onIrAmbiente={isGlobal ? onIrAmbiente : undefined}
        onAbrirAmbienteDestino={onAbrirAmbienteDestino}
        onSelectionChange={setSelectedActivos}
      />
    </div>
  );
}
