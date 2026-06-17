"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Entidad, ResponsableConConteo } from "@inventario/types";
import type { SedeConConteo } from "@inventario/types";
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
  AMBIENTES_TABLE_COL_WIDTHS_PCT,
  panelTableBodyRowClass,
  panelTableHeadRowClass,
  panelTableShrinkCellClass,
  panelTableStickyHeadClass,
  useStoredViewMode,
} from "@inventario/ui/panel";
import type { AmbienteConSede } from "@/lib/actions/ubicacion";
import { createAmbiente, deleteAmbiente, listAmbientesPorEntidad, updateAmbiente } from "@/lib/actions/ubicacion";
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

type EntityTab = "ambientes" | "responsables" | "sucursales";

const ENTITY_TABS: { id: EntityTab; label: string }[] = [
  { id: "ambientes", label: "Ambientes" },
  { id: "responsables", label: "Responsables" },
  { id: "sucursales", label: "Sucursales" },
];

function parseInitialTab(value?: string): EntityTab {
  if (value === "responsables" || value === "sucursales") return value;
  return "ambientes";
}

type AmbienteRow = AmbienteConSede;

interface AmbientesPanelProps {
  entidad: Entidad;
  ambientes: AmbienteRow[];
  sedes: SedeConConteo[];
  responsables: ResponsableConConteo[];
  initialTab?: EntityTab;
}

interface AmbienteCardProps {
  ambiente: AmbienteRow;
  entidadId: string;
  entidadNombre: string;
  onEdit: () => void;
  onDelete: () => void;
}

function AmbienteCard({ ambiente, entidadId, entidadNombre, onEdit, onDelete }: AmbienteCardProps) {
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
          href={`/contador/entidades/${entidadId}/ambientes/${ambiente.id}`}
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
  initialTab = "ambientes",
}: AmbientesPanelProps) {
  const router = useRouter();
  const [tab, setTab] = useState<EntityTab>(parseInitialTab(initialTab));
  const [ambientes, setAmbientes] = useState(initial);
  const [sedes, setSedes] = useState(initialSedes);
  const [responsables, setResponsables] = useState(initialResponsables);
  const [busqueda, setBusqueda] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editAmbiente, setEditAmbiente] = useState<AmbienteRow | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useStoredViewMode("inventario-view-ambientes", "list");

  async function syncAmbientesYResponsables() {
    const [ambList, respList] = await Promise.all([
      listAmbientesPorEntidad(entidad.id),
      listResponsables(entidad.id),
    ]);
    setAmbientes(ambList);
    setResponsables(respList);
    router.refresh();
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

  return (
    <div className="space-y-4">
      <PanelPageHeader
        breadcrumbs={[
          { label: "Entidades", href: "/contador/entidades" },
          { label: entidad.nombre },
        ]}
        subtitle={
          entidad.ruc
            ? `RUC ${entidad.ruc} · Ambientes, responsables y sucursales`
            : "Ambientes, responsables y sucursales"
        }
      />

      <PanelTabs tabs={ENTITY_TABS} value={tab} onChange={setTab} />

      {tab === "responsables" ? (
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
      ) : tab === "sucursales" ? (
        <GestionarSucursales
          entidadId={entidad.id}
          sedes={sedes}
          onSedesChange={(next) => {
            setSedes(next);
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
            busqueda.trim()
              ? "No hay ambientes que coincidan con la búsqueda."
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
                    onDelete={() => handleDeleteAmbiente(amb)}
                    nav={{
                      label: "Activos",
                      kind: "activos",
                      href: `/contador/entidades/${entidad.id}/ambientes/${amb.id}`,
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
                    entidadId={entidad.id}
                    entidadNombre={entidad.nombre}
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
        description="Registre un ambiente en la sucursal que corresponda."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <AmbienteFormFields sedes={sedes} responsables={responsables} showSedeSelect />
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

    </div>
  );
}
