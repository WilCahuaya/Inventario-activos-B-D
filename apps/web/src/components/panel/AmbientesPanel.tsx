"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Entidad, ResponsableConConteo, SedeConConteo, VisitaCampoActiva, VisitaCampoHistorial } from "@inventario/types";
import { Button, Dialog, ResponsablesPanel } from "@inventario/ui";
import {
  ActivosIcon,
  DeleteIcon,
  PanelDataTable,
  PanelIconAction,
  PanelNavActionLink,
  PanelTableActions,
  PanelTableColgroup,
  PanelTableTd,
  PanelTableTh,
  PanelTabs,
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
  VisitaCampoEstadoBadge,
  VisitasCampoBanner,
  VisitasCampoHistorialPanel,
  IniciarVisitaCampoDialog,
} from "@inventario/ui/panel";
import type { AmbienteConSede } from "@/lib/actions/ubicacion";
import { createAmbiente, deleteAmbiente, listAmbientesPorEntidad, updateAmbiente } from "@/lib/actions/ubicacion";
import type { AmbienteConVisita } from "@/lib/actions/visitas-campo";
import {
  abrirVisitaCampo,
  attachVisitaEstadoToAmbientes,
  cerrarVisitaCampo,
  culminarAmbienteVisita,
  getVisitasCampoActivas,
  getVisitaCampoDetalle,
  listVisitasCampoHistorial,
} from "@/lib/actions/visitas-campo";
import {
  createResponsable,
  deleteResponsable,
  listResponsables,
  setResponsableActivo,
  updateResponsable,
} from "@/lib/actions/responsables";
import { AmbienteFormFields, ambienteFromForm } from "./AmbienteFormFields";
import { GestionarSucursales } from "./GestionarSucursales";
import {
  EditIcon,
  PanelCountLabel,
  PanelEmptyState,
  PanelPageHeader,
  PanelSearchInput,
  PanelToolbar,
  StatusBadge,
  panelCardClass,
} from "./panel-ui";

type EntityTab = "ambientes" | "responsables" | "sucursales" | "visitas";

const ENTITY_TABS: { id: EntityTab; label: string }[] = [
  { id: "ambientes", label: "Ambientes" },
  { id: "responsables", label: "Responsables" },
  { id: "sucursales", label: "Sucursales" },
  { id: "visitas", label: "Visitas de campo" },
];

function parseInitialTab(value?: string): EntityTab {
  if (value === "responsables" || value === "sucursales" || value === "visitas") return value;
  return "ambientes";
}

type AmbienteRow = AmbienteConVisita;

interface AmbientesPanelProps {
  entidad: Entidad;
  ambientes: AmbienteRow[];
  sedes: SedeConConteo[];
  responsables: ResponsableConConteo[];
  visitasActivas?: VisitaCampoActiva[];
  visitasHistorial?: VisitaCampoHistorial[];
  initialTab?: EntityTab;
  /** Vista filtrada a una sucursal concreta */
  sedeFocus?: { id: string; nombre: string } | null;
  panelMode?: "contador" | "admin";
}

interface AmbienteCardProps {
  ambiente: AmbienteRow;
  entidadNombre: string;
  activosHref: string;
  onEdit: () => void;
  onDelete: () => void;
}

function AmbienteCard({ ambiente, entidadNombre, activosHref, onEdit, onDelete }: AmbienteCardProps) {
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
        <PanelNavActionLink
          href={activosHref}
          label="Activos"
          icon={<ActivosIcon />}
          className="ml-auto"
        />
      </div>
    </article>
  );
}

