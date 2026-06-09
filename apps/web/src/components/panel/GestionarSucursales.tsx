"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SedeConConteo } from "@inventario/types";
import { Button, Dialog, Input, Label } from "@inventario/ui";
import { createSede, deleteSede, updateSede } from "@/lib/actions/ubicacion";
import { EditIcon, panelCardClass } from "./panel-ui";

interface GestionarSucursalesProps {
  entidadId: string;
  sedes: SedeConConteo[];
  onSedesChange?: (sedes: SedeConConteo[]) => void;
}

export function GestionarSucursales({
  entidadId,
  sedes: initial,
  onSedesChange,
}: GestionarSucursalesProps) {
  const router = useRouter();
  const [sedes, setSedes] = useState(initial);
  const [createOpen, setCreateOpen] = useState(false);
  const [editSede, setEditSede] = useState<SedeConConteo | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setSedes(initial);
  }, [initial]);

  function updateSedes(next: SedeConConteo[]) {
    setSedes(next);
    onSedesChange?.(next);
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setMessage(null);
    const nombre = String(new FormData(form).get("nombre"));
    const result = await createSede(entidadId, nombre);
    setPending(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    updateSedes([...sedes, { ...result.data!, ambiente_count: 0 }]);
    setCreateOpen(false);
    form.reset();
    router.refresh();
  }

  async function handleEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editSede) return;
    setPending(true);
    setMessage(null);
    const nombre = String(new FormData(event.currentTarget).get("nombre"));
    const result = await updateSede(editSede.id, nombre);
    setPending(false);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    updateSedes(sedes.map((s) => (s.id === editSede.id ? { ...s, nombre: nombre.trim() } : s)));
    setEditSede(null);
    router.refresh();
  }

  async function handleDelete(sede: SedeConConteo) {
    if (!confirm(`¿Eliminar la sucursal "${sede.nombre}"?`)) return;
    setMessage(null);
    const result = await deleteSede(sede.id);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    updateSedes(sedes.filter((s) => s.id !== sede.id));
    router.refresh();
  }

  return (
    <div className={`space-y-4 p-5 ${panelCardClass}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Gestionar sucursales</h2>
        <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
          + Nueva sucursal
        </Button>
      </div>

      <ul className="divide-y overflow-hidden rounded-lg border">
        {sedes.map((sede) => (
          <li
            key={sede.id}
            className="flex items-center justify-between gap-3 bg-background px-4 py-3.5 text-sm"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-base"
                aria-hidden
              >
                🏢
              </span>
              <div>
                <span className="font-semibold text-foreground">{sede.nombre}</span>
                <span className="ml-2 text-muted-foreground">
                  {sede.ambiente_count}{" "}
                  {sede.ambiente_count === 1 ? "ambiente" : "ambientes"}
                </span>
              </div>
            </div>
            {!sede.es_principal && (
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setEditSede(sede)}
                >
                  <EditIcon />
                  Editar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(sede)}
                >
                  Eliminar
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground">
        Puede renombrar cualquier sucursal. Solo puede eliminar las que no tengan ambientes
        asociados. La sucursal Principal no se puede editar ni eliminar.
      </p>

      {message && <p className="text-sm text-destructive">{message}</p>}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} title="Nueva sucursal">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sucursal_nombre">Nombre</Label>
            <Input id="sucursal_nombre" name="nombre" required placeholder="Ej. Chupaca" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              Crear
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={!!editSede} onClose={() => setEditSede(null)} title="Editar sucursal">
        {editSede && (
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_sucursal">Nombre</Label>
              <Input id="edit_sucursal" name="nombre" required defaultValue={editSede.nombre} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditSede(null)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={pending}>
                Guardar
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
