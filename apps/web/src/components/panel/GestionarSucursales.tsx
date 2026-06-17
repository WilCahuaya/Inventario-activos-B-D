"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { SedeConConteo } from "@inventario/types";
import { Button, Dialog, Input, Label } from "@inventario/ui";
import {
  DeleteIcon,
  EditIcon,
  PanelDataTable,
  PanelIconAction,
  PanelTableColgroup,
  PanelTableTd,
  PanelTableTh,
  PanelToolbar,
  SUCURSALES_TABLE_COL_WIDTHS_PCT,
  panelTableBodyRowClass,
  panelTableHeadRowClass,
  panelTableMutedClass,
  panelTableStickyHeadClass,
} from "@inventario/ui/panel";
import { createSede, deleteSede, updateSede } from "@/lib/actions/ubicacion";
import {
  PanelCountLabel,
  PanelEmptyState,
  PanelFlashMessage,
  StatusBadge,
} from "./panel-ui";

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
    <div className="space-y-4">
      <PanelToolbar
        left={<PanelCountLabel count={sedes.length} singular="sucursal" plural="sucursales" />}
        right={
          <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
            + Nueva sucursal
          </Button>
        }
      />

      <p className="text-xs text-muted-foreground">
        Puede renombrar cualquier sucursal. Solo puede eliminar las que no tengan ambientes
        asociados. La sucursal Principal no se puede editar ni eliminar.
      </p>

      {message && <PanelFlashMessage variant="error">{message}</PanelFlashMessage>}

      {sedes.length === 0 ? (
        <PanelEmptyState
          message="No hay sucursales registradas."
          action={
            <Button type="button" onClick={() => setCreateOpen(true)}>
              + Crear primera sucursal
            </Button>
          }
        />
      ) : (
        <PanelDataTable>
          <PanelTableColgroup widths={SUCURSALES_TABLE_COL_WIDTHS_PCT} />
          <thead className={panelTableStickyHeadClass}>
            <tr className={panelTableHeadRowClass}>
              <PanelTableTh>Sucursal</PanelTableTh>
              <PanelTableTh align="center">Ambientes</PanelTableTh>
              <PanelTableTh>Tipo</PanelTableTh>
              <PanelTableTh align="right">Acciones</PanelTableTh>
            </tr>
          </thead>
          <tbody>
            {sedes.map((sede) => (
              <tr key={sede.id} className={panelTableBodyRowClass}>
                <PanelTableTd className="font-medium" title={sede.nombre}>
                  {sede.nombre}
                </PanelTableTd>
                <PanelTableTd align="center">{sede.ambiente_count}</PanelTableTd>
                <PanelTableTd>
                  {sede.es_principal ? (
                    <StatusBadge variant="active">Principal</StatusBadge>
                  ) : (
                    <span className={panelTableMutedClass}>Secundaria</span>
                  )}
                </PanelTableTd>
                <PanelTableTd align="right" className="overflow-visible">
                  {!sede.es_principal ? (
                    <div className="flex items-center justify-end gap-1">
                      <PanelIconAction label="Editar" onClick={() => setEditSede(sede)}>
                        <EditIcon />
                      </PanelIconAction>
                      <PanelIconAction
                        label="Eliminar"
                        variant="danger"
                        onClick={() => handleDelete(sede)}
                      >
                        <DeleteIcon />
                      </PanelIconAction>
                    </div>
                  ) : (
                    <span className={`text-xs ${panelTableMutedClass}`}>—</span>
                  )}
                </PanelTableTd>
              </tr>
            ))}
          </tbody>
        </PanelDataTable>
      )}

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
