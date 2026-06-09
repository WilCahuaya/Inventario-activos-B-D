"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Entidad, SedeConConteo } from "@inventario/types";
import { Button, Dialog } from "@inventario/ui";
import type { AmbienteConSede } from "@/lib/actions/ubicacion";
import { createAmbiente, updateAmbiente } from "@/lib/actions/ubicacion";
import { AmbienteFormFields, ambienteFromForm } from "./AmbienteFormFields";
import {
  EditIcon,
  PanelCountLabel,
  PanelEmptyState,
  PanelPageHeader,
  PanelSearchInput,
  panelCardClass,
} from "./panel-ui";

interface AdminAmbientesPanelProps {
  entidad: Entidad;
  ambientes: AmbienteConSede[];
  sedes: SedeConConteo[];
  activosPorAmbiente: Record<string, number>;
}

export function AdminAmbientesPanel({
  entidad,
  ambientes: initial,
  sedes,
  activosPorAmbiente,
}: AdminAmbientesPanelProps) {
  const router = useRouter();
  const [ambientes, setAmbientes] = useState(initial);
  const [busqueda, setBusqueda] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editAmbiente, setEditAmbiente] = useState<AmbienteConSede | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtrados = useMemo(() => {
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
      responsable: input.responsable,
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
              responsable: input.responsable.trim() || null,
            }
          : a,
      ),
    );
    setEditAmbiente(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <PanelPageHeader
        title="Ambientes"
        subtitle="Seleccione un ambiente para ver el inventario o preregistrar bienes"
        backHref="/admin"
        backLabel="Mi inventario"
        actions={
          <Button type="button" onClick={() => setCreateOpen(true)} disabled={sedes.length === 0}>
            + Nuevo ambiente
          </Button>
        }
      />

      <div className="rounded-xl border border-border/70 bg-card px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Entidad</p>
        <p className="font-semibold text-primary">{entidad.nombre}</p>
        {entidad.ruc && <p className="text-sm text-muted-foreground">RUC {entidad.ruc}</p>}
      </div>

      {sedes.length === 0 && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm">
          No hay sucursales configuradas. Contacte al contador para registrar sucursales antes de
          crear ambientes.
        </p>
      )}

      <PanelCountLabel count={filtrados.length} singular="ambiente" plural="ambientes" />

      <PanelSearchInput
        value={busqueda}
        onChange={setBusqueda}
        placeholder="Buscar por nombre, responsable o sucursal…"
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
      ) : (
        <div className="space-y-8">
          {gruposPorSede.map(({ sedeId, sedeNombre, ambientes: lista }) => (
            <section key={sedeId}>
              <h2 className="mb-4 text-lg font-bold uppercase tracking-wide text-primary">
                {sedeNombre}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {lista.map((amb) => {
                  const totalActivos = activosPorAmbiente[amb.id] ?? 0;
                  return (
                    <article key={amb.id} className={`${panelCardClass} flex flex-col`}>
                      <div className="border-b border-border/50 px-4 py-3">
                        <h3 className="font-semibold text-foreground">{amb.nombre}</h3>
                        {amb.responsable && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            Responsable: {amb.responsable}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col gap-2 px-4 py-3 text-sm text-muted-foreground">
                        {amb.descripcion ? (
                          <p>{amb.descripcion}</p>
                        ) : (
                          <p className="italic">Sin descripción</p>
                        )}
                        <p className="mt-auto text-xs font-medium uppercase tracking-wide">
                          {totalActivos} {totalActivos === 1 ? "activo" : "activos"}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 border-t border-border/50 bg-muted/20 px-4 py-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => setEditAmbiente(amb)}
                        >
                          <EditIcon />
                          Editar
                        </Button>
                        <Link
                          href={`/admin/ambientes/${amb.id}`}
                          className="ml-auto inline-flex h-9 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90"
                        >
                          Ver inventario →
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
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
        className="max-w-md"
      >
        {editAmbiente && (
          <form onSubmit={(e) => void handleEdit(e)} className="space-y-4">
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
