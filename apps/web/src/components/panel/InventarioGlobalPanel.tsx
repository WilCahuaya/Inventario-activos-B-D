"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Activo, Entidad, EstadoRegistro } from "@inventario/types";
import {
  aniosAdquisicionDesdeActivos,
  entidadMuestraSelectorSede,
  pasoFiltroAnioAdquisicion,
  pasoFiltroSerieComprobante,
  seriesComprobanteDesdeActivos,
  sedeIdSinSelector,
} from "@inventario/types";
import { ActivoEditScopeNav, type ActivoEditScope } from "@inventario/ui/panel";
import { Button, ComprobanteSerieFiltroInput, EliminarActivosPorCodigosButton, Select, useToast, mensajeEliminacionPreregistros, PreregistroGestionToolbar, type PreregistroGestionToolbarState } from "@inventario/ui";
import { listAmbientes, listSedes } from "@/lib/actions/ubicacion";
import { deleteActivosPreregistrados } from "@/lib/actions/activos";
import type { Ambiente, Sede } from "@inventario/types";
import { ActivoForm } from "./ActivoForm";
import { ActivosInventarioExcelView } from "./ActivosInventarioExcelView";
import { useEjemplaresResumen } from "@/hooks/useEjemplaresResumen";
import {
  PanelCountLabel,
  PanelPageHeader,
  PanelSearchInput,
  panelFilterRowClass,
  panelInventarioPageClass,
  panelInventarioToolbarClass,
  panelToolbarActionsClass,
  PanelToolbarExpandTrigger,
  usePanelInventarioUnifiedScroll,
  type PanelBreadcrumbItem,
} from "./panel-ui";

interface InventarioItem extends Activo {
  entidad_nombre?: string;
  sede_nombre?: string;
  ambiente_nombre?: string;
}

interface InventarioGlobalPanelProps {
  entidades: Entidad[];
  activos: InventarioItem[];
  initialEstado?: EstadoRegistro | "";
  mode?: "contador" | "admin";
  /** Fija la entidad (admin o pestaña inventario en entidad). */
  fixedEntidadId?: string;
  fixedEntidadNombre?: string;
  /** Dentro de la página de entidad: títulos y migas acordes. */
  embeddedInEntityPage?: boolean;
  entityPageHref?: string;
  /** Abre el diálogo de eliminación por códigos (inventario de entidad, contador). */
  onOpenEliminarPorCodigos?: () => void;
}

const FILTROS_ESTADO: { value: "" | EstadoRegistro; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "REGISTRADO", label: "Registrados" },
  { value: "PREREGISTRADO", label: "Preregistrados" },
  { value: "DADO_DE_BAJA", label: "Dados de baja" },
];

