"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Activo, EstadoRegistro } from "@inventario/types";
import { Dialog } from "@inventario/ui";
import { ActivoFichaView, type ActivoFicha } from "./ActivoFichaView";
import { ActivoForm } from "./ActivoForm";
import { ActivosInventarioExcelView } from "./ActivosInventarioExcelView";
import { InventarioExportButtons } from "./InventarioExportButtons";
import {
  PanelPageHeader,
  PanelSearchInput,
  panelModalClass,
  type PanelBreadcrumbItem,
} from "./panel-ui";

interface ActivosAmbientePanelProps {
  entidadId: string;
  entidadNombre: string;
  ambienteId: string;
  ambienteNombre: string;
  ambienteResponsable?: string | null;
  sedeId: string;
  activos: Activo[];
  /** contador: registro completo; admin: solo preregistro */
  mode?: "contador" | "admin";
}

const FILTROS_ESTADO: { value: "" | EstadoRegistro; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "REGISTRADO", label: "Registrados" },
  { value: "PREREGISTRADO", label: "Preregistrados" },
  { value: "DADO_DE_BAJA", label: "Dados de baja" },
];

function labelEditarAdmin(activo: Activo) {
  return activo.estado_registro === "PREREGISTRADO" ? "Editar preregistro" : "Editar ubicación";
}

