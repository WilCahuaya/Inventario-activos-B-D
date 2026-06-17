import { useCallback, useEffect, useMemo, useState } from "react";
import type { Entidad, ResponsableConConteo, SedeConConteo } from "@inventario/types";
import { panelFieldsetClass } from "@inventario/ui/panel";
import { Button, Dialog, ResponsablesPanel, Select } from "@inventario/ui";
import {
  ActivosIcon,
  DeleteIcon,
  EditIcon,
  PanelBanner,
  PanelCountLabel,
  PanelDataTable,
  PanelIconAction,
  PanelNavAction,
  PanelTableActions,
  PanelTableColgroup,
  PanelTableTd,
  PanelTableTh,
  PanelEmptyState,
  PanelPageHeader,
  PanelSearchInput,
  PanelTabs,
  PanelToolbar,
  PanelViewToggle,
  StatusBadge,
  AMBIENTES_TABLE_COL_WIDTHS_PCT,
  panelCardClass,
  panelTableBodyRowClass,
  panelTableHeadRowClass,
  panelTableShrinkCellClass,
  panelTableStickyHeadClass,
  useStoredViewMode,
} from "@inventario/ui/panel";
import { AmbienteFormFields, ambienteFromForm } from "./AmbienteFormFields";
import { ConfirmDialog } from "@inventario/ui";
import { GestionarSucursales } from "./GestionarSucursales";
import {
  createAmbiente,
  deleteAmbiente,
  listAmbientesPorEntidad,
  listSedesConConteo,
  updateAmbiente,
  type AmbienteConSede,
} from "../lib/ubicacion";
import {
  createResponsable,
  deleteResponsable,
  listResponsables,
  setResponsableActivo,
  updateResponsable,
} from "../lib/responsables";

type EntityTab = "ambientes" | "responsables" | "sucursales";

const ENTITY_TABS: { id: EntityTab; label: string }[] = [
  { id: "ambientes", label: "Ambientes" },
  { id: "responsables", label: "Responsables" },
  { id: "sucursales", label: "Sucursales" },
];

interface AmbientesViewProps {
  entidades: Entidad[];
  entidad: Entidad;
  entidadId: string;
  onEntidadChange?: (id: string) => void;
  drillDown?: boolean;
  online: boolean;
  onViewActivos: (ambiente: AmbienteConSede) => void;
  initialTab?: EntityTab;
}

function AmbienteCard({
  ambiente,
  entidadNombre,
  onEdit,
  onDelete,
  onViewActivos,
}: {
  ambiente: AmbienteConSede;
  entidadNombre: string;
  onEdit: () => void;
  onDelete: () => void;
  onViewActivos: () => void;
}) {
  return (
    <article className={`${panelCardClass} flex flex-col`}>
      <div className="flex items-start justify-between gap-2 border-b border-border/50 px-4 py-3">
        <h3 className="font-semibold leading-snug text-primary">{ambiente.nombre}</h3>
        <StatusBadge variant="active">Activo</StatusBadge>
      </div>

      <div className="flex flex-1 flex-col gap-2 px-4 py-3 text-sm">
        <p className="font-medium text-foreground">
          {ambiente.responsable ?? "Sin responsable asignado"}
        </p>
        {ambiente.descripcion ? (
          <p className="text-muted-foreground">{ambiente.descripcion}</p>
        ) : (
          <p className="italic text-muted-foreground">Sin descripción</p>
        )}
        <p className="text-sm text-muted-foreground">
          {ambiente.activo_count} {ambiente.activo_count === 1 ? "activo" : "activos"}
        </p>
        <p className="mt-auto pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Entidad: {entidadNombre}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border/50 bg-muted/20 px-3 py-2.5">
        <PanelIconAction label="Editar" onClick={onEdit}>
          <EditIcon />
        </PanelIconAction>
        <PanelIconAction label="Eliminar" variant="danger" onClick={onDelete}>
          <DeleteIcon />
        </PanelIconAction>
        <PanelNavAction
          label="Activos"
          icon={<ActivosIcon />}
          className="ml-auto"
          onClick={onViewActivos}
        />
      </div>
    </article>
  );
}