export function InventarioGlobalPanel({
  entidades,
  activos,
  initialEstado = "",
  mode = "contador",
  fixedEntidadId,
  fixedEntidadNombre,
  embeddedInEntityPage = false,
  entityPageHref,
  onOpenEliminarPorCodigos,
}: InventarioGlobalPanelProps) {
  const isAdmin = mode === "admin";
  const hasFixedEntidad = Boolean(fixedEntidadId);
  const router = useRouter();
  const { pushToast } = useToast();
  const [activosList, setActivosList] = useState(activos);
  const [busqueda, setBusqueda] = useState("");
  const [entidadId, setEntidadId] = useState(
    hasFixedEntidad ? (fixedEntidadId ?? "") : isAdmin ? (fixedEntidadId ?? "") : "",
  );
  const [sedeId, setSedeId] = useState("");
  const [ambienteId, setAmbienteId] = useState("");
  const [estadoRegistro, setEstadoRegistro] = useState<"" | EstadoRegistro>(initialEstado);
  const [anioAdquisicion, setAnioAdquisicion] = useState("");
  const [serieComprobanteFiltro, setSerieComprobanteFiltro] = useState("");
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [editActivo, setEditActivo] = useState<InventarioItem | null>(null);
  const [editScope, setEditScope] = useState<ActivoEditScope>("single");
  const { resumen: ejemplaresResumen } = useEjemplaresResumen(editActivo?.id);
  const ejemplaresTotal = ejemplaresResumen?.total ?? 0;
  const { panelScrollRef, showToolbarTrigger, scrollToToolbar } = usePanelInventarioUnifiedScroll();

  useEffect(() => {
    setActivosList(activos);
  }, [activos]);

  const quitarActivos = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setActivosList((prev) => prev.filter((a) => !idSet.has(a.id)));
  }, []);

  const eliminarPreregistradosActivos = useCallback(async (list: InventarioItem[]) => {
    const byEntidad = new Map<string, string[]>();
    for (const activo of list) {
      const ids = byEntidad.get(activo.entidad_id) ?? [];
      ids.push(activo.id);
      byEntidad.set(activo.entidad_id, ids);
    }
    let eliminados = 0;
    for (const [eid, ids] of byEntidad) {
      const result = await deleteActivosPreregistrados(eid, ids);
      if (result.error) {
        pushToast(result.error, "error");
        return { error: result.error };
      }
      eliminados += result.data?.eliminados ?? ids.length;
    }
    quitarActivos(list.map((a) => a.id));
    pushToast(mensajeEliminacionPreregistros(eliminados), "success");
    void router.refresh();
    return {};
  }, [pushToast, quitarActivos, router]);

  useEffect(() => {
    setEditScope("single");
  }, [editActivo?.id]);
  const activeEntidadId = hasFixedEntidad ? fixedEntidadId! : isAdmin ? (fixedEntidadId ?? "") : entidadId;
  const mostrarFiltrosAdquisicion = Boolean(hasFixedEntidad || activeEntidadId);
  const aniosAdquisicionDisponibles = useMemo(
    () =>
      aniosAdquisicionDesdeActivos(
        activosList.filter((a) => !activeEntidadId || a.entidad_id === activeEntidadId),
      ),
    [activosList, activeEntidadId],
  );
  const seriesComprobanteDisponibles = useMemo(
    () =>
      seriesComprobanteDesdeActivos(
        activosList.filter((a) => !activeEntidadId || a.entidad_id === activeEntidadId),
      ),
    [activosList, activeEntidadId],
  );
  const gestionPreregistrosAlcance =
    estadoRegistro === "PREREGISTRADO"
      ? "del filtro actual"
      : hasFixedEntidad || activeEntidadId
        ? "de la entidad"
        : "del filtro actual";
  const [preregistroHeaderToolbar, setPreregistroHeaderToolbar] =
    useState<PreregistroGestionToolbarState | null>(null);
  const syncPreregistroToolbar = useCallback((state: PreregistroGestionToolbarState | null) => {
    setPreregistroHeaderToolbar((prev) => {
      if (!state && !prev) return prev;
      if (
        state &&
        prev &&
        state.totalPreregistrados === prev.totalPreregistrados &&
        state.selectedCount === prev.selectedCount &&
        state.disabled === prev.disabled &&
        state.disabledReason === prev.disabledReason
      ) {
        return prev;
      }
      return state;
    });
  }, []);

  const gestionPreregistrosConfig = useMemo(
    () => ({
      alcanceLabel: gestionPreregistrosAlcance,
      onDeleteActivos: eliminarPreregistradosActivos,
      toolbarPlacement: "header" as const,
      onToolbarStateChange: syncPreregistroToolbar,
    }),
    [gestionPreregistrosAlcance, eliminarPreregistradosActivos, syncPreregistroToolbar],
  );
  const mostrarSelectorSede = entidadMuestraSelectorSede(sedes);

  async function aplicarSedesEntidad(data: Sede[], preserveSedeId?: string) {
    setSedes(data);
    const implicitId = sedeIdSinSelector(data);
    const nextSedeId = implicitId ?? preserveSedeId ?? "";
    setSedeId(nextSedeId);
    setAmbienteId("");
    if (nextSedeId) {
      const ambList = await listAmbientes(nextSedeId);
      setAmbientes(ambList);
    } else {
      setAmbientes([]);
    }
  }

  useEffect(() => {
    if (!fixedEntidadId) return;
    void listSedes(fixedEntidadId).then((data) => {
      void aplicarSedesEntidad(data);
    });
  }, [fixedEntidadId]);

  async function handleEntidadChange(value: string) {
    setEntidadId(value);
    if (!value) {
      setSedes([]);
      setSedeId("");
      setAmbienteId("");
      setAmbientes([]);
      return;
    }
    const data = await listSedes(value);
    await aplicarSedesEntidad(data);
  }

  async function handleSedeChange(value: string) {
    setSedeId(value);
    setAmbienteId("");
    if (!value) {
      setAmbientes([]);
      return;
    }
    const data = await listAmbientes(value);
    setAmbientes(data);
  }

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return activosList.filter((a) => {
      if (activeEntidadId && a.entidad_id !== activeEntidadId) return false;
      if (sedeId && a.sede_id !== sedeId) return false;
      if (ambienteId && a.ambiente_id !== ambienteId) return false;
      if (estadoRegistro && a.estado_registro !== estadoRegistro) return false;
      if (mostrarFiltrosAdquisicion && !pasoFiltroAnioAdquisicion(a.fecha_adquisicion, anioAdquisicion)) {
        return false;
      }
      if (mostrarFiltrosAdquisicion && !pasoFiltroSerieComprobante(a, serieComprobanteFiltro)) {
        return false;
      }
      if (!q) return true;
      return (
        a.nombre.toLowerCase().includes(q) ||
        (a.codigo_barras?.toLowerCase().includes(q) ?? false) ||
        a.codigo_catalogo.toLowerCase().includes(q) ||
        (!hasFixedEntidad && (a.entidad_nombre?.toLowerCase().includes(q) ?? false)) ||
        (a.sede_nombre?.toLowerCase().includes(q) ?? false) ||
        (a.ambiente_nombre?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [
    activosList,
    busqueda,
    activeEntidadId,
    sedeId,
    ambienteId,
    estadoRegistro,
    hasFixedEntidad,
    mostrarFiltrosAdquisicion,
    anioAdquisicion,
    serieComprobanteFiltro,
  ]);

  const hasActiveFilters = Boolean(
    (!hasFixedEntidad && !isAdmin && entidadId) ||
      sedeId ||
      ambienteId ||
      estadoRegistro ||
      busqueda.trim() ||
      anioAdquisicion ||
      serieComprobanteFiltro.trim(),
  );

  function irAlAmbiente(activo: InventarioItem) {
    if (!activo.ambiente_id) return;
    const href = isAdmin
      ? `/admin/ambientes/${activo.ambiente_id}`
      : activo.entidad_id
        ? `/contador/entidades/${activo.entidad_id}/ambientes/${activo.ambiente_id}`
        : null;
    if (href) router.push(href);
  }

  function handleSuccess() {
    setEditActivo(null);
    router.refresh();
  }

  function limpiarFiltros() {
    if (!hasFixedEntidad && !isAdmin) {
      setEntidadId("");
      setSedes([]);
      setSedeId("");
      setAmbienteId("");
      setAmbientes([]);
    } else if (sedes.length > 0) {
      const implicitId = sedeIdSinSelector(sedes);
      setSedeId(implicitId ?? "");
      setAmbienteId("");
      if (implicitId) {
        void listAmbientes(implicitId).then(setAmbientes);
      } else {
        setAmbientes([]);
      }
    } else {
      setSedeId("");
      setAmbienteId("");
      setAmbientes([]);
    }
    setEstadoRegistro("");
    setBusqueda("");
    setAnioAdquisicion("");
    setSerieComprobanteFiltro("");
  }

  if (editActivo) {
    const editTitle =
      isAdmin && editActivo.estado_registro !== "PREREGISTRADO"
        ? "Editar ubicación"
        : isAdmin && editActivo.estado_registro === "PREREGISTRADO"
          ? "Editar preregistro"
          : "Editar activo";

    const editBreadcrumbs: PanelBreadcrumbItem[] = embeddedInEntityPage
      ? [
          ...(entityPageHref
            ? [{ label: fixedEntidadNombre ?? "Entidad", href: entityPageHref }]
            : [{ label: fixedEntidadNombre ?? "Entidad" }]),
          { label: "Inventario", onClick: () => setEditActivo(null) },
          { label: editActivo.nombre },
          { label: editTitle },
        ]
      : isAdmin
      ? [
          { label: "Inventario global", href: "/admin/inventario" },
          { label: editActivo.nombre, onClick: () => setEditActivo(null) },
          { label: editTitle },
        ]
      : [
          { label: "Inventario global", onClick: () => setEditActivo(null) },
          { label: editActivo.nombre },
          { label: editTitle },
        ];

    return (
      <div className="space-y-5">
        <PanelPageHeader breadcrumbs={editBreadcrumbs} />
        <ActivoEditScopeNav
          scope={editScope}
          ejemplaresTotal={ejemplaresTotal}
          onScopeChange={setEditScope}
        />
        <ActivoForm
          entidades={entidades}
          fixedEntidadId={editActivo.entidad_id}
          fixedSedeId={isAdmin ? undefined : editActivo.sede_id ?? undefined}
          fixedAmbienteId={isAdmin ? undefined : editActivo.ambiente_id ?? undefined}
          activo={editActivo}
          mode="edit"
          editScope={editScope}
          ejemplaresTotal={ejemplaresTotal}
          submitLabel={
            editScope === "bulk" && ejemplaresTotal > 1
              ? `Guardar en ${ejemplaresTotal} ejemplares`
              : isAdmin
                ? editActivo.estado_registro === "PREREGISTRADO"
                  ? "Guardar preregistro"
                  : "Guardar"
                : "Guardar cambios"
          }
          soloUbicacion={isAdmin && editActivo.estado_registro !== "PREREGISTRADO"}
          asignaCodigoInmediato={!isAdmin && editActivo.estado_registro !== "PREREGISTRADO"}
          variant="page"
          onSuccess={handleSuccess}
          onCancel={() => setEditActivo(null)}
        />
      </div>
    );
  }

  return (
    <>
      <div className={`${panelInventarioPageClass} flex min-h-0 flex-col gap-1`}>
        {showToolbarTrigger && (
          <PanelToolbarExpandTrigger onClick={scrollToToolbar} />
        )}
        <ActivosInventarioExcelView
          className="min-h-0 flex-1"
          layout="global-panel"
          bodyScrollRef={panelScrollRef}
          toolbar={
            <div className={panelInventarioToolbarClass}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="panel-toolbar-title min-w-0">
                  <h1 className="panel-toolbar-heading text-foreground">
                    {embeddedInEntityPage ? "Inventario de la entidad" : "Inventario global"}
                  </h1>
                  <p className="panel-toolbar-subtitle">
                    {hasFixedEntidad
                      ? `Todos los bienes de ${fixedEntidadNombre ?? "la entidad"} en todos los ambientes`
                      : "Consulta y gestión de activos en todas las entidades"}
                  </p>
                </div>
                <div className={panelToolbarActionsClass}>
                  {preregistroHeaderToolbar && (
                    <PreregistroGestionToolbar {...preregistroHeaderToolbar} />
                  )}
                  {onOpenEliminarPorCodigos && (
                    <EliminarActivosPorCodigosButton onClick={onOpenEliminarPorCodigos} />
                  )}
                  <PanelCountLabel count={filtrados.length} singular="activo" plural="activos" />
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
                      value={busqueda}
                      onChange={setBusqueda}
                      placeholder={
                        hasFixedEntidad || isAdmin
                          ? "Buscar código, nombre, sucursal o ambiente…"
                          : "Buscar código, nombre, entidad…"
                      }
                    />
                  </div>

                  {!hasFixedEntidad && !isAdmin && (
                    <Select
                      aria-label="Entidad"
                      size="compact"
                      value={entidadId}
                      onChange={(value) => void handleEntidadChange(value)}
                      options={[
                        { value: "", label: "Entidad: todas" },
                        ...entidades.map((e) => ({ value: e.id, label: e.nombre })),
                      ]}
                    />
                  )}

                  {mostrarSelectorSede && (
                    <Select
                      aria-label="Sede"
                      size="compact"
                      value={sedeId}
                      disabled={!activeEntidadId}
                      onChange={(value) => void handleSedeChange(value)}
                      options={[
                        { value: "", label: "Sede: todas" },
                        ...sedes.map((s) => ({ value: s.id, label: s.nombre })),
                      ]}
                    />
                  )}

                  <Select
                    aria-label="Ambiente"
                    size="compact"
                    value={ambienteId}
                    disabled={!activeEntidadId || (mostrarSelectorSede && !sedeId)}
                    onChange={setAmbienteId}
                    options={[
                      { value: "", label: "Ambiente: todos" },
                      ...ambientes.map((a) => ({ value: a.id, label: a.nombre })),
                    ]}
                  />

                  {mostrarFiltrosAdquisicion && (
                    <Select
                      aria-label="Año de adquisición"
                      size="compact"
                      value={anioAdquisicion}
                      onChange={setAnioAdquisicion}
                      options={[
                        { value: "", label: "Año: todos" },
                        ...aniosAdquisicionDisponibles.map((y) => ({
                          value: String(y),
                          label: String(y),
                        })),
                      ]}
                    />
                  )}

                  {mostrarFiltrosAdquisicion && (
                    <ComprobanteSerieFiltroInput
                      value={serieComprobanteFiltro}
                      onChange={setSerieComprobanteFiltro}
                      series={seriesComprobanteDisponibles}
                    />
                  )}

                  {hasActiveFilters && (
                    <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={limpiarFiltros}>
                      Limpiar
                    </Button>
                  )}
                </div>
              </div>
            </div>
          }
          activos={filtrados}
          onEditActivo={setEditActivo}
          onIrAmbiente={irAlAmbiente}
          puedeDarDeBaja={!isAdmin}
          puedeValidarPreregistro={!isAdmin}
          puedeEliminarPreregistro
          gestionPreregistros={gestionPreregistrosConfig}
          onActivoEliminado={(id) => quitarActivos([id])}
          modoAdmin={isAdmin}
          mostrarEstadoRegistro={isAdmin}
          mostrarUbicacion={hasFixedEntidad}
          ubicacionMultiplesSedes={hasFixedEntidad && mostrarSelectorSede}
          editarLabel={isAdmin ? undefined : "Editar activo"}
        />
      </div>
    </>
  );
}
