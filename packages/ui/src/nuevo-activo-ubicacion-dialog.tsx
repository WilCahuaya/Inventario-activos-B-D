"use client";

import { useEffect, useState } from "react";
import { Button, Dialog, Label } from "./components";
import { Select, type SelectOption } from "./select";

export interface NuevoActivoUbicacionEntidad {
  id: string;
  nombre: string;
}

export interface NuevoActivoUbicacionAmbiente {
  id: string;
  nombre: string;
  sede_id: string;
  sede_nombre: string;
}

export interface NuevoActivoUbicacionDialogProps {
  open: boolean;
  onClose: () => void;
  entidades: NuevoActivoUbicacionEntidad[];
  loadAmbientes: (entidadId: string) => Promise<NuevoActivoUbicacionAmbiente[]>;
  onConfirm: (selection: {
    entidadId: string;
    ambienteId: string;
    sedeId: string;
  }) => void;
  prefillCodigoCatalogo?: string;
  loadingEntidades?: boolean;
}

export function NuevoActivoUbicacionDialog({
  open,
  onClose,
  entidades,
  loadAmbientes,
  onConfirm,
  prefillCodigoCatalogo,
  loadingEntidades = false,
}: NuevoActivoUbicacionDialogProps) {
  const [entidadId, setEntidadId] = useState("");
  const [ambienteId, setAmbienteId] = useState("");
  const [ambientes, setAmbientes] = useState<NuevoActivoUbicacionAmbiente[]>([]);
  const [loadingAmbientes, setLoadingAmbientes] = useState(false);

  useEffect(() => {
    if (!open) {
      setEntidadId("");
      setAmbienteId("");
      setAmbientes([]);
      return;
    }
    if (entidades.length === 1) {
      setEntidadId(entidades[0]!.id);
    }
  }, [open, entidades]);

  useEffect(() => {
    if (!open || !entidadId) {
      setAmbientes([]);
      setAmbienteId("");
      return;
    }
    let cancelled = false;
    setLoadingAmbientes(true);
    void loadAmbientes(entidadId)
      .then((data) => {
        if (cancelled) return;
        setAmbientes(data);
        if (data.length === 1) {
          setAmbienteId(data[0]!.id);
        } else {
          setAmbienteId("");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingAmbientes(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, entidadId, loadAmbientes]);

  const entidadOptions: SelectOption[] = [
    { value: "", label: "Seleccione entidad…" },
    ...entidades.map((e) => ({ value: e.id, label: e.nombre })),
  ];

  const ambienteOptions: SelectOption[] = [
    { value: "", label: loadingAmbientes ? "Cargando ambientes…" : "Seleccione ambiente…" },
    ...ambientes.map((a) => ({
      value: a.id,
      label: `${a.sede_nombre} — ${a.nombre}`,
    })),
  ];

  function handleConfirm() {
    const ambiente = ambientes.find((a) => a.id === ambienteId);
    if (!entidadId || !ambiente) return;
    onConfirm({ entidadId, ambienteId: ambiente.id, sedeId: ambiente.sede_id });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Nuevo activo"
      description="Seleccione la entidad y el ambiente donde registrará el bien."
    >
      <div className="space-y-4">
        {prefillCodigoCatalogo && (
          <p className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
            Código de catálogo sugerido:{" "}
            <span className="font-mono text-foreground">{prefillCodigoCatalogo}</span>
          </p>
        )}

        <div className="space-y-2">
          <Label htmlFor="nuevo_activo_entidad">Entidad</Label>
          <Select
            id="nuevo_activo_entidad"
            value={entidadId}
            onChange={setEntidadId}
            disabled={loadingEntidades || entidades.length <= 1}
            options={entidadOptions}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nuevo_activo_ambiente">Ambiente</Label>
          <Select
            id="nuevo_activo_ambiente"
            value={ambienteId}
            onChange={setAmbienteId}
            disabled={!entidadId || loadingAmbientes || ambientes.length === 0}
            options={ambienteOptions}
          />
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!entidadId || !ambienteId || loadingAmbientes}
            onClick={handleConfirm}
          >
            Continuar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
