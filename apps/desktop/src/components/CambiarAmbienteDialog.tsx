import { useEffect, useState, type FormEvent } from "react";
import type { Activo, Ambiente, Sede } from "@inventario/types";
import { Button, Dialog, Label } from "@inventario/ui";
import { cambiarUbicacionActivo } from "../lib/activos";
import { listAmbientes, listSedes } from "../lib/ubicacion";

interface CambiarAmbienteDialogProps {
  open: boolean;
  onClose: () => void;
  activo: Activo;
  onSuccess?: () => void;
}

export function CambiarAmbienteDialog({
  open,
  onClose,
  activo,
  onSuccess,
}: CambiarAmbienteDialogProps) {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [ambientes, setAmbientes] = useState<Ambiente[]>([]);
  const [sedeId, setSedeId] = useState(activo.sede_id ?? "");
  const [ambienteId, setAmbienteId] = useState(activo.ambiente_id ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSedeId(activo.sede_id ?? "");
    setAmbienteId(activo.ambiente_id ?? "");
    setError(null);
    setPending(false);
    void listSedes(activo.entidad_id).then(setSedes);
  }, [open, activo.entidad_id, activo.sede_id, activo.ambiente_id]);

  useEffect(() => {
    if (!open || !sedeId) {
      setAmbientes([]);
      return;
    }
    void listAmbientes(sedeId).then(setAmbientes);
  }, [open, sedeId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!sedeId || !ambienteId) {
      setError("Seleccione sede y ambiente.");
      return;
    }

    setPending(true);
    setError(null);
    const result = await cambiarUbicacionActivo(activo.id, sedeId, ambienteId);
    setPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    onClose();
    onSuccess?.();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Cambiar de ambiente"
      description={`Mueva «${activo.nombre}» a otra sede o ambiente dentro de la entidad.`}
      className="max-w-md"
    >
      <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
        <div className="space-y-2">
          <Label htmlFor="cambiar_sede">Sede</Label>
          <select
            id="cambiar_sede"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={sedeId}
            onChange={(e) => {
              setSedeId(e.target.value);
              setAmbienteId("");
            }}
          >
            <option value="">Seleccione sede…</option>
            {sedes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cambiar_ambiente">Ambiente</Label>
          <select
            id="cambiar_ambiente"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={ambienteId}
            disabled={!sedeId}
            onChange={(e) => setAmbienteId(e.target.value)}
          >
            <option value="">Seleccione ambiente…</option>
            {ambientes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nombre}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pending || !sedeId || !ambienteId}>
            {pending ? "Guardando…" : "Guardar ubicación"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
