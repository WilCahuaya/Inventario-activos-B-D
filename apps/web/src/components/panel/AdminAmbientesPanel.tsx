"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Entidad, ResponsableConConteo, SedeConConteo, VisitaCampoActiva, VisitaCampoHistorial } from "@inventario/types";
import { Button, Dialog, ResponsablesPanel } from "@inventario/ui";
import {
  ActivosIcon,
  EditIcon,
  PanelDataTable,
  PanelIconAction,
  PanelNavActionLink,
  PanelTableActions,
  PanelTableColgroup,
  PanelTableTd,
  PanelTableTh,
  PanelTabs,
  PanelToolbar,
  PanelViewToggle,
  AMBIENTES_TABLE_COLS,
  AMBIENTES_TABLE_COLS_SIN_SUCURSAL,
  AMBIENTES_TABLE_COLS_VISITA,
  AMBIENTES_TABLE_COLS_SIN_SUCURSAL_VISITA,
  panelTableBodyRowClass,
  panelTableHeadRowClass,
  panelTableShrinkCellClass,
  panelTableStickyHeadClass,
  panelTableNowrapCellClass,
  useStoredViewMode,
  SedeAmbienteFilterSelect,
  VisitasCampoBanner,
  VisitaCampoEstadoBadge,
  VisitasCampoHistorialPanel,
} from "@inventario/ui/panel";
import type { AmbienteConVisita } from "@/lib/actions/visitas-campo";
import {
  attachVisitaEstadoToAmbientes,
  getVisitaCampoDetalle,
} from "@/lib/actions/visitas-campo";
import { createAmbiente, listAmbientesPorEntidad, updateAmbiente } from "@/lib/actions/ubicacion";
import {
  createResponsable,
  deleteResponsable,
  listResponsables,
  setResponsableActivo,
  updateResponsable,
} from "@/lib/actions/responsables";
import { AmbienteFormFields, ambienteFromForm } from "./AmbienteFormFields";
import {
  PanelCountLabel,
  PanelEmptyState,
  PanelPageHeader,
  PanelSearchInput,
  StatusBadge,
  panelCardClass,
} from "./panel-ui";

type AdminEntityTab = "ambientes" | "responsables" | "visitas";

const ADMIN_ENTITY_TABS: { id: AdminEntityTab; label: string }[] = [
  { id: "ambientes", label: "Ambientes" },
  { id: "responsables", label: "Responsables" },
  { id: "visitas", label: "Visitas de campo" },
];

interface AdminAmbientesPanelProps {
  entidad: Entidad;
  ambientes: AmbienteConVisita[];
  sedes: SedeConConteo[];
  responsables: ResponsableConConteo[];
  visitasActivas?: VisitaCampoActiva[];
  visitasHistorial?: VisitaCampoHistorial[];
  initialTab?: AdminEntityTab;
}

