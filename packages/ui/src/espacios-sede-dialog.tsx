"use client";

import { useEffect, useState } from "react";
import type { EspacioConOcupacion } from "@inventario/types";
import { Button, Dialog, Input, Label } from "./components";

function nombreDesdeNumero(raw: string): string | null {
  const digits = raw.trim().replace(/\D/g, "");
  if (!digits) return null;
  const n = Number(digits);
  if (!Number.isFinite(n) || n < 1 || n > 9999) return null;
  return `Espacio ${String(n).padStart(2, "0")}`;
}

export function EspaciosSedeDialog({
  open,
  onClose,
  sedeNombre,
  espacios,
  pending,
  error,
  onReload,
  onCreate,
  onEnsureHasta,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  sedeNombre: string;
  espacios: EspacioConOcupacion[];
  pending?: boolean;
  error?: string | null;
  onReload: () => void | Promise<void>;
  onCreate: (nombre: string) => Promise<{ error?: string }>;
  onEnsureHasta: (cantidad: number) => Promise<{ error?: string; creados?: number }>;
  onDelete: (espacioId: string) => Promise<{ error?: string }>;
}) {
  const [numero, setNumero] = useState("");
  const [cantidad, setCantidad] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);
  const [localPending, setLocalPending] = useState(false);

  useEffect(() => {
    if (open) {
      setNumero("");
      setCantidad("");
      setLocalError(null);
      void onReload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al abrir
  }, [open]);

  const busy = pending || localPending;
  const message = localError || error;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const nombre = nombreDesdeNumero(numero);
    if (!nombre) {
      setLocalError("Indique el número del espacio (ej. 01, 10, 25).");
      return;
    }
    setLocalPending(true);
    setLocalError(null);
    const result = await onCreate(nombre);
    setLocalPending(false);
    if (result.error) {
      setLocalError(result.error);
      return;
    }
    setNumero("");
    await onReload();
  }

  async function handleEnsure(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(cantidad);
    setLocalPending(true);
    setLocalError(null);
    const result = await onEnsureHasta(n);
    setLocalPending(false);
    if (result.error) {
      setLocalError(result.error);
      return;
    }
    setCantidad("");
    await onReload();
  }

  async function handleDelete(espacio: EspacioConOcupacion) {
    if (
      !confirm(
        espacio.ambiente_nombre
          ? `¿Eliminar "${espacio.nombre}"? Se quitará del ambiente «${espacio.ambiente_nombre}».`
          : `¿Eliminar "${espacio.nombre}"?`,
      )
    ) {
      return;
    }
    setLocalPending(true);
    setLocalError(null);
    const result = await onDelete(espacio.id);
    setLocalPending(false);
    if (result.error) {
      setLocalError(result.error);
      return;
    }
    await onReload();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Espacios — ${sedeNombre}`}
      description="Locales físicos de la sucursal (Espacio 01, Espacio 02…). Los ambientes pueden ocupar uno de forma opcional."
      className="max-w-lg"
    >
      <div className="space-y-4">
        <form onSubmit={handleEnsure} className="flex flex-wrap items-end gap-2">
          <div className="min-w-[8rem] flex-1 space-y-1">
            <Label htmlFor="espacios_cantidad">Cantidad a agregar</Label>
            <Input
              id="espacios_cantidad"
              type="number"
              min={1}
              max={500}
              placeholder="Ej. 5"
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              required
            />
          </div>
          <Button type="submit" size="sm" disabled={busy}>
            Agregar espacios
          </Button>
        </form>

        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-2">
          <div className="min-w-[10rem] flex-1 space-y-1">
            <Label htmlFor="espacio_numero">Nuevo espacio</Label>
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-sm font-medium text-muted-foreground">Espacio</span>
              <Input
                id="espacio_numero"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="01"
                value={numero}
                onChange={(e) => setNumero(e.target.value.replace(/\D/g, "").slice(0, 4))}
                required
                className="max-w-[6rem]"
                aria-label="Número del espacio"
              />
            </div>
          </div>
          <Button type="submit" size="sm" variant="outline" disabled={busy}>
            Agregar
          </Button>
        </form>

        {message && <p className="text-sm text-destructive">{message}</p>}

        {espacios.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay espacios. Indique cuántos crear (empezarán en Espacio 01).
          </p>
        ) : (
          <ul className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border/60 p-2 text-sm">
            {espacios.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between gap-2 rounded px-2 py-1.5 hover:bg-muted/40"
              >
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{e.nombre}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {e.ambiente_nombre
                      ? `Ocupado por: ${e.ambiente_nombre}`
                      : "Libre"}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0 text-destructive"
                  disabled={busy}
                  onClick={() => void handleDelete(e)}
                >
                  Eliminar
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end">
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
