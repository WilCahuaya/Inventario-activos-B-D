"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Activo, Entidad, EstadoRegistro } from "@inventario/types";
import { ActivoEditScopeNav, type ActivoEditScope } from "@inventario/ui/panel";
import { Button, Select } from "@inventario/ui";
import { listAmbientes, listSedes } from "@/lib/actions/ubicacion";
import type { Ambiente, Sede } from "@inventario/types";
import { ActivoForm } from "./ActivoForm";
import { ActivosInventarioExcelView } from "./ActivosInventarioExcelView";
import { InventarioImportDialog } from "./InventarioImportDialog";
import {
  deleteActivosPorCodigos,
  previewDeleteActivosPorCodigos,
} from "@/lib/actions/activos";
import { EliminarActivosPorCodigosDialog } from "@inventario/ui";
import { useEjemplaresResumen } from "@/hooks/useEjemplaresResumen";
import {
  PanelCountLabel,
  PanelPageHeader,
  PanelSearchInput,
  panelFilterRowClass,
  panelModalClass,
  panelStickyToolbarClass,
  panelToolbarActionsClass,
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
  /** Solo admin: entidad del perfil */
  fixedEntidadId?: string;
  fixedEntidadNombre?: string;
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
}: InventarioGlobalPanelProps) {
  const isAdmin = mode === "admin";
  const router = useRouter();
  const [busqueda, setBusqueda] = useState("");
  const [entidadId, setEntidadId] = useState(isAdmin ? (fixedEntidadId ?? "") : "");
  const [sedeId, setSedeId] = useState("");
  const [ambienteId, setAmbienteId] = useState("");
  const [estadoRegistro, setEstadoRegistro] = useState<"" | EstadoRegistro>(initialEstado);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [editActivo, setEditActivo] = useState<InventarioItem | null>(null);
  const [editScope, setEditScope] = useState<ActivoEditScope>("single");
  const { resumen: ejemplaresResumen } = useEjemplaresResumen(editActivo?.id);
  const ejemplaresTotal = ejemplaresResumen?.total ?? 0;

  useEffect(() => {
    setEditScope("single");
  }, [editActivo?.id]);
  const [importOpen, setImportOpen] = useState(false);
  const [eliminarOpen, setEliminarOpen] = useState(false);

  const activeEntidadId = isAdmin ? (fixedEntidadId ?? "") : entidadId;

  useEffect(() => {
    if (!isAdmin || !fixedEntidadId) return;
    void listSedes(fixedEntidadId).then(setSedes);
  }, [isAdmin, fixedEntidadId]);

  async function handleEntidadChange(value: string) {
    setEntidadId(value);
    setSedeId("");
    setAmbienteId("");
    setAmbientes([]);
    if (!value) {
      setSedes([]);
      return;
    }
    const data = await listSedes(value);
    setSedes(data);
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
    return activos.filter((a) => {
      if (activeEntidadId && a.entidad_id !== activeEntidadId) return false;
      if (sedeId && a.sede_id !== sedeId) return false;
      if (ambienteId && a.ambiente_id !== ambienteId) return false;
      if (estadoRegistro && a.estado_registro !== estadoRegistro) return false;
      if (!q) return true;
      return (
        a.nombre.toLowerCase().includes(q) ||
        (a.codigo_barras?.toLowerCase().includes(q) ?? false) ||
        a.codigo_catalogo.toLowerCase().includes(q) ||
        (!isAdmin && (a.entidad_nombre?.toLowerCase().includes(q) ?? false)) ||
        (a.sede_nombre?.toLowerCase().includes(q) ?? false) ||
        (a.ambiente_nombre?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [activos, busqueda, activeEntidadId, sedeId, ambienteId, estadoRegistro, isAdmin]);

  const hasActiveFilters = Boolean(
    (!isAdmin && entidadId) || sedeId || ambienteId || estadoRegistro || busqueda.trim(),
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
    if (!isAdmin) {
      setEntidadId("");
      setSedes([]);
    }
    setSedeId("");
    setAmbienteId("");
    setEstadoRegistro("");
    setAmbientes([]);
    setBusqueda("");
  }

  if (editActivo) {
    const editTitle =
      isAdmin && editActivo.estado_registro !== "PREREGISTRADO"
        ? "Editar ubicación"
        : isAdmin && editActivo.estado_registro === "PREREGISTRADO"
          ? "Editar preregistro"
          : "Editar activo";

    const editBreadcrumbs: PanelBreadcrumbItem[] = isAdmin
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
                  : "Guardar ubicación"
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
      {isAdmin && (
        <p className="mb-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-foreground">
          Vista consolidada de todos los activos de su entidad. Los preregistros quedan pendientes
          hasta validación del contador.
        </p>
      )}
      <div className="flex min-h-0 min-w-0 flex-col gap-2">
        <div className="panel-sticky-toolbar">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="panel-toolbar-title min-w-0">
              <h1 className="panel-toolbar-heading text-foreground">Inventario global</h1>
              <p className="panel-toolbar-subtitle">
                {isAdmin
                  ? `Todos los activos de ${fixedEntidadNombre ?? "su entidad"} en todos los ambientes`
                  : "Consulta y gestión de activos en todas las entidades"}
              </p>
            </div>
            <div className="panel-toolbar-actions">
              <PanelCountLabel count={filtrados.length} singular="activo" plural="activos" />
              {!isAdmin && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 px-2 text-xs"
                  onClick={() => setImportOpen(true)}
                >
                  Importar activos
                </Button>
              )}
              {!isAdmin && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 shrink-0 px-2 text-xs text-destructive hover:text-destructive"
                  onClick={() => setEliminarOpen(true)}
                >
                  Eliminar por códigos
                </Button>
              )}
            </div>
          </div>

          <div className="panel-filter-row" role="tablist" aria-label="Estado del activo">
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
                    isAdmin
                      ? "Buscar código, nombre, sucursal o ambiente…"
                      : "Buscar código, nombre, entidad…"
                  }
                />
              </div>

              {!isAdmin && (
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

              <Select
                aria-label="Ambiente"
                size="compact"
                value={ambienteId}
                disabled={!sedeId}
                onChange={setAmbienteId}
                options={[
                  { value: "", label: "Ambiente: todos" },
                  ...ambientes.map((a) => ({ value: a.id, label: a.nombre })),
                ]}
              />

              {hasActiveFilters && (
                <Button type="button" size="sm" variant="ghost" className="h-8 px-2 text-xs" onClick={limpiarFiltros}>
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </div>

        <ActivosInventarioExcelView
          activos={filtrados}
          onEditActivo={setEditActivo}
          onIrAmbiente={irAlAmbiente}
          puedeDarDeBaja={!isAdmin}
          puedeValidarPreregistro={!isAdmin}
          modoAdmin={isAdmin}
          mostrarEstadoRegistro={isAdmin}
          editarLabel={isAdmin ? undefined : "Editar activo"}
        />
      </div>

      {!isAdmin && (
        <InventarioImportDialog
          open={importOpen}
          onClose={() => setImportOpen(false)}
          entidades={entidades}
        />
      )}
      {!isAdmin && (
        <EliminarActivosPorCodigosDialog
          open={eliminarOpen}
          onClose={() => setEliminarOpen(false)}
          entidades={entidades}
          modalClassName={panelModalClass}
          onPreview={previewDeleteActivosPorCodigos}
          onDelete={deleteActivosPorCodigos}
          onDeleted={() => router.refresh()}
        />
      )}
    </>
  );
}
