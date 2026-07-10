import { useEffect, useState, type FormEvent } from "react";
import type { Activo, Ambiente, Sede } from "@inventario/types";
import { entidadMuestraSelectorSede, sedeIdSinSelector } from "@inventario/types";
import { Button, Dialog, Label, Select } from "@inventario/ui";
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
    void listSedes(activo.entidad_id).then((data) => {
      setSedes(data);
      const implicitId = sedeIdSinSelector(data);
      if (implicitId) {
        setSedeId(implicitId);
      } else {
        setSedeId(activo.sede_id ?? "");
      }
    });
  }, [open, activo.entidad_id, activo.sede_id, activo.ambiente_id]);

  const mostrarSelectorSede = entidadMuestraSelectorSede(sedes);

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
    try {
      const result = await cambiarUbicacionActivo(activo.id, sedeId, ambienteId);
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
      onSuccess?.();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Cambiar de ambiente"
      description={`Mueva «${activo.nombre}» a otro ambiente dentro de la entidad.`}
      className="max-w-md"
    >
      <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
        {mostrarSelectorSede && (
        <div className="space-y-2">
          <Label htmlFor="cambiar_sede">Sede</Label>
          <Select
            id="cambiar_sede"
            value={sedeId}
            onChange={(value) => {
              setSedeId(value);
              setAmbienteId("");
            }}
            options={[
              { value: "", label: "Seleccione sede…" },
              ...sedes.map((s) => ({ value: s.id, label: s.nombre })),
            ]}
          />
        </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="cambiar_ambiente">Ambiente</Label>
          <Select
            id="cambiar_ambiente"
            value={ambienteId}
            disabled={mostrarSelectorSede ? !sedeId : false}
            onChange={setAmbienteId}
            options={[
              { value: "", label: "Seleccione ambiente…" },
              ...ambientes.map((a) => ({ value: a.id, label: a.nombre })),
            ]}
          />
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