export function ActivosAmbientePanel({
  entidadId,
  entidadNombre,
  ambienteId,
  ambienteNombre,
  ambienteResponsable,
  sedeId,
  activos,
  mode = "contador",
}: ActivosAmbientePanelProps) {
  const isAdmin = mode === "admin";
  const router = useRouter();
  const [editActivo, setEditActivo] = useState<Activo | null>(null);
  const [fichaActivo, setFichaActivo] = useState<ActivoFicha | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [estadoRegistro, setEstadoRegistro] = useState<"" | EstadoRegistro>("");

  const nuevoHref = isAdmin
    ? `/admin/ambientes/${ambienteId}/nuevo`
    : `/contador/entidades/${entidadId}/ambientes/${ambienteId}/nuevo`;

  const nuevoLabel = isAdmin ? "+ Preregistrar activo" : "+ Nuevo activo";
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

  const fichaBreadcrumbs: PanelBreadcrumbItem[] = [
    ...(isAdmin
      ? [{ label: "Ambientes", href: "/admin/activos" }]
      : [{ label: entidadNombre, href: `/contador/entidades/${entidadId}` }]),
    { label: ambienteNombre, onClick: () => setFichaActivo(null) },
    { label: fichaActivo?.nombre ?? "Activo" },
  ];

  useEffect(() => {
    if (!fichaActivo) return;
    const fresh = activos.find((a) => a.id === fichaActivo.id);
    if (fresh) {
      setFichaActivo((prev) => (prev ? { ...prev, ...fresh } : null));
    }
  }, [activos, fichaActivo?.id]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return activos.filter((a) => {
      if (estadoRegistro && a.estado_registro !== estadoRegistro) return false;
      if (!q) return true;
      return (
        a.nombre.toLowerCase().includes(q) ||
        (a.codigo_barras?.toLowerCase().includes(q) ?? false) ||
        a.codigo_catalogo.toLowerCase().includes(q) ||
        (a.marca?.toLowerCase().includes(q) ?? false) ||
        (a.modelo?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [activos, busqueda, estadoRegistro]);

  function handleOpenFicha(activo: Activo) {
    setFichaActivo({
      ...activo,
      ambiente_nombre:
        (activo as ActivoFicha).ambiente_nombre ?? ambienteNombre,
      sede_nombre: (activo as ActivoFicha).sede_nombre,
    });
  }

  function handleEditFromFicha() {
    if (!fichaActivo) return;
    setEditActivo(fichaActivo);
  }

  function handleSuccess() {
    setEditActivo(null);
    router.refresh();
  }

  if (fichaActivo) {
    const puedeEditar =
      !isAdmin || fichaActivo.estado_registro === "PREREGISTRADO";

    return (
      <div className="space-y-4">
        <PanelPageHeader breadcrumbs={fichaBreadcrumbs} />
        <ActivoFichaView
          activo={fichaActivo}
          onEdit={puedeEditar ? handleEditFromFicha : undefined}
          puedeDarDeBaja={!isAdmin}
          puedeValidarPreregistro={false}
          editarLabel={
            isAdmin ? labelEditarAdmin(fichaActivo) : editarLabel
          }
        />

        <Dialog
          open={!!editActivo}
          onClose={() => setEditActivo(null)}
          title={
            editActivo && isAdmin
              ? editActivo.estado_registro === "PREREGISTRADO"
                ? "Editar preregistro"
                : "Editar ubicación"
              : "Editar activo"
          }
          className={panelModalClass}
        >
          {editActivo && (
            <ActivoForm
              entidades={[]}
              fixedEntidadId={entidadId}
              fixedSedeId={isAdmin ? undefined : sedeId}
              fixedAmbienteId={isAdmin ? undefined : ambienteId}
              activo={editActivo}
              mode="edit"
              submitLabel={
                isAdmin
                  ? editActivo.estado_registro === "PREREGISTRADO"
                    ? "Guardar preregistro"
                    : "Guardar ubicación"
                  : "Guardar cambios"
              }
              soloUbicacion={isAdmin && editActivo.estado_registro !== "PREREGISTRADO"}
              asignaCodigoInmediato={!isAdmin}
              variant="modal"
              onSuccess={handleSuccess}
            />
          )}
        </Dialog>
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

      {isAdmin && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-foreground">
          Los activos que usted registre quedarán como <strong>PREREGISTRADO</strong> hasta que el
          contador los valide. Mientras estén preregistrados puede editarlos con «Editar
          preregistro». Los ya registrados se mueven con «Cambiar de ambiente» en el detalle.
        </p>
      )}

      <div className="flex min-h-0 min-w-0 flex-col gap-2">
        <div className="sticky top-0 z-20 shrink-0 space-y-2 rounded-lg border border-border/60 bg-card/95 px-3 py-2 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-card/90">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-base font-semibold leading-tight text-foreground">{ambienteNombre}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <InventarioExportButtons
                activos={filtrados}
                sinValores={isAdmin}
                meta={{
                  ambienteNombre,
                  responsable: ambienteResponsable,
                  entidadNombre,
                }}
              />
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

          <div
            className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-2"
            role="tablist"
            aria-label="Estado del activo"
          >
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

            <div className="min-w-[10rem] flex-1 md:max-w-xs [&_input]:h-8 [&_input]:py-1 [&_input]:text-sm">
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
        onOpenFicha={handleOpenFicha}
        puedeDarDeBaja={!isAdmin}
        puedeValidarPreregistro={false}
        modoAdmin={isAdmin}
        mostrarEstadoRegistro
        emptyActionLabel={nuevoLabel}
      />
      </div>

      <Dialog
        open={!!editActivo}
        onClose={() => setEditActivo(null)}
        title={
          editActivo && isAdmin
            ? editActivo.estado_registro === "PREREGISTRADO"
              ? "Editar preregistro"
              : "Editar ubicación"
            : "Editar activo"
        }
        className={panelModalClass}
      >
        {editActivo && (
          <ActivoForm
            entidades={[]}
            fixedEntidadId={entidadId}
            fixedSedeId={isAdmin ? undefined : sedeId}
            fixedAmbienteId={isAdmin ? undefined : ambienteId}
            activo={editActivo}
            mode="edit"
            submitLabel={
              isAdmin
                ? editActivo.estado_registro === "PREREGISTRADO"
                  ? "Guardar preregistro"
                  : "Guardar ubicación"
                : "Guardar cambios"
            }
            soloUbicacion={isAdmin && editActivo.estado_registro !== "PREREGISTRADO"}
            asignaCodigoInmediato={!isAdmin}
            variant="modal"
            onSuccess={handleSuccess}
          />
        )}
      </Dialog>
    </div>
  );
}
