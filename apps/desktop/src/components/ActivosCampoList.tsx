import { useEffect, useMemo, useState } from "react";
import type { Ambiente, Entidad, EstadoRegistro, Sede } from "@inventario/types";
import { Button } from "@inventario/ui";
import { listAmbientes, listAmbientesPorEntidad, listSedes } from "../lib/ubicacion";
import {
  PanelEmptyState,
  PanelSearchInput,
  StatusBadge,
  TablePagination,
  panelCardClass,
  useTablePagination,
} from "@inventario/ui/panel";
import type { ActivoConUbicacion } from "../lib/activos";
import { ActivosCampoAcciones } from "./ActivosCampoAcciones";

const thBase =
  "border-b border-r border-border/50 px-1.5 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wide last:border-r-0 lg:px-2";
const thStd = `${thBase} bg-muted/50 text-foreground/80`;
const thAccent = `${thBase} bg-primary/10 text-primary`;
const tdBase =
  "border-b border-r border-border/40 px-1.5 py-1.5 text-xs text-foreground last:border-r-0 lg:px-2";

const selectClass =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

const FILTROS_ESTADO: { value: "" | EstadoRegistro; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "REGISTRADO", label: "Registrados" },
  { value: "PREREGISTRADO", label: "Preregistrados" },
  { value: "DADO_DE_BAJA", label: "Dados de baja" },
];

interface ActivosCampoListProps {
  className?: string;
  entidades: Entidad[];
  entidadId: string;
  onEntidadChange: (id: string) => void;
  activos: ActivoConUbicacion[];
  loading: boolean;
  online: boolean;
  ambienteFilter?: { id: string; nombre: string };
  onClearAmbienteFilter?: () => void;
  onOpenFicha: (activo: ActivoConUbicacion) => void;
  onPrintLabel: (activo: ActivoConUbicacion) => void;
  onPrintBatch?: (activos: ActivoConUbicacion[]) => void;
  onActivoUpdated: (activo: ActivoConUbicacion) => void;
}

function puedeImprimirEtiqueta(activo: ActivoConUbicacion): boolean {
  return activo.estado_registro === "REGISTRADO" && Boolean(activo.codigo_barras);
}

function ubicacionLabel(activo: ActivoConUbicacion): string {
  return [activo.sede_nombre, activo.ambiente_nombre].filter(Boolean).join(" · ") || "—";
}

function estadoBadgeVariant(estado: EstadoRegistro): "active" | "pending" | "default" {
  if (estado === "REGISTRADO") return "active";
  if (estado === "PREREGISTRADO") return "pending";
  return "default";
}

function estadoLabel(estado: EstadoRegistro): string {
  if (estado === "PREREGISTRADO") return "Preregistrado";
  if (estado === "DADO_DE_BAJA") return "Baja";
  return "Registrado";
}