export function AmbientesPanel({
  entidad,
  ambientes: initial,
  sedes: initialSedes,
  responsables: initialResponsables,
  visitasActivas: initialVisitasActivas = [],
  visitasHistorial: initialVisitasHistorial = [],
  initialTab = "ambientes",
  sedeFocus = null,
  panelMode = "contador",
}: AmbientesPanelProps) {
  const isAdmin = panelMode === "admin";
  const entidadHref = isAdmin ? "/admin/activos" : `/contador/entidades/${entidad.id}`;
  const sedeHref = (sedeId: string) =>
    isAdmin
      ? `/admin/sedes/${sedeId}`
      : `/contador/entidades/${entidad.id}/sedes/${sedeId}`;
  const activoHref = (ambienteId: string) =>
    isAdmin ? `/admin/ambientes/${ambienteId}` : `/contador/entidades/${entidad.id}/ambientes/${ambienteId}`;
  const router = useRouter();
  const [tab, setTab] = useState<EntityTab>(parseInitialTab(initialTab));
  const [ambientes, setAmbientes] = useState(initial);
  const [sedes, setSedes] = useState(initialSedes);
  const [responsables, setResponsables] = useState(initialResponsables);
  const [busqueda, setBusqueda] = useState("");
  const [sedeFilterId, setSedeFilterId] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editAmbiente, setEditAmbiente] = useState<AmbienteRow | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useStoredViewMode("inventario-view-ambientes", "list");
  const [visitasActivas, setVisitasActivas] = useState(initialVisitasActivas);
  const [visitasHistorial, setVisitasHistorial] = useState(initialVisitasHistorial);
  const [visitaPending, setVisitaPending] = useState(false);
  const [cerrarPendingId, setCerrarPendingId] = useState<string | null>(null);
  const [visitaError, setVisitaError] = useState<string | null>(null);
  const [culminarPendingId, setCulminarPendingId] = useState<string | null>(null);
  const [detalleVisita, setDetalleVisita] = useState<VisitaCampoHistorial | null>(null);
  const [detalleAmbientes, setDetalleAmbientes] = useState<Awaited<ReturnType<typeof getVisitaCampoDetalle>> | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [abrirVisitaOpen, setAbrirVisitaOpen] = useState(false);
  const [abrirVisitaError, setAbrirVisitaError] = useState<string | null>(null);

  const puedeGestionarVisita = panelMode === "contador";
  const visitaAbierta = visitasActivas.length > 0;
  const sedesEnVisita = visitasActivas
    .map((v) => v.sede_id)
    .filter((id): id is string => Boolean(id));
  const todasEnVisita = visitasActivas.some((v) => !v.sede_id);

  const sedeActivaId = sedeFocus?.id ?? sedeFilterId;
  const soloUnaSede = Boolean(sedeActivaId);

  useEffect(() => {
    setSedeFilterId("");
    setBusqueda("");
  }, [entidad.id, sedeFocus?.id]);

  async function syncVisitaYAmbientes() {
    const [visitas, historial, ambList] = await Promise.all([
      getVisitasCampoActivas(entidad.id),
      listVisitasCampoHistorial(entidad.id),
      listAmbientesPorEntidad(entidad.id, sedeFocus?.id),
    ]);
    const enriched = await attachVisitaEstadoToAmbientes(ambList, entidad.id);
    setVisitasActivas(visitas);
    setVisitasHistorial(historial);
    setAmbientes(enriched);
    router.refresh();
  }

  async function syncAmbientesYResponsables() {
    const [ambList, respList] = await Promise.all([
      listAmbientesPorEntidad(entidad.id, sedeFocus?.id),
      listResponsables(entidad.id),
    ]);
    const enriched = await attachVisitaEstadoToAmbientes(ambList, entidad.id);
    setAmbientes(enriched);
    setResponsables(respList);
    router.refresh();
  }

  function handleAbrirVisita() {
    setAbrirVisitaError(null);
    setAbrirVisitaOpen(true);
  }

  async function confirmarAbrirVisita(sedeId: string | null) {
    setVisitaPending(true);
    setAbrirVisitaError(null);
    const result = await abrirVisitaCampo(entidad.id, sedeId);
    setVisitaPending(false);
    if (result.error) {
      setAbrirVisitaError(result.error);
      return;
    }
    setAbrirVisitaOpen(false);
    setVisitaError(null);
    await syncVisitaYAmbientes();
  }

  async function handleCerrarVisita(visitaId: string) {
    if (!confirm("¿Cerrar esta visita de campo? Quedará registrada en el historial.")) return;
    setCerrarPendingId(visitaId);
    setVisitaError(null);
    const result = await cerrarVisitaCampo(visitaId, entidad.id);
    setCerrarPendingId(null);
    if (result.error) {
      setVisitaError(result.error);
      return;
    }
    await syncVisitaYAmbientes();
  }

  async function handleCulminarAmbiente(ambienteId: string) {
    setCulminarPendingId(ambienteId);
    setVisitaError(null);
    const result = await culminarAmbienteVisita(ambienteId, entidad.id);
    setCulminarPendingId(null);
    if (result.error) {
      setVisitaError(result.error);
      return;
    }
    await syncVisitaYAmbientes();
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
    if (!sedeActivaId) return ambientes;
    return ambientes.filter((a) => a.sede_id === sedeActivaId);
  }, [ambientes, sedeActivaId]);

  const ambientesFiltrados = useMemo(() => {
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
    const porSede = new Map<string, AmbienteRow[]>();
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

    const nuevo: AmbienteRow = {
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
    setSedes((prev) =>
      prev.map((s) =>
        s.id === input.sedeId ? { ...s, ambiente_count: s.ambiente_count + 1 } : s,
      ),
    );
    setCreateOpen(false);
    form.reset();
    await syncAmbientesYResponsables();
    router.refresh();
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
    router.refresh();
  }

  async function handleDeleteAmbiente(amb: AmbienteRow) {
    if (!confirm(`¿Eliminar el ambiente "${amb.nombre}"?`)) return;
    setError(null);

    const result = await deleteAmbiente(amb.id);
    if (result.error) {
      setError(result.error);
      return;
    }

    setAmbientes((prev) => prev.filter((a) => a.id !== amb.id));
    setSedes((prev) =>
      prev.map((s) =>
        s.id === amb.sede_id ? { ...s, ambiente_count: Math.max(0, s.ambiente_count - 1) } : s,
      ),
    );
    await syncAmbientesYResponsables();
    router.refresh();
  }

  function verAmbientesDeSede(sedeId: string) {
    setSedeFilterId(sedeId);
    setTab("ambientes");
    setBusqueda("");
  }

  const breadcrumbs = sedeFocus
    ? isAdmin
      ? [
          { label: "Ambientes", href: entidadHref },
          { label: sedeFocus.nombre },
        ]
      : [
          { label: "Entidades", href: "/contador/entidades" },
          { label: entidad.nombre, href: entidadHref },
          { label: sedeFocus.nombre },
        ]
    : isAdmin
      ? [{ label: "Ambientes" }]
      : [
          { label: "Entidades", href: "/contador/entidades" },
          { label: entidad.nombre },
        ];

  return (
    <div className="space-y-4">
      <PanelPageHeader
        breadcrumbs={breadcrumbs}
        subtitle={
          sedeFocus
            ? `Ambientes de la sucursal · ${sedeFocus.nombre}`
            : entidad.ruc
              ? `RUC ${entidad.ruc} · Ambientes, responsables y sucursales`
              : "Ambientes, responsables y sucursales"
        }
      />

      {!sedeFocus && <PanelTabs tabs={ENTITY_TABS} value={tab} onChange={setTab} />}

      {!sedeFocus && tab === "visitas" ? (
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
      ) : !sedeFocus && tab === "responsables" ? (
        <ResponsablesPanel
          responsables={responsables}
          onCreate={async (input) => {
            const result = await createResponsable(entidad.id, input);
            if (result.data) {
              await syncAmbientesYResponsables();
              return {
                data: { ...result.data, ambiente_count: 0 },
              };
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
      ) : !sedeFocus && tab === "sucursales" ? (
        <GestionarSucursales
          entidadId={entidad.id}
          sedes={sedes}
          onViewAmbientes={verAmbientesDeSede}
          onSedesChange={(next) => {
            setSedes(next);
            void syncAmbientesYResponsables();
          }}
        />
      ) : (
        <>
      {!sedeFocus && (
        <VisitasCampoBanner
          visitas={visitasActivas}
          sedes={sedes.map((s) => ({
            id: s.id,
            nombre: s.nombre,
            es_principal: s.es_principal,
          }))}
          puedeGestionar={puedeGestionarVisita}
          abrirPending={visitaPending}
          cerrarPendingId={cerrarPendingId}
          onAbrir={handleAbrirVisita}
          onCerrar={handleCerrarVisita}
          error={visitaError}
        />
      )}

      <PanelToolbar
        left={
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <PanelCountLabel
              count={ambientesFiltrados.length}
              singular="ambiente"
              plural="ambientes"
            />
            {!sedeFocus && sedes.length > 0 && (
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
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              + Crear ambiente
            </Button>
          </div>
        }
      />

      {error && !createOpen && !editAmbiente && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {gruposPorSede.length === 0 ? (
        <PanelEmptyState
          message={
            busqueda.trim() || sedeFilterId
              ? "No hay ambientes que coincidan con la búsqueda o el filtro."
              : "No hay ambientes registrados."
          }
          action={
            !busqueda.trim() ? (
              <Button type="button" onClick={() => setCreateOpen(true)}>
                + Crear primer ambiente
              </Button>
            ) : undefined
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
                    <div className="flex flex-col items-start gap-1">
                      <VisitaCampoEstadoBadge estado={amb.visita_estado} />
                      {puedeGestionarVisita &&
                        !amb.es_preregistro &&
                        amb.visita_estado === "EN_PROCESO" && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs"
                            disabled={culminarPendingId === amb.id}
                            onClick={() => handleCulminarAmbiente(amb.id)}
                          >
                            {culminarPendingId === amb.id ? "…" : "Culminar"}
                          </Button>
                        )}
                    </div>
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
                    onDelete={() => handleDeleteAmbiente(amb)}
                    nav={{
                      label: "Activos",
                      kind: "activos",
                      href: activoHref(amb.id),
                    }}
                  />
                </PanelTableTd>
              </tr>
            ))}
          </tbody>
        </PanelDataTable>
      ) : soloUnaSede ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {ambientesFiltrados.map((amb) => (
            <AmbienteCard
              key={amb.id}
              ambiente={amb}
              entidadNombre={entidad.nombre}
              activosHref={activoHref(amb.id)}
              onEdit={() => {
                setError(null);
                setEditAmbiente(amb);
              }}
              onDelete={() => handleDeleteAmbiente(amb)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {gruposPorSede.map(({ sede, ambientes: lista }) => (
            <section key={sede.id}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  className="text-left text-lg font-bold uppercase tracking-wide text-primary hover:underline"
                  title="Ver ambientes de esta sucursal"
                  onClick={() => setSedeFilterId(sede.id)}
                >
                  {sede.nombre}
                </button>
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
                    activosHref={activoHref(amb.id)}
                    onEdit={() => {
                      setError(null);
                      setEditAmbiente(amb);
                    }}
                    onDelete={() => handleDeleteAmbiente(amb)}
                  />
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
        description={
          sedeFocus
            ? `Registre un ambiente en ${sedeFocus.nombre}.`
            : "Registre un ambiente en la sucursal que corresponda."
        }
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <AmbienteFormFields
            sedes={sedes}
            responsables={responsables}
            defaultSedeId={sedeActivaId || undefined}
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
        description={editAmbiente?.nombre}
      >
        {editAmbiente && (
          <form onSubmit={handleEditAmbiente} className="space-y-4">
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

      <IniciarVisitaCampoDialog
        open={abrirVisitaOpen}
        onClose={() => {
          setAbrirVisitaOpen(false);
          setAbrirVisitaError(null);
        }}
        sedes={sedes.map((s) => ({
          id: s.id,
          nombre: s.nombre,
          es_principal: s.es_principal,
        }))}
        sedesEnVisita={sedesEnVisita}
        todasEnVisita={todasEnVisita}
        pending={visitaPending}
        error={abrirVisitaError}
        onConfirm={confirmarAbrirVisita}
      />

    </div>
  );
}