export function AmbientesView({
  entidades,
  entidad,
  entidadId,
  onEntidadChange,
  drillDown = false,
  online,
  onViewActivos,
  initialTab = "ambientes",
}: AmbientesViewProps) {
  const [ambientes, setAmbientes] = useState<AmbienteConSede[]>([]);
  const [sedes, setSedes] = useState<SedeConConteo[]>([]);
  const [responsables, setResponsables] = useState<ResponsableConConteo[]>([]);
  const [tab, setTab] = useState<EntityTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editAmbiente, setEditAmbiente] = useState<AmbienteConSede | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AmbienteConSede | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useStoredViewMode("inventario-view-ambientes", "list");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ambList, sedeList, respList] = await Promise.all([
        listAmbientesPorEntidad(entidad.id),
        listSedesConConteo(entidad.id),
        listResponsables(entidad.id),
      ]);
      setAmbientes(ambList);
      setSedes(sedeList);
      setResponsables(respList.data ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudieron cargar los ambientes";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [entidad.id]);

  useEffect(() => {
    setTab(initialTab);
  }, [entidadId, initialTab]);

  useEffect(() => {
    if (online) void loadData();
    else {
      setLoading(false);
      setAmbientes([]);
      setSedes([]);
      setResponsables([]);
    }
  }, [online, loadData]);

  async function syncAmbientesYResponsables() {
    const [ambResult, respResult] = await Promise.all([
      listAmbientesPorEntidad(entidad.id),
      listResponsables(entidad.id),
    ]);
    setAmbientes(ambResult);
    if (!respResult.error) setResponsables(respResult.data ?? []);
  }

  function responsableNombreById(id: string | null) {
    if (!id) return null;
    return responsables.find((r) => r.id === id)?.nombre ?? null;
  }

  const ambientesFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return ambientes;
    return ambientes.filter(
      (a) =>
        a.nombre.toLowerCase().includes(q) ||
        (a.descripcion?.toLowerCase().includes(q) ?? false) ||
        (a.responsable?.toLowerCase().includes(q) ?? false) ||
        a.sede_nombre.toLowerCase().includes(q),
    );
  }, [ambientes, busqueda]);

  const gruposPorSede = useMemo(() => {
    const porSede = new Map<string, AmbienteConSede[]>();
    for (const amb of ambientesFiltrados) {
      const lista = porSede.get(amb.sede_id) ?? [];
      lista.push(amb);
      porSede.set(amb.sede_id, lista);
    }

    return sedes
      .filter((sede) => porSede.has(sede.id))
      .map((sede) => ({
        sede,
        ambientes: porSede.get(sede.id)!,
      }));
  }, [ambientesFiltrados, sedes]);

  function sortAmbientes(rows: AmbienteConSede[]) {
    return [...rows].sort((a, b) => {
      if (a.sede_es_principal !== b.sede_es_principal) return a.sede_es_principal ? -1 : 1;
      if (a.sede_nombre !== b.sede_nombre) return a.sede_nombre.localeCompare(b.sede_nombre);
      return a.nombre.localeCompare(b.nombre);
    });
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setError(null);

    const input = ambienteFromForm(new FormData(form));
    const sede = sedes.find((s) => s.id === input.sedeId);
    const result = await createAmbiente({
      sedeId: input.sedeId,
      nombre: input.nombre,
      descripcion: input.descripcion,
      responsableId: input.responsableId,
    });

    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    const nuevo: AmbienteConSede = {
      ...result.data!,
      sede_nombre: sede?.nombre ?? "",
      sede_es_principal: sede?.es_principal ?? false,
      activo_count: 0,
      responsable:
        result.data?.responsable ??
        responsableNombreById(input.responsableId) ??
        null,
    };
    setAmbientes((prev) => sortAmbientes([...prev, nuevo]));
    setSedes((prev) =>
      prev.map((s) =>
        s.id === input.sedeId ? { ...s, ambiente_count: s.ambiente_count + 1 } : s,
      ),
    );
    setCreateOpen(false);
    form.reset();
    await syncAmbientesYResponsables();
  }

  async function handleEditAmbiente(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editAmbiente) return;
    setPending(true);
    setError(null);

    const input = ambienteFromForm(new FormData(event.currentTarget));
    const result = await updateAmbiente(editAmbiente.id, input);

    setPending(false);
    if (result.error) {
      setError(result.error);
      return;
    }

    setAmbientes((prev) =>
      prev.map((a) =>
        a.id === editAmbiente.id
          ? {
              ...a,
              nombre: input.nombre.trim(),
              descripcion: input.descripcion.trim() || null,
              responsable_id: input.responsableId,
              responsable: responsableNombreById(input.responsableId),
            }
          : a,
      ),
    );
    setEditAmbiente(null);
    await syncAmbientesYResponsables();
  }

  async function confirmDeleteAmbiente() {
    if (!deleteTarget) return;
    setPending(true);
    setError(null);

    const result = await deleteAmbiente(deleteTarget.id);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setAmbientes((prev) => prev.filter((a) => a.id !== deleteTarget.id));
    setSedes((prev) =>
      prev.map((s) =>
        s.id === deleteTarget.sede_id
          ? { ...s, ambiente_count: Math.max(0, s.ambiente_count - 1) }
          : s,
      ),
    );
    setDeleteTarget(null);
    await syncAmbientesYResponsables();
  }

  return (
    <div className="space-y-4">
      {!drillDown && (
        <PanelPageHeader
          title="Gestión de ambientes"
          subtitle="Administra los ambientes y sucursales de la entidad"
          actions={
            <Button
              type="button"
              disabled={!online || sedes.length === 0}
              onClick={() => {
                setError(null);
                setCreateOpen(true);
              }}
            >
              + Crear ambiente
            </Button>
          }
        />
      )}

      {!drillDown && entidades.length > 1 && onEntidadChange ? (
        <div className="grid gap-4 md:grid-cols-2 md:items-stretch">
          <fieldset className={panelFieldsetClass}>
            <legend className="px-1 text-sm font-semibold text-foreground">Entidad de trabajo</legend>
            <Select
              value={entidadId}
              onChange={onEntidadChange}
              options={entidades.map((e) => ({ value: e.id, label: e.nombre }))}
            />
          </fieldset>
          <PanelBanner
            label="Entidad"
            title={entidad.nombre}
            subtitle={entidad.ruc ? `RUC ${entidad.ruc}` : undefined}
          />
        </div>
      ) : null}

      {!online && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          Sin conexión: la gestión de ambientes requiere internet.
        </p>
      )}

      {online && (
        <>
          <PanelTabs tabs={ENTITY_TABS} value={tab} onChange={setTab} />

          {tab === "responsables" ? (
            <ResponsablesPanel
              responsables={responsables}
              onCreate={async (input) => {
                const result = await createResponsable(entidad.id, input);
                if (result.data) {
                  await syncAmbientesYResponsables();
                  return { data: { ...result.data, ambiente_count: 0 } };
                }
                return { error: result.error };
              }}
              onUpdate={async (id, input) => {
                const result = await updateResponsable(id, input);
                if (!result.error) await syncAmbientesYResponsables();
                return result;
              }}
              onSetActivo={setResponsableActivo}
              onDelete={deleteResponsable}
              onReload={syncAmbientesYResponsables}
            />
          ) : tab === "sucursales" ? (
            <GestionarSucursales
              entidadId={entidad.id}
              sedes={sedes}
              onSedesChange={(next) => {
                setSedes(next);
                setAmbientes((prev) =>
                  prev.map((a) => {
                    const sede = next.find((s) => s.id === a.sede_id);
                    if (!sede) return a;
                    return {
                      ...a,
                      sede_nombre: sede.nombre,
                      sede_es_principal: sede.es_principal,
                    };
                  }),
                );
                void syncAmbientesYResponsables();
              }}
            />
          ) : (
            <>
              <PanelToolbar
                left={
                  <PanelCountLabel
                    count={ambientesFiltrados.length}
                    singular="ambiente"
                    plural="ambientes"
                  />
                }
                right={
                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                    <div className="min-w-[200px] flex-1 sm:max-w-sm sm:flex-none">
                      <PanelSearchInput
                        value={busqueda}
                        onChange={setBusqueda}
                        placeholder="Buscar ambiente, responsable o sucursal…"
                      />
                    </div>
                    <PanelViewToggle value={viewMode} onChange={setViewMode} />
                    <Button
                      type="button"
                      size="sm"
                      disabled={loading || sedes.length === 0}
                      onClick={() => {
                        setError(null);
                        setCreateOpen(true);
                      }}
                    >
                      + Crear ambiente
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      onClick={() => void loadData()}
                    >
                      Actualizar
                    </Button>
                  </div>
                }
              />

              {error && !createOpen && !editAmbiente && !deleteTarget && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              {loading ? (
                <p className="text-sm text-muted-foreground">Cargando ambientes…</p>
              ) : gruposPorSede.length === 0 ? (
                <PanelEmptyState
                  message={
                    busqueda.trim()
                      ? "No hay ambientes que coincidan con la búsqueda."
                      : "No hay ambientes registrados."
                  }
                  action={
                    !busqueda.trim() && sedes.length > 0 ? (
                      <Button type="button" onClick={() => setCreateOpen(true)}>
                        + Crear primer ambiente
                      </Button>
                    ) : undefined
                  }
                />
              ) : viewMode === "list" ? (
                <PanelDataTable>
                  <PanelTableColgroup widths={AMBIENTES_TABLE_COL_WIDTHS_PCT} />
                  <thead className={panelTableStickyHeadClass}>
                    <tr className={panelTableHeadRowClass}>
                      <PanelTableTh>Ambiente</PanelTableTh>
                      <PanelTableTh>Responsable</PanelTableTh>
                      <PanelTableTh>Descripción</PanelTableTh>
                      <PanelTableTh>Sucursal</PanelTableTh>
                      <PanelTableTh align="center" className={panelTableShrinkCellClass}>
                        Activos
                      </PanelTableTh>
                      <PanelTableTh>Estado</PanelTableTh>
                      <PanelTableTh align="right">Acciones</PanelTableTh>
                    </tr>
                  </thead>
                  <tbody>
                    {ambientesFiltrados.map((amb) => (
                      <tr key={amb.id} className={panelTableBodyRowClass}>
                        <PanelTableTd className="font-medium text-primary" title={amb.nombre}>
                          {amb.nombre}
                        </PanelTableTd>
                        <PanelTableTd title={amb.responsable ?? undefined}>
                          {amb.responsable ?? "—"}
                        </PanelTableTd>
                        <PanelTableTd className="text-muted-foreground" title={amb.descripcion ?? undefined}>
                          {amb.descripcion ?? "—"}
                        </PanelTableTd>
                        <PanelTableTd title={amb.sede_nombre}>{amb.sede_nombre}</PanelTableTd>
                        <PanelTableTd align="center" className={panelTableShrinkCellClass}>
                          {amb.activo_count}
                        </PanelTableTd>
                        <PanelTableTd>
                          <StatusBadge variant="active">Activo</StatusBadge>
                        </PanelTableTd>
                        <PanelTableTd align="right" className="overflow-visible">
                          <PanelTableActions
                            onEdit={() => {
                              setError(null);
                              setEditAmbiente(amb);
                            }}
                            onDelete={() => {
                              setError(null);
                              setDeleteTarget(amb);
                            }}
                            nav={{
                              label: "Activos",
                              kind: "activos",
                              onClick: () => onViewActivos(amb),
                            }}
                          />
                        </PanelTableTd>
                      </tr>
                    ))}
                  </tbody>
                </PanelDataTable>
          ) : (
            <div className="space-y-8">
              {gruposPorSede.map(({ sede, ambientes: lista }) => (
                <section key={sede.id}>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold uppercase tracking-wide text-primary">
                      {sede.nombre}
                    </h2>
                    <span className="text-sm text-muted-foreground">
                      {lista.length} {lista.length === 1 ? "ambiente" : "ambientes"}
                    </span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {lista.map((amb) => (
                      <AmbienteCard
                        key={amb.id}
                        ambiente={amb}
                        entidadNombre={entidad.nombre}
                        onEdit={() => {
                          setError(null);
                          setEditAmbiente(amb);
                        }}
                        onDelete={() => {
                          setError(null);
                          setDeleteTarget(amb);
                        }}
                        onViewActivos={() => onViewActivos(amb)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
            </>
          )}
        </>
      )}

      <Dialog
        open={createOpen}
        onClose={() => {
          setCreateOpen(false);
          setError(null);
        }}
        title="Nuevo ambiente"
        description="Registre un ambiente en la sucursal que corresponda."
      >
        <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
          <AmbienteFormFields sedes={sedes} responsables={responsables} showSedeSelect />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || sedes.length === 0}>
              {pending ? "Guardando…" : "Crear ambiente"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={!!editAmbiente}
        onClose={() => {
          setEditAmbiente(null);
          setError(null);
        }}
        title="Editar ambiente"
        description={editAmbiente?.nombre}
      >
        {editAmbiente && (
          <form onSubmit={(e) => void handleEditAmbiente(e)} className="space-y-4">
            <AmbienteFormFields ambiente={editAmbiente} sedes={sedes} responsables={responsables} />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditAmbiente(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Guardando…" : "Guardar cambios"}
              </Button>
            </div>
          </form>
        )}
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => {
          setDeleteTarget(null);
          setError(null);
        }}
        title="Eliminar ambiente"
        description={
          deleteTarget
            ? `¿Eliminar el ambiente «${deleteTarget.nombre}»? Solo es posible si no tiene activos registrados.`
            : undefined
        }
        confirmLabel="Eliminar"
        confirmVariant="destructive"
        pending={pending}
        error={deleteTarget ? error : null}
        onConfirm={() => void confirmDeleteAmbiente()}
      />
    </div>
  );
}
