"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Activo, EstadoRegistro } from "@inventario/types";
import { ActivoEditScopeNav, type ActivoEditScope } from "@inventario/ui/panel";
import { ActivoForm } from "./ActivoForm";
import { ActivosInventarioExcelView } from "./ActivosInventarioExcelView";
import { AmbienteReportesExport } from "./AmbienteReportesExport";
import type { FichaAsignacionExportMeta } from "@/lib/actions/ficha-asignacion-meta";
import { useEjemplaresResumen } from "@/hooks/useEjemplaresResumen";
import {
  PanelPageHeader,
  PanelSearchInput,
  panelFilterRowClass,
  panelStickyToolbarClass,
  panelToolbarActionsClass,
  type PanelBreadcrumbItem,
} from "./panel-ui";

interface ActivosAmbientePanelProps {
  entidadId: string;
  entidadNombre: string;
  ambienteId: string;
  ambienteNombre: string;
  ambienteResponsable?: string | null;
  sedeId: string;
  fichaExportMeta?: FichaAsignacionExportMeta;
  activos: Activo[];
  usuarioNombre: string;
  usuarioEmail: string;
  esAmbientePreregistro?: boolean;
  /** contador: registro completo; admin: solo preregistro */
  mode?: "contador" | "admin";
}

const FILTROS_ESTADO_AMBIENTE: { value: "" | EstadoRegistro; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "REGISTRADO", label: "Registrados" },
  { value: "DADO_DE_BAJA", label: "Dados de baja" },
];