export function ActivosCampoList({
  className,
  entidades,
  entidadId,
  onEntidadChange,
  activos,
  loading,
  online,
  ambienteFilter,
  onClearAmbienteFilter,
  onOpenFicha,
  onPrintLabel,
  onPrintBatch,
  onActivoUpdated,
}: ActivosCampoListProps) {
  const [filter, setFilter] = useState("");
  const [estadoRegistro, setEstadoRegistro] = useState<"" | EstadoRegistro>("");
  const [sedeId, setSedeId] = useState("");
  const [ambienteId, setAmbienteId] = useState("");
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!entidadId) {
      setSedes([]);
      setSedeId("");
      setAmbienteId("");
      setAmbientes([]);
      return;
    }
    void listSedes(entidadId).then(setSedes);
  }, [entidadId]);

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
    onEntidadChange(value);
    setSedeId("");
    setAmbienteId("");
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
    setSedeId("");
    setAmbienteId("");
    setEstadoRegistro("");
    setFilter("");
    setAmbientes([]);
    onClearAmbienteFilter?.();
  }

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return activos.filter((a) => {
      if (sedeId && a.sede_id !== sedeId) return false;
      if (ambienteId && a.ambiente_id !== ambienteId) return false;
      if (estadoRegistro && a.estado_registro !== estadoRegistro) return false;
      if (!q) return true;
      const haystack = [
        a.nombre,
        a.codigo_barras,
        a.codigo_catalogo,
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
  }, [activos, sedeId, ambienteId, estadoRegistro, filter]);

  const paginationKey = useMemo(
    () =>
      `${filtered.length}:${filtered[0]?.id ?? ""}:${estadoRegistro}:${sedeId}:${ambienteId}`,
    [filtered, estadoRegistro, sedeId, ambienteId],
  );
  const {
    paginated,
    page,
    setPage,
    totalPages,
    total,
    rangeStart,
    rangeEnd,
    pageSize,
    rowOffset,
  } = useTablePagination(filtered, paginationKey);

  const printableOnPage = paginated.filter(puedeImprimirEtiqueta);
  const allPageSelected =
    printableOnPage.length > 0 && printableOnPage.every((a) => selectedIds.has(a.id));
  const selectedActivos = filtered.filter((a) => selectedIds.has(a.id) && puedeImprimirEtiqueta(a));

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
        for (const a of printableOnPage) next.delete(a.id);
      } else {
        for (const a of printableOnPage) next.add(a.id);
      }
      return next;
    });
  }

  const emptyMessage = !entidadId
    ? "Seleccione una entidad para ver el inventario de activos."
    : activos.length === 0
      ? "Aún no hay activos en esta entidad. Use «Registrar activo» o espere la sincronización."
      : filtered.length === 0
        ? "No hay activos que coincidan con los filtros aplicados."
        : "No hay activos que coincidan con la búsqueda.";

  return (
    <div className={`space-y-3 ${className ?? ""}`}>
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
          {onPrintBatch && selectedActivos.length > 0 && (
            <Button
              type="button"
              size="sm"
              onClick={() => onPrintBatch(selectedActivos)}
            >
              Imprimir lote ({selectedActivos.length})
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            {total} {total === 1 ? "activo" : "activos"}
            {total > pageSize ? ` · pág. ${page}/${totalPages}` : ""}
            {loading ? " · …" : ""}
          </span>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <label htmlFor="filtro_entidad" className="text-xs font-medium text-muted-foreground">
            Entidad
          </label>
          <select
            id="filtro_entidad"
            className={selectClass}
            value={entidadId}
            onChange={(e) => void handleEntidadFilterChange(e.target.value)}
          >
            <option value="">Todas</option>
            {entidades.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="filtro_sede" className="text-xs font-medium text-muted-foreground">
            Sede
          </label>
          <select
            id="filtro_sede"
            className={selectClass}
            value={sedeId}
            disabled={!entidadId}
            onChange={(e) => void handleSedeFilterChange(e.target.value)}
          >
            <option value="">Todas</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label htmlFor="filtro_ambiente" className="text-xs font-medium text-muted-foreground">
            Ambiente
          </label>
          <select
            id="filtro_ambiente"
            className={selectClass}
            value={ambienteId}
            disabled={!sedeId}
            onChange={(e) => {
              setAmbienteId(e.target.value);
              onClearAmbienteFilter?.();
            }}
          >
            <option value="">Todos</option>
            {ambientes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end sm:col-span-2 lg:col-span-1">
          <Button type="button" variant="outline" className="w-full" onClick={limpiarFiltros}>
            Limpiar filtros
          </Button>
        </div>
      </div>

      <PanelSearchInput
        value={filter}
        onChange={setFilter}
        placeholder="Buscar por código, nombre, sede o ambiente…"
      />

      <div className="overflow-hidden rounded-lg border border-border/60 bg-card shadow-sm">
        {total === 0 ? (
          <div className="p-4">
            <PanelEmptyState message={emptyMessage} />
          </div>
        ) : (
          <>
            <div className="p-2 sm:hidden">
              <div className="grid gap-3">
                {paginated.map((activo) => {
                  const inactivo = activo.estado_registro === "DADO_DE_BAJA";
                  return (
                    <article
                      key={activo.id}
                      className={`${panelCardClass} flex flex-col ${inactivo ? "opacity-75" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-border/50 px-3 py-2">
                        {onPrintBatch && puedeImprimirEtiqueta(activo) && (
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 shrink-0 rounded border-input"
                            checked={selectedIds.has(activo.id)}
                            onChange={() => toggleSelect(activo.id)}
                            aria-label={`Seleccionar ${activo.nombre}`}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <h3
                            className={`truncate text-sm font-semibold text-foreground ${inactivo ? "line-through decoration-muted-foreground/50" : ""}`}
                          >
                            {activo.nombre}
                          </h3>
                          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                            {activo.codigo_barras ?? activo.codigo_catalogo}
                          </p>
                        </div>
                        <StatusBadge variant={estadoBadgeVariant(activo.estado_registro)}>
                          {estadoLabel(activo.estado_registro)}
                        </StatusBadge>
                      </div>
                      <div className="space-y-1 px-3 py-2 text-xs text-muted-foreground">
                        <p>
                          Ubicación:{" "}
                          <span className="font-medium text-foreground">{ubicacionLabel(activo)}</span>
                        </p>
                      </div>
                      <div className="border-t border-border/50 bg-muted/20 px-3 py-2">
                        <ActivosCampoAcciones
                          entidadId={entidadId}
                          activo={activo}
                          online={online}
                          onOpenFicha={onOpenFicha}
                          onPrintLabel={onPrintLabel}
                          onValidated={onActivoUpdated}
                          compact
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            <div className="hidden overflow-x-auto sm:block">
              <table className="w-full table-fixed border-collapse">
                <colgroup>
                  {onPrintBatch && <col style={{ width: "3%" }} />}
                  <col style={{ width: "4%" }} />
                  <col style={{ width: "9%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "13%" }} />
                  <col style={{ width: "24%" }} />
                  <col style={{ width: "17%" }} />
                  <col style={{ width: "19%" }} />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-card shadow-sm">
                  <tr>
                    {onPrintBatch && (
                      <th className={`${thStd} normal-case`}>
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-input"
                          checked={allPageSelected}
                          disabled={printableOnPage.length === 0}
                          onChange={toggleSelectAllPage}
                          aria-label="Seleccionar página para impresión"
                        />
                      </th>
                    )}
                    <th className={`${thStd} normal-case`}>N°</th>
                    <th className={thStd}>Estado</th>
                    <th className={thStd}>Cat.</th>
                    <th className={thStd}>Código</th>
                    <th className={`${thStd} normal-case`}>Nombre del bien</th>
                    <th className={`${thStd} normal-case`}>Ubicación</th>
                    <th className={`${thAccent} normal-case`}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((activo, index) => {
                    const rowNum = rowOffset + index + 1;
                    const inactivo = activo.estado_registro === "DADO_DE_BAJA";
                    return (
                      <tr
                        key={activo.id}
                        className={`hover:bg-muted/20 ${inactivo ? "bg-muted/10 opacity-75" : ""}`}
                      >
                        {onPrintBatch && (
                          <td className={`${tdBase} text-center`}>
                            {puedeImprimirEtiqueta(activo) ? (
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-input"
                                checked={selectedIds.has(activo.id)}
                                onChange={() => toggleSelect(activo.id)}
                                aria-label={`Seleccionar ${activo.nombre}`}
                              />
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                        )}
                        <td className={`${tdBase} text-center text-muted-foreground`}>{rowNum}</td>
                        <td className={`${tdBase} text-center`}>
                          <StatusBadge variant={estadoBadgeVariant(activo.estado_registro)}>
                            {estadoLabel(activo.estado_registro)}
                          </StatusBadge>
                        </td>
                        <td className={`${tdBase} text-center font-mono text-[11px]`}>
                          {activo.codigo_catalogo}
                        </td>
                        <td className={`${tdBase} text-center font-mono text-[11px]`}>
                          {activo.codigo_barras ?? "—"}
                        </td>
                        <td className={tdBase}>
                          <span
                            className={`line-clamp-2 font-medium ${inactivo ? "line-through decoration-muted-foreground/50" : ""}`}
                          >
                            {activo.nombre}
                          </span>
                          {activo.motivo_baja && (
                            <span className="mt-0.5 block text-[10px] text-muted-foreground">
                              Baja: {activo.motivo_baja}
                            </span>
                          )}
                        </td>
                        <td className={`${tdBase} text-muted-foreground`}>{ubicacionLabel(activo)}</td>
                        <td className={`${tdBase} text-center`}>
                          <ActivosCampoAcciones
                            entidadId={entidadId}
                            activo={activo}
                            online={online}
                            onOpenFicha={onOpenFicha}
                            onPrintLabel={onPrintLabel}
                            onValidated={onActivoUpdated}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <TablePagination
              page={page}
              totalPages={totalPages}
              total={total}
              rangeStart={rangeStart}
              rangeEnd={rangeEnd}
              pageSize={pageSize}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