export function AdminAmbientesPanel({
  entidad,
  ambientes: initial,
  sedes,
  responsables: initialResponsables,
  visitasActivas: initialVisitasActivas = [],
  visitasHistorial: initialVisitasHistorial = [],
  initialTab = "ambientes",
}: AdminAmbientesPanelProps) {
  const router = useRouter();
  const [tab, setTab] = useState<AdminEntityTab>(initialTab);
  const [ambientes, setAmbientes] = useState(initial);
  const [responsables, setResponsables] = useState(initialResponsables);
  const [busqueda, setBusqueda] = useState("");
  const [sedeFilterId, setSedeFilterId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editAmbiente, setEditAmbiente] = useState<AmbienteConVisita | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useStoredViewMode("inventario-view-ambientes", "list");
  const [visitasHistorial] = useState(initialVisitasHistorial);
  const [detalleVisita, setDetalleVisita] = useState<VisitaCampoHistorial | null>(null);
  const [detalleAmbientes, setDetalleAmbientes] = useState<Awaited<ReturnType<typeof getVisitaCampoDetalle>> | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const visitaAbierta = initialVisitasActivas.length > 0;

  const soloUnaSede = Boolean(sedeFilterId);

  useEffect(() => {
    setSedeFilterId("");
    setBusqueda("");
  }, [entidad.id]);

  async function syncAmbientesYResponsables() {
    const [ambList, respList] = await Promise.all([
      listAmbientesPorEntidad(entidad.id),
      listResponsables(entidad.id),
    ]);
    const enriched = await attachVisitaEstadoToAmbientes(ambList, entidad.id);
    setAmbientes(enriched);
    setResponsables(respList);
    router.refresh();
  }

  async function handleVerDetalleVisita(visita: VisitaCampoHistorial) {
    setDetalleVisita(visita);
    setDetalleLoading(true);
    setDetalleAmbientes(null);
    const detalle = await getVisitaCampoDetalle(visita.id);
    setDetalleAmbientes(detalle);
    setDetalleLoading(false);
  }

  function responsableNombreById(id: string | null) {
    if (!id) return null;
    return responsables.find((r) => r.id === id)?.nombre ?? null;
  }

  const ambientesBase = useMemo(() => {
    if (!sedeFilterId) return ambientes;
    return ambientes.filter((a) => a.sede_id === sedeFilterId);
  }, [ambientes, sedeFilterId]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return ambientesBase;
    return ambientesBase.filter(
      (a) =>
        a.nombre.toLowerCase().includes(q) ||
        (a.descripcion?.toLowerCase().includes(q) ?? false) ||
        (a.responsable?.toLowerCase().includes(q) ?? false) ||
        (!soloUnaSede && a.sede_nombre.toLowerCase().includes(q)),
    );
  }, [ambientesBase, busqueda, soloUnaSede]);

  const gruposPorSede = useMemo(() => {
    const porSede = new Map<string, AmbienteConVisita[]>();
    for (const amb of filtrados) {
      const lista = porSede.get(amb.sede_id) ?? [];
      lista.push(amb);
      porSede.set(amb.sede_id, lista);
    }

    const sedeIds = [...new Set(filtrados.map((a) => a.sede_id))];
    return sedeIds.map((sedeId) => {
      const lista = porSede.get(sedeId) ?? [];
      const sedeNombre = lista[0]?.sede_nombre ?? "Sucursal";
      return { sedeId, sedeNombre, ambientes: lista };
    });
  }, [filtrados]);

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

    const nuevo: AmbienteConVisita = {
      ...result.data!,
      sede_nombre: sede?.nombre ?? "",
      sede_es_principal: sede?.es_principal ?? false,
      activo_count: 0,
      visita_estado: visitaAbierta ? "EN_PROCESO" : null,
      responsable:
        result.data?.responsable ??
        responsableNombreById(input.responsableId) ??
        null,
    };
    setAmbientes((prev) =>
      [...prev, nuevo].sort((a, b) => {
        if (a.sede_es_principal !== b.sede_es_principal) return a.sede_es_principal ? -1 : 1;
        if (a.sede_nombre !== b.sede_nombre) return a.sede_nombre.localeCompare(b.sede_nombre);
        return a.nombre.localeCompare(b.nombre);
      }),
    );
    setCreateOpen(false);
    form.reset();
    await syncAmbientesYResponsables();
    router.refresh();
  }

  async function handleEdit(event: React.FormEvent<HTMLFormElement>) {
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
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <PanelPageHeader
        title={entidad.nombre}
        subtitle={
          entidad.ruc
            ? `RUC ${entidad.ruc} · Ambientes y responsables`
            : "Ambientes y responsables"
        }
        backHref="/admin/inventario"
        backLabel="Inventario global"
      />

      <PanelTabs tabs={ADMIN_ENTITY_TABS} value={tab} onChange={setTab} />

      {tab === "visitas" ? (
        <VisitasCampoHistorialPanel
          historial={visitasHistorial}
          loadingDetalle={detalleLoading}
          detalle={detalleAmbientes}
          detalleVisita={detalleVisita}
          onVerDetalle={handleVerDetalleVisita}
          onCerrarDetalle={() => {
            setDetalleVisita(null);
            setDetalleAmbientes(null);
          }}
        />
      ) : tab === "responsables" ? (
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
      ) : (
        <>
      <VisitasCampoBanner
        visitas={initialVisitasActivas}
        puedeGestionar={false}
      />

      {sedes.length === 0 && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm">
          No hay sucursales configuradas. Contacte al contador para registrar sucursales antes de
          crear ambientes.
        </p>
      )}

      <PanelToolbar
        left={
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <PanelCountLabel count={filtrados.length} singular="ambiente" plural="ambientes" />
            {sedes.length > 0 && (
              <SedeAmbienteFilterSelect
                sedes={sedes}
                value={sedeFilterId}
                onChange={setSedeFilterId}
              />
            )}
          </div>
        }
        right={
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
            <div className="min-w-[200px] flex-1 sm:max-w-sm sm:flex-none">
              <PanelSearchInput
                value={busqueda}
                onChange={setBusqueda}
                placeholder={
                  soloUnaSede
                    ? "Buscar ambiente o responsable…"
                    : "Buscar ambiente, responsable o sucursal…"
                }
              />
            </div>
            <PanelViewToggle value={viewMode} onChange={setViewMode} />
            <Button
              type="button"
              size="sm"
              onClick={() => setCreateOpen(true)}
              disabled={sedes.length === 0}
            >
              + Nuevo ambiente
            </Button>
          </div>
        }
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      {gruposPorSede.length === 0 ? (
        <PanelEmptyState
          message={
            busqueda.trim()
              ? "No hay ambientes que coincidan con la búsqueda."
              : "No hay ambientes configurados. Cree uno con «+ Nuevo ambiente»."
          }
        />
      ) : viewMode === "list" ? (
        <PanelDataTable layout="auto">
          <PanelTableColgroup
            cols={
              soloUnaSede
                ? visitaAbierta
                  ? AMBIENTES_TABLE_COLS_SIN_SUCURSAL_VISITA
                  : AMBIENTES_TABLE_COLS_SIN_SUCURSAL
                : visitaAbierta
                  ? AMBIENTES_TABLE_COLS_VISITA
                  : AMBIENTES_TABLE_COLS
            }
          />
          <thead className={panelTableStickyHeadClass}>
            <tr className={panelTableHeadRowClass}>
              <PanelTableTh>Ambiente</PanelTableTh>
              <PanelTableTh>Responsable</PanelTableTh>
              <PanelTableTh>Descripción</PanelTableTh>
              {!soloUnaSede && <PanelTableTh className={panelTableShrinkCellClass}>Sucursal</PanelTableTh>}
              <PanelTableTh align="center" className={panelTableShrinkCellClass}>
                Activos
              </PanelTableTh>
              {visitaAbierta && (
                <PanelTableTh className={panelTableNowrapCellClass}>Visita</PanelTableTh>
              )}
              <PanelTableTh className={panelTableNowrapCellClass}>Estado</PanelTableTh>
              <PanelTableTh align="right" className={panelTableNowrapCellClass}>
                Acciones
              </PanelTableTh>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((amb) => (
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
                {!soloUnaSede && (
                  <PanelTableTd className={panelTableShrinkCellClass} title={amb.sede_nombre}>
                    <button
                      type="button"
                      className="truncate font-medium text-primary hover:underline"
                      title="Ver ambientes de esta sucursal"
                      onClick={() => setSedeFilterId(amb.sede_id)}
                    >
                      {amb.sede_nombre}
                    </button>
                  </PanelTableTd>
                )}
                <PanelTableTd align="center" className={panelTableShrinkCellClass}>
                  {amb.activo_count}
                </PanelTableTd>
                {visitaAbierta && (
                  <PanelTableTd className={panelTableNowrapCellClass}>
                    <VisitaCampoEstadoBadge estado={amb.visita_estado} />
                  </PanelTableTd>
                )}
                <PanelTableTd className={panelTableNowrapCellClass}>
                  <StatusBadge variant="active">Activo</StatusBadge>
                </PanelTableTd>
                <PanelTableTd align="right" className={`overflow-visible ${panelTableNowrapCellClass}`}>
                  <PanelTableActions
                    onEdit={() => {
                      setError(null);
                      setEditAmbiente(amb);
                    }}
                    nav={{
                      label: "Activos",
                      kind: "activos",
                      href: `/admin/ambientes/${amb.id}`,
                    }}
                  />
                </PanelTableTd>
              </tr>
            ))}
          </tbody>
        </PanelDataTable>
      ) : soloUnaSede ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((amb) => (
            <article key={amb.id} className={`${panelCardClass} flex flex-col`}>
              <div className="flex items-start justify-between gap-2 border-b border-border/50 px-4 py-3">
                <h3 className="font-semibold leading-snug text-primary">{amb.nombre}</h3>
                <StatusBadge variant="active">Activo</StatusBadge>
              </div>
              <div className="flex flex-1 flex-col gap-2 px-4 py-3 text-sm">
                <p className="font-medium text-foreground">
                  {amb.responsable ?? "Sin responsable asignado"}
                </p>
                {amb.descripcion ? (
                  <p className="text-muted-foreground">{amb.descripcion}</p>
                ) : (
                  <p className="italic text-muted-foreground">Sin descripción</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {amb.activo_count} {amb.activo_count === 1 ? "activo" : "activos"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 border-t border-border/50 bg-muted/20 px-3 py-2.5">
                <PanelIconAction label="Editar" onClick={() => setEditAmbiente(amb)}>
                  <EditIcon />
                </PanelIconAction>
                <PanelNavActionLink
                  href={`/admin/ambientes/${amb.id}`}
                  label="Activos"
                  icon={<ActivosIcon />}
                  className="ml-auto"
                />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {gruposPorSede.map(({ sedeId, sedeNombre, ambientes: lista }) => (
            <section key={sedeId}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  className="text-left text-lg font-bold uppercase tracking-wide text-primary hover:underline"
                  title="Ver ambientes de esta sucursal"
                  onClick={() => setSedeFilterId(sedeId)}
                >
                  {sedeNombre}
                </button>
                <span className="text-sm text-muted-foreground">
                  {lista.length} {lista.length === 1 ? "ambiente" : "ambientes"}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {lista.map((amb) => (
                  <article key={amb.id} className={`${panelCardClass} flex flex-col`}>
                    <div className="flex items-start justify-between gap-2 border-b border-border/50 px-4 py-3">
                      <h3 className="font-semibold leading-snug text-primary">{amb.nombre}</h3>
                      <StatusBadge variant="active">Activo</StatusBadge>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 px-4 py-3 text-sm">
                      <p className="font-medium text-foreground">
                        {amb.responsable ?? "Sin responsable asignado"}
                      </p>
                      {amb.descripcion ? (
                        <p className="text-muted-foreground">{amb.descripcion}</p>
                      ) : (
                        <p className="italic text-muted-foreground">Sin descripción</p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {amb.activo_count} {amb.activo_count === 1 ? "activo" : "activos"}
                      </p>
                      <p className="mt-auto pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {amb.sede_nombre}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 border-t border-border/50 bg-muted/20 px-3 py-2.5">
                      <PanelIconAction label="Editar" onClick={() => setEditAmbiente(amb)}>
                        <EditIcon />
                      </PanelIconAction>
                      <PanelNavActionLink
                        href={`/admin/ambientes/${amb.id}`}
                        label="Activos"
                        icon={<ActivosIcon />}
                        className="ml-auto"
                      />
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
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
        description="Registre un ambiente en una sucursal de su entidad."
        className="max-w-md"
      >
        <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
          <AmbienteFormFields
            sedes={sedes}
            responsables={responsables}
            defaultSedeId={sedeFilterId || undefined}
            showSedeSelect={!soloUnaSede}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
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
        className="max-w-md"
      >
        {editAmbiente && (
          <form onSubmit={(e) => void handleEdit(e)} className="space-y-4">
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
    </div>
  );
}