export function ActivosAmbientePanel({
  entidadId,
  entidadNombre,
  ambienteId,
  ambienteNombre,
  ambienteResponsable,
  sedeId,
  fichaExportMeta,
  activos,
  usuarioNombre,
  usuarioEmail,
  esAmbientePreregistro = false,
  mode = "contador",
}: ActivosAmbientePanelProps) {
  const isAdmin = mode === "admin";
  const router = useRouter();
  const [editActivo, setEditActivo] = useState<Activo | null>(null);
  const [editScope, setEditScope] = useState<ActivoEditScope>("single");
  const { resumen: ejemplaresResumen } = useEjemplaresResumen(editActivo?.id);
  const ejemplaresTotal = ejemplaresResumen?.total ?? 0;

  useEffect(() => {
    setEditScope("single");
  }, [editActivo?.id]);
  const [busqueda, setBusqueda] = useState("");
  const [estadoRegistro, setEstadoRegistro] = useState<"" | EstadoRegistro>(
    esAmbientePreregistro ? "PREREGISTRADO" : "",
  );

  const nuevoHref = isAdmin
    ? `/admin/ambientes/${ambienteId}/nuevo`
    : `/contador/entidades/${entidadId}/ambientes/${ambienteId}/nuevo`;

  const nuevoLabel = isAdmin || esAmbientePreregistro ? "+ Preregistrar activo" : "+ Nuevo activo";
  const editarLabel = isAdmin ? undefined : "Editar activo";

  const listBreadcrumbs: PanelBreadcrumbItem[] = isAdmin
    ? [
        { label: "Ambientes", href: "/admin/activos" },
        { label: ambienteNombre },
      ]
    : [
        { label: entidadNombre, href: `/contador/entidades/${entidadId}` },
        { label: ambienteNombre },
      ];

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return activos.filter((a) => {
      if (esAmbientePreregistro) {
        if (a.estado_registro !== "PREREGISTRADO") return false;
      } else if (a.estado_registro === "PREREGISTRADO") {
        return false;
      } else if (estadoRegistro && a.estado_registro !== estadoRegistro) {
        return false;
      }
      if (!q) return true;
      return (
        a.nombre.toLowerCase().includes(q) ||
        (a.codigo_barras?.toLowerCase().includes(q) ?? false) ||
        a.codigo_catalogo.toLowerCase().includes(q) ||
        (a.marca?.toLowerCase().includes(q) ?? false) ||
        (a.modelo?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [activos, busqueda, estadoRegistro, esAmbientePreregistro]);

  function handleSuccess() {
    setEditActivo(null);
    router.refresh();
  }

  if (editActivo) {
    const editTitle =
      isAdmin && editActivo.estado_registro !== "PREREGISTRADO"
        ? "Editar ubicación"
        : isAdmin && editActivo.estado_registro === "PREREGISTRADO"
          ? "Editar preregistro"
          : "Editar activo";

    const editBreadcrumbs: PanelBreadcrumbItem[] = [
      ...(isAdmin
        ? [{ label: "Ambientes", href: "/admin/activos" }]
        : [{ label: entidadNombre, href: `/contador/entidades/${entidadId}` }]),
      { label: ambienteNombre, onClick: () => setEditActivo(null) },
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
          entidades={[]}
          fixedEntidadId={entidadId}
          fixedSedeId={isAdmin ? undefined : sedeId}
          fixedAmbienteId={isAdmin ? undefined : ambienteId}
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
          asignaCodigoInmediato={
            !isAdmin && editActivo.estado_registro !== "PREREGISTRADO"
          }
          variant="page"
          onSuccess={handleSuccess}
          onCancel={() => setEditActivo(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <PanelPageHeader
        breadcrumbs={listBreadcrumbs}
        subtitle={
          ambienteResponsable ? `Responsable: ${ambienteResponsable}` : undefined
        }
      />

      {esAmbientePreregistro && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-foreground">
          {isAdmin ? (
            <>
              Cola de bienes <strong>preregistrados</strong>. El contador los validará y los moverá al
              ambiente definitivo. Puede indicar un posible ambiente de destino (opcional).
            </>
          ) : (
            <>
              Bienes en cola de preregistro. Valídelos para asignar código y moverlos al ambiente
              definitivo.
            </>
          )}
        </p>
      )}

      <div className="flex min-h-0 min-w-0 flex-col gap-2">
        <div className={panelStickyToolbarClass}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="panel-toolbar-title min-w-0">
              <h1 className="panel-toolbar-heading text-foreground">{ambienteNombre}</h1>
            </div>
            <div className={panelToolbarActionsClass}>
              {!esAmbientePreregistro && (
                <AmbienteReportesExport
                  entidadId={entidadId}
                  entidadNombre={entidadNombre}
                  sedeId={sedeId}
                  ambienteId={ambienteId}
                  ambienteNombre={ambienteNombre}
                  ambienteResponsable={ambienteResponsable}
                  fichaExportMeta={fichaExportMeta}
                  usuarioNombre={usuarioNombre}
                  usuarioEmail={usuarioEmail}
                  esAdmin={isAdmin}
                />
              )}
              <span className="text-xs text-muted-foreground">
                {filtrados.length} {filtrados.length === 1 ? "activo" : "activos"}
              </span>
              <Link
                href={nuevoHref}
                className="inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:opacity-90"
              >
                {nuevoLabel}
              </Link>
            </div>
          </div>

          <div className={panelFilterRowClass} role={esAmbientePreregistro ? undefined : "tablist"} aria-label={esAmbientePreregistro ? undefined : "Estado del activo"}>
            {!esAmbientePreregistro && (
              <div className="inline-flex flex-wrap gap-0.5 rounded-md border border-border/60 bg-muted/30 p-0.5">
                {FILTROS_ESTADO_AMBIENTE.map((f) => (
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
            )}

            <div className={`min-w-[10rem] flex-1 md:max-w-xs [&_input]:h-8 [&_input]:py-1 [&_input]:text-sm ${esAmbientePreregistro ? "w-full max-w-none" : ""}`}>
              <PanelSearchInput
                value={busqueda}
                onChange={setBusqueda}
                placeholder="Buscar por código, nombre, marca…"
              />
            </div>
          </div>
        </div>

        <ActivosInventarioExcelView
        activos={filtrados}
        onEditActivo={setEditActivo}
        puedeDarDeBaja={!isAdmin && !esAmbientePreregistro}
        puedeValidarPreregistro={!isAdmin && esAmbientePreregistro}
        modoAdmin={isAdmin}
        mostrarEstadoRegistro={!esAmbientePreregistro}
        mostrarPosibleAmbiente={esAmbientePreregistro}
        emptyActionLabel={nuevoLabel}
      />
      </div>
    </div>
  );
}
