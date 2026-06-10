import { useMemo, useState } from "react";
import type { Entidad } from "@inventario/types";
import { Button, Dialog, Input, Label } from "@inventario/ui";
import {
  EditIcon,
  PanelCountLabel,
  PanelDataTable,
  PanelEmptyState,
  PanelPageHeader,
  PanelSearchInput,
  PanelToolbar,
  PanelViewToggle,
  StatusBadge,
  panelCardClass,
  panelTableBodyRowClass,
  panelTableHeadRowClass,
  panelTableTdClass,
  panelTableThClass,
  useStoredViewMode,
} from "@inventario/ui/panel";
import { ConfirmDialog } from "./ConfirmDialog";
import {
  createEntidad,
  deleteEntidad,
  updateEntidad,
  type CreateEntidadInput,
} from "../lib/entidades";

function EntidadFields({ entidad, requireAdmin = false }: { entidad?: Entidad; requireAdmin?: boolean }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="nombre">Razón social</Label>
        <Input id="nombre" name="nombre" required defaultValue={entidad?.nombre ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ruc">RUC</Label>
        <Input id="ruc" name="ruc" placeholder="20XXXXXXXXX" defaultValue={entidad?.ruc ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="direccion">Dirección</Label>
        <Input id="direccion" name="direccion" defaultValue={entidad?.direccion ?? ""} />
      </div>
      <p className="text-sm font-medium text-muted-foreground">
        Administrador de la entidad
        {requireAdmin && (
          <span className="mt-1 block text-xs font-normal">
            Al ingresar con Google usará el rol de administrador de la entidad con este correo.
          </span>
        )}
      </p>
      <div className="space-y-2">
        <Label htmlFor="admin_nombre">Nombre</Label>
        <Input
          id="admin_nombre"
          name="admin_nombre"
          required={requireAdmin}
          defaultValue={entidad?.admin_nombre ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin_email">Correo</Label>
        <Input
          id="admin_email"
          name="admin_email"
          type="email"
          required={requireAdmin}
          defaultValue={entidad?.admin_email ?? ""}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="admin_telefono">Teléfono</Label>
        <Input
          id="admin_telefono"
          name="admin_telefono"
          type="tel"
          defaultValue={entidad?.admin_telefono ?? ""}
        />
      </div>
    </>
  );
}

function entidadFromForm(form: FormData): CreateEntidadInput {
  return {
    nombre: String(form.get("nombre")),
    ruc: String(form.get("ruc") || ""),
    direccion: String(form.get("direccion") || ""),
    admin_nombre: String(form.get("admin_nombre") || ""),
    admin_email: String(form.get("admin_email") || ""),
    admin_telefono: String(form.get("admin_telefono") || ""),
  };
}

interface EntidadesViewProps {
  entidades: Entidad[];
  online: boolean;
  onEntidadesChange: (entidades: Entidad[]) => void;
  onViewAmbientes: (entidadId: string) => void;
}

export function EntidadesView({
  entidades,
  online,
  onEntidadesChange,
  onViewAmbientes,
}: EntidadesViewProps) {
  const [busqueda, setBusqueda] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editEntidad, setEditEntidad] = useState<Entidad | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Entidad | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [viewMode, setViewMode] = useStoredViewMode("inventario-view-entidades");

  const filtradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return entidades;
    return entidades.filter(
      (e) =>
        e.nombre.toLowerCase().includes(q) ||
        (e.ruc?.toLowerCase().includes(q) ?? false) ||
        (e.admin_nombre?.toLowerCase().includes(q) ?? false),
    );
  }, [entidades, busqueda]);

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setError(null);
    setSuccess(null);

    const result = await createEntidad(entidadFromForm(new FormData(form)));
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onEntidadesChange(
      [...entidades, result.data!].sort((a, b) => a.nombre.localeCompare(b.nombre)),
    );
    setCreateOpen(false);
    form.reset();
    if (result.inviteMessage) setSuccess(result.inviteMessage);
  }

  async function handleEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editEntidad) return;
    setPending(true);
    setError(null);
    setSuccess(null);

    const result = await updateEntidad(editEntidad.id, entidadFromForm(new FormData(event.currentTarget)));
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.inviteMessage) setSuccess(result.inviteMessage);

    onEntidadesChange(
      entidades
        .map((e) => (e.id === editEntidad.id ? result.data! : e))
        .sort((a, b) => a.nombre.localeCompare(b.nombre)),
    );
    setEditEntidad(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setPending(true);
    setError(null);

    const result = await deleteEntidad(deleteTarget.id);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onEntidadesChange(entidades.filter((e) => e.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  return (
    <div className="space-y-6">
      <PanelPageHeader
        title="Gestión de entidades"
        subtitle="Administra las entidades y sus ambientes de inventario"
        actions={
          <Button type="button" disabled={!online} onClick={() => setCreateOpen(true)}>
            + Nueva entidad
          </Button>
        }
      />

      {!online && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          Sin conexión: la gestión de entidades requiere internet.
        </p>
      )}

      {online && (
        <>
          <PanelToolbar
            left={<PanelCountLabel count={filtradas.length} singular="entidad" plural="entidades" />}
            right={<PanelViewToggle value={viewMode} onChange={setViewMode} />}
          />

          <PanelSearchInput
            value={busqueda}
            onChange={setBusqueda}
            placeholder="Buscar por razón social, RUC o administrador…"
          />

          {success && (
            <p className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
              {success}
            </p>
          )}

          {error && !createOpen && !editEntidad && !deleteTarget && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {filtradas.length === 0 ? (
            <PanelEmptyState
              message={
                busqueda.trim()
                  ? "No hay entidades que coincidan con la búsqueda."
                  : "No hay entidades registradas."
              }
              action={
                !busqueda.trim() ? (
                  <Button type="button" onClick={() => setCreateOpen(true)}>
                    + Crear primera entidad
                  </Button>
                ) : undefined
              }
            />
          ) : viewMode === "list" ? (
            <PanelDataTable minWidth={960}>
              <thead>
                <tr className={panelTableHeadRowClass}>
                  <th className={panelTableThClass}>Razón social</th>
                  <th className={panelTableThClass}>RUC</th>
                  <th className={panelTableThClass}>Administrador</th>
                  <th className={panelTableThClass}>Dirección</th>
                  <th className={panelTableThClass}>Estado</th>
                  <th className={`${panelTableThClass} text-right`}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((entidad) => (
                  <tr key={entidad.id} className={panelTableBodyRowClass}>
                    <td className={`${panelTableTdClass} font-medium text-primary`}>
                      {entidad.nombre}
                    </td>
                    <td className={`${panelTableTdClass} text-muted-foreground`}>
                      {entidad.ruc ?? "—"}
                    </td>
                    <td className={panelTableTdClass}>{entidad.admin_nombre ?? "—"}</td>
                    <td className={`${panelTableTdClass} max-w-[200px] truncate text-muted-foreground`}>
                      {entidad.direccion ?? "—"}
                    </td>
                    <td className={panelTableTdClass}>
                      <StatusBadge variant="active">Activa</StatusBadge>
                    </td>
                    <td className={`${panelTableTdClass} text-right`}>
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          onClick={() => {
                            setError(null);
                            setEditEntidad(entidad);
                          }}
                        >
                          <EditIcon />
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            setError(null);
                            setDeleteTarget(entidad);
                          }}
                        >
                          Eliminar
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => onViewAmbientes(entidad.id)}
                        >
                          Ambientes →
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </PanelDataTable>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtradas.map((entidad) => (
                <article key={entidad.id} className={`${panelCardClass} flex flex-col`}>
                  <div className="flex items-start justify-between gap-2 border-b border-border/50 px-4 py-3">
                    <h3 className="font-semibold leading-snug text-primary">{entidad.nombre}</h3>
                    <StatusBadge variant="active">Activa</StatusBadge>
                  </div>

                  <div className="flex flex-1 flex-col gap-2 px-4 py-3 text-sm">
                    {entidad.ruc && (
                      <p className="text-muted-foreground">
                        RUC: <span className="font-medium text-foreground">{entidad.ruc}</span>
                      </p>
                    )}
                    {entidad.admin_nombre && (
                      <p className="font-medium text-foreground">{entidad.admin_nombre}</p>
                    )}
                    {entidad.direccion && (
                      <p className="text-muted-foreground">{entidad.direccion}</p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 border-t border-border/50 bg-muted/20 px-3 py-2.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1.5"
                      onClick={() => {
                        setError(null);
                        setEditEntidad(entidad);
                      }}
                    >
                      <EditIcon />
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setError(null);
                        setDeleteTarget(entidad);
                      }}
                    >
                      Eliminar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="ml-auto"
                      onClick={() => onViewAmbientes(entidad.id)}
                    >
                      Ver ambientes →
                    </Button>
                  </div>
                </article>
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
        title="Nueva entidad"
        description="Se creará la sucursal Principal automáticamente."
        className="max-w-lg"
      >
        <form onSubmit={(e) => void handleCreate(e)} className="space-y-4">
          <EntidadFields requireAdmin />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Crear entidad"}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={!!editEntidad}
        onClose={() => {
          setEditEntidad(null);
          setError(null);
        }}
        title="Editar entidad"
        description={editEntidad?.nombre}
        className="max-w-lg"
      >
        {editEntidad && (
          <form onSubmit={(e) => void handleEdit(e)} className="space-y-4">
            <EntidadFields entidad={editEntidad} requireAdmin />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditEntidad(null)}>
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
        title="Eliminar entidad"
        description={
          deleteTarget
            ? `¿Eliminar la entidad «${deleteTarget.nombre}»? Solo es posible si no tiene activos registrados.`
            : undefined
        }
        confirmLabel="Eliminar"
        confirmVariant="destructive"
        pending={pending}
        error={deleteTarget ? error : null}
        onConfirm={() => void confirmDelete()}
      />
    </div>
  );
}
