"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Entidad } from "@inventario/types";
import type { SedeConConteo } from "@inventario/types";
import { Button, Dialog } from "@inventario/ui";
import type { AmbienteConSede } from "@/lib/actions/ubicacion";
import { createAmbiente, deleteAmbiente, updateAmbiente } from "@/lib/actions/ubicacion";
import { AmbienteFormFields, ambienteFromForm } from "./AmbienteFormFields";
import { GestionarSucursales } from "./GestionarSucursales";
import {
  EditIcon,
  PanelBanner,
  PanelEmptyState,
  PanelPageHeader,
  PanelSearchInput,
  PanelToolbar,
  StatusBadge,
  panelCardClass,
} from "./panel-ui";

type AmbienteRow = AmbienteConSede;

interface AmbientesPanelProps {
  entidad: Entidad;
  ambientes: AmbienteRow[];
  sedes: SedeConConteo[];
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
        <p className="mt-auto pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Entidad: {entidadNombre}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border/50 bg-muted/20 px-3 py-2.5">
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onEdit}>
          <EditIcon />
          Editar
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          Eliminar
        </Button>
        <Link
          href={`/contador/entidades/${entidadId}/ambientes/${ambiente.id}`}
          className="ml-auto inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Ver activos →
        </Link>
      </div>
    </article>
  );
}

export function AmbientesPanel({ entidad, ambientes: initial, sedes: initialSedes }: AmbientesPanelProps) {
  const router = useRouter();
  const [ambientes, setAmbientes] = useState(initial);
  const [sedes, setSedes] = useState(initialSedes);
  const [busqueda, setBusqueda] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editAmbiente, setEditAmbiente] = useState<AmbienteRow | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      responsable: input.responsable,
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
              responsable: input.responsable.trim() || null,
            }
          : a,
      ),
    );
    setEditAmbiente(null);
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
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PanelPageHeader
        title="Gestión de ambientes"
        subtitle="Administra los ambientes y sucursales de la entidad"
        backHref="/contador/entidades"
        backLabel="Entidades"
      />

      <PanelBanner
        label="Entidad"
        title={entidad.nombre}
        subtitle={entidad.ruc ? `RUC ${entidad.ruc}` : undefined}
      />

      <PanelToolbar
        left={
          <p className="text-sm text-muted-foreground">
            {ambientesFiltrados.length}{" "}
            {ambientesFiltrados.length === 1 ? "ambiente" : "ambientes"}
            {busqueda.trim() ? " encontrados" : " registrados"}
          </p>
        }
        right={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            + Crear ambiente
          </Button>
        }
      />

      <PanelSearchInput
        value={busqueda}
        onChange={setBusqueda}
        placeholder="Buscar por nombre, descripción, responsable o sucursal…"
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

      <GestionarSucursales
        entidadId={entidad.id}
        sedes={sedes}
        onSedesChange={setSedes}
      />

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
          <AmbienteFormFields sedes={sedes} showSedeSelect />
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
            <AmbienteFormFields ambiente={editAmbiente} sedes={sedes} />
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
