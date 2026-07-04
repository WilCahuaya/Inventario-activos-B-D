import { useCallback, useEffect, useMemo, useState } from "react";
import type { Entidad, ResponsableConConteo, SedeConConteo, VisitaCampoActiva, VisitaCampoHistorial } from "@inventario/types";
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
  AMBIENTES_TABLE_COLS,
  AMBIENTES_TABLE_COLS_SIN_SUCURSAL,
  AMBIENTES_TABLE_COLS_VISITA,
  AMBIENTES_TABLE_COLS_SIN_SUCURSAL_VISITA,
  panelCardClass,
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
  IniciarVisitaCampoDialog,
  IniciarVisitaCampoButton,
  AmbientesDatosMenu,
} from "@inventario/ui/panel";
import { AmbienteFormFields, ambienteFromForm } from "./AmbienteFormFields";
import { AmbientesImportDialog } from "./AmbientesImportDialog";
import { InventarioImportDialog } from "./InventarioImportDialog";
import { ConfirmDialog, EliminarActivosPorCodigosDialog } from "@inventario/ui";
import { GestionarSucursales } from "./GestionarSucursales";
import {
  createAmbiente,
  deleteAmbiente,
  listAmbientesPorEntidad,
  listSedesConConteo,
  updateAmbiente,
  type AmbienteConSede,
} from "../lib/ubicacion";
import type { AmbienteConVisita } from "../lib/visitas-campo";
import {
  abrirVisitaCampo,
  attachVisitaEstadoToAmbientes,
  cerrarVisitaCampo,
  culminarAmbienteVisita,
  getVisitasCampoActivas,
  getVisitaCampoDetalle,
  listVisitasCampoHistorial,
} from "../lib/visitas-campo";
import {
  createResponsable,
  deleteResponsable,
  listResponsables,
  setResponsableActivo,
  updateResponsable,
} from "../lib/responsables";
import {
  deleteActivosPorCodigos,
  previewDeleteActivosPorCodigos,
} from "../lib/activos";

type EntityTab = "ambientes" | "responsables" | "sucursales" | "visitas";

