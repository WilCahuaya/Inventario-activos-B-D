import { useEffect, useState, type FormEvent } from "react";
import type { Ambiente, Sede } from "@inventario/types";
import { entidadMuestraSelectorSede, sedeIdSinSelector } from "@inventario/types";
import { Button, Dialog, Label, Select } from "@inventario/ui";
import { cambiarUbicacionActivo, type ActivoConUbicacion } from "../lib/activos";
import { isOnline } from "../lib/master-cache";
import { listAmbientes, listSedes } from "../lib/ubicacion";

interface CambiarAmbienteDialogProps {
  open: boolean;
  onClose: () => void;
  activo: ActivoConUbicacion;
  onSuccess?: (activo: ActivoConUbicacion) => void;
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

    if (sedeId === (activo.sede_id ?? "") && ambienteId === (activo.ambiente_id ?? "")) {
      setError("Seleccione un ambiente distinto al actual.");
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
      if (!result.data) {
        setError("No se pudo actualizar la ubicación.");
        return;
      }
      onClose();
      onSuccess?.(result.data);
    } finally {
      setPending(false);
    }
  }

  const offlineHint = !isOnline();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Cambiar de ambiente"
      description={`Mueva «${activo.nombre}» a otro ambiente dentro de la entidad.`}
      className="max-w-md"
    >
      <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
        {offlineHint && (
          <p className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
            Sin conexión: el cambio se guarda en este equipo y se sincronizará al reconectar.
          </p>
        )}

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
          {sedeId && ambientes.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No hay ambientes disponibles en esta sede
              {offlineHint ? " (caché local)." : "."}
            </p>
          )}
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