const ENTITY_TABS: { id: EntityTab; label: string }[] = [
  { id: "ambientes", label: "Ambientes" },
  { id: "responsables", label: "Responsables" },
  { id: "sucursales", label: "Sucursales" },
  { id: "visitas", label: "Visitas de campo" },
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
  sedeFocus?: { id: string; nombre: string };
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
  sedeFocus,
}: AmbientesViewProps) {
  const [ambientes, setAmbientes] = useState<AmbienteConVisita[]>([]);
  const [sedes, setSedes] = useState<SedeConConteo[]>([]);
  const [responsables, setResponsables] = useState<ResponsableConConteo[]>([]);
  const [visitasActivas, setVisitasActivas] = useState<VisitaCampoActiva[]>([]);
  const [visitasHistorial, setVisitasHistorial] = useState<VisitaCampoHistorial[]>([]);
  const [visitaPending, setVisitaPending] = useState(false);
  const [cerrarPendingId, setCerrarPendingId] = useState<string | null>(null);
  const [visitaError, setVisitaError] = useState<string | null>(null);
  const [culminarPendingId, setCulminarPendingId] = useState<string | null>(null);
  const [detalleVisita, setDetalleVisita] = useState<VisitaCampoHistorial | null>(null);
  const [detalleAmbientes, setDetalleAmbientes] = useState<Awaited<ReturnType<typeof getVisitaCampoDetalle>> | null>(null);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [abrirVisitaOpen, setAbrirVisitaOpen] = useState(false);
  const [abrirVisitaError, setAbrirVisitaError] = useState<string | null>(null);
  const [importAmbientesOpen, setImportAmbientesOpen] = useState(false);
  const [importActivosOpen, setImportActivosOpen] = useState(false);
  const [eliminarOpen, setEliminarOpen] = useState(false);
  const [tab, setTab] = useState<EntityTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [sedeFilterId, setSedeFilterId] = useState(sedeFocus?.id ?? "");
  const [createOpen, setCreateOpen] = useState(false);
  const [editAmbiente, setEditAmbiente] = useState<AmbienteConVisita | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AmbienteConVisita | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useStoredViewMode("inventario-view-ambientes", "list");

  const soloUnaSede = Boolean(sedeFilterId);
  const visitaAbierta = visitasActivas.length > 0;
  const sedesEnVisita = visitasActivas
    .map((v) => v.sede_id)
    .filter((id): id is string => Boolean(id));
  const todasEnVisita = visitasActivas.some((v) => !v.sede_id);

  function verAmbientesDeSede(sedeId: string) {
    setSedeFilterId(sedeId);
    setTab("ambientes");
    setBusqueda("");
  }

  useEffect(() => {
    setSedeFilterId(sedeFocus?.id ?? "");
    setBusqueda("");
  }, [entidadId, sedeFocus?.id]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ambList, sedeList, respList, visitas, historial] = await Promise.all([
        listAmbientesPorEntidad(entidad.id, sedeFocus?.id),
        listSedesConConteo(entidad.id),
        listResponsables(entidad.id),
        getVisitasCampoActivas(entidad.id),
        listVisitasCampoHistorial(entidad.id),
      ]);
      const enriched = await attachVisitaEstadoToAmbientes(ambList, entidad.id);
      setAmbientes(enriched);
      setSedes(sedeList);
      setResponsables(respList.data ?? []);
      setVisitasActivas(visitas);
      setVisitasHistorial(historial);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudieron cargar los ambientes";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [entidad.id, sedeFocus?.id]);

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
      setVisitasActivas([]);
      setVisitasHistorial([]);
    }
  }, [online, loadData]);

  async function syncVisitaYAmbientes() {
    const [visitas, respResult, historial, sedeList] = await Promise.all([
      getVisitasCampoActivas(entidad.id),
      listResponsables(entidad.id),
      listVisitasCampoHistorial(entidad.id),
      listSedesConConteo(entidad.id),
    ]);
    const ambList = await listAmbientesPorEntidad(entidad.id, sedeFocus?.id);
    const enriched = await attachVisitaEstadoToAmbientes(ambList, entidad.id);
    setAmbientes(enriched);
    if (!respResult.error) setResponsables(respResult.data ?? []);
    setSedes(sedeList);
    setVisitasActivas(visitas);
    setVisitasHistorial(historial);
  }

  async function syncAmbientesYResponsables() {
    await syncVisitaYAmbientes();
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
    const result = await cerrarVisitaCampo(visitaId);
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
    const result = await culminarAmbienteVisita(ambienteId);
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
    try {
      const detalle = await getVisitaCampoDetalle(visita.id);
      setDetalleAmbientes(detalle);
    } finally {
      setDetalleLoading(false);
    }
  }

  function responsableNombreById(id: string | null) {
    if (!id) return null;
    return responsables.find((r) => r.id === id)?.nombre ?? null;
  }

  const ambientesBase = useMemo(() => {
    if (!sedeFilterId) return ambientes;
    return ambientes.filter((a) => a.sede_id === sedeFilterId);
  }, [ambientes, sedeFilterId]);

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
    const porSede = new Map<string, AmbienteConVisita[]>();
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

  function sortAmbientes(rows: AmbienteConVisita[]) {
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

    try {
      const input = ambienteFromForm(new FormData(form));
      const sede = sedes.find((s) => s.id === input.sedeId);
      const result = await createAmbiente({
        sedeId: input.sedeId,
        nombre: input.nombre,
        descripcion: input.descripcion,
        responsableId: input.responsableId,
      });

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
      setAmbientes((prev) => sortAmbientes([...prev, nuevo]));
      setSedes((prev) =>
        prev.map((s) =>
          s.id === input.sedeId ? { ...s, ambiente_count: s.ambiente_count + 1 } : s,
        ),
      );
      setCreateOpen(false);
      form.reset();
      void syncAmbientesYResponsables();
    } finally {
      setPending(false);
    }
  }

  async function handleEditAmbiente(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editAmbiente) return;
    setPending(true);
    setError(null);

    try {
      const input = ambienteFromForm(new FormData(event.currentTarget));
      const result = await updateAmbiente(editAmbiente.id, input);

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
      void syncAmbientesYResponsables();
    } finally {
      setPending(false);
    }
  }

  async function confirmDeleteAmbiente() {
    if (!deleteTarget) return;
    setPending(true);
    setError(null);

    try {
      const result = await deleteAmbiente(deleteTarget.id);

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
      void syncAmbientesYResponsables();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="min-w-0 w-full space-y-4">
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
          {!sedeFocus && (
            <PanelTabs
              tabs={ENTITY_TABS}
              value={tab}
              onChange={setTab}
              actions={
                <IniciarVisitaCampoButton
                  visitas={visitasActivas}
                  sedes={sedes.map((s) => ({
                    id: s.id,
                    nombre: s.nombre,
                    es_principal: s.es_principal,
                  }))}
                  pending={visitaPending}
                  onClick={handleAbrirVisita}
                />
              }
            />
          )}

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
          ) : !sedeFocus && tab === "sucursales" ? (
            <GestionarSucursales
              entidadId={entidad.id}
              sedes={sedes}
              onViewAmbientes={verAmbientesDeSede}
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
              <VisitasCampoBanner
                visitas={visitasActivas}
                puedeGestionar
                cerrarPendingId={cerrarPendingId}
                onCerrar={(id) => void handleCerrarVisita(id)}
                error={visitaError}
              />

              <PanelToolbar
                left={
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <PanelCountLabel
                      count={ambientesFiltrados.length}
                      singular="ambiente"
                      plural="ambientes"
                    />
                    {sedes.length > 0 && !sedeFocus && (
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
                    {tab === "ambientes" && (
                      <AmbientesDatosMenu
                        disabled={loading || !online}
                        onAction={(action) => {
                          if (action === "import-ambientes") setImportAmbientesOpen(true);
                          else if (action === "import-activos") setImportActivosOpen(true);
                          else setEliminarOpen(true);
                        }}
                        importActivosDisabled={loading || ambientes.length === 0 || !online}
                        importActivosDisabledReason={
                          !online
                            ? "Requiere conexión"
                            : ambientes.length === 0
                              ? "Primero importe o cree ambientes"
                              : undefined
                        }
                      />
                    )}
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
                              {!amb.es_preregistro && amb.visita_estado === "EN_PROCESO" && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs"
                                  disabled={culminarPendingId === amb.id}
                                  onClick={() => void handleCulminarAmbiente(amb.id)}
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
                        <PanelTableTd
                          align="right"
                          className={`overflow-visible ${panelTableNowrapCellClass}`}
                        >
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
              ) : soloUnaSede ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {ambientesFiltrados.map((amb) => (
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
        description={
          soloUnaSede
            ? `Registre un ambiente en ${sedes.find((s) => s.id === sedeFilterId)?.nombre ?? "esta sucursal"}.`
            : "Registre un ambiente en la sucursal que corresponda."
        }
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
        onConfirm={(sedeId) => void confirmarAbrirVisita(sedeId)}
      />

      <AmbientesImportDialog
        open={importAmbientesOpen}
        onClose={() => setImportAmbientesOpen(false)}
        entidad={entidad}
        online={online}
        onImported={() => void syncAmbientesYResponsables()}
      />
      <InventarioImportDialog
        open={importActivosOpen}
        onClose={() => setImportActivosOpen(false)}
        entidades={[entidad]}
        fixedEntidad={entidad}
        online={online}
        onImported={() => void syncAmbientesYResponsables()}
      />
      <EliminarActivosPorCodigosDialog
        open={eliminarOpen}
        onClose={() => setEliminarOpen(false)}
        entidades={[entidad]}
        fixedEntidadId={entidad.id}
        onPreview={previewDeleteActivosPorCodigos}
        onDelete={deleteActivosPorCodigos}
        onDeleted={() => void syncAmbientesYResponsables()}
      />
    </div>
  );
}
