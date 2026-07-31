"use client";

import { useEffect, useMemo, useState } from "react";
import { formatMonedaPE, valorActivoEfectivo } from "@inventario/types";
import { Button, Dialog, Input, Label } from "./components";
import { ConfirmDialog } from "./confirm-dialog";

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function formatMontoInput(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2)));
}

export interface IncrementoMejoraValue {
  detalle: string;
  incremento: string;
}

export interface IncrementoMejoraFieldProps {
  detalle: string;
  incremento: string;
  /** Monto base (sin incremento). */
  valorBase: string;
  onValorBaseChange: (value: string) => void;
  onChange: (next: IncrementoMejoraValue) => void;
  /** Etiqueta del precio (ej. Precio de adquisición / Valor de mercado). */
  valorLabel: string;
  valorId: string;
  idPrefix?: string;
}

export function IncrementoMejoraField({
  detalle,
  incremento,
  valorBase,
  onValorBaseChange,
  onChange,
  valorLabel,
  valorId,
  idPrefix = "incremento",
}: IncrementoMejoraFieldProps) {
  const tieneIncremento =
    Boolean(detalle.trim()) || (incremento.trim() !== "" && Number(incremento) > 0);

  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [draftValorBase, setDraftValorBase] = useState(valorBase);
  const [draftDetalle, setDraftDetalle] = useState(detalle);
  const [draftIncremento, setDraftIncremento] = useState(incremento);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!modalOpen) return;
    setDraftValorBase(valorBase);
    setDraftDetalle(detalle);
    setDraftIncremento(incremento);
    setError(null);
  }, [modalOpen, valorBase, detalle, incremento]);

  const incrementoNum = useMemo(() => {
    if (!tieneIncremento || !incremento.trim()) return 0;
    const n = Number(incremento);
    return Number.isNaN(n) ? 0 : n;
  }, [tieneIncremento, incremento]);

  /** Precio de adquisición = valor base + incremento (o solo el base). */
  const precioDisplay = useMemo(() => {
    const efectivo = valorActivoEfectivo(
      valorBase.trim() ? Number(valorBase) : null,
      tieneIncremento ? incrementoNum : null,
    );
    if (efectivo == null) return "";
    return formatMontoInput(efectivo);
  }, [valorBase, tieneIncremento, incrementoNum]);

  const draftTotal = useMemo(() => {
    const base = draftValorBase.trim() ? Number(draftValorBase) : null;
    const inc = draftIncremento.trim() ? Number(draftIncremento) : null;
    if (base == null && (inc == null || Number.isNaN(inc))) return null;
    if (base != null && Number.isNaN(base)) return null;
    if (inc != null && Number.isNaN(inc)) return null;
    return (base ?? 0) + (inc ?? 0);
  }, [draftValorBase, draftIncremento]);

  function openModal() {
    setDraftValorBase(valorBase);
    setDraftDetalle(detalle);
    setDraftIncremento(incremento);
    setError(null);
    setModalOpen(true);
  }

  function handleSave() {
    const baseRaw = draftValorBase.trim();
    const det = draftDetalle.trim();
    const incRaw = draftIncremento.trim();

    if (!baseRaw) {
      setError("Indique el valor base (sin mejora).");
      return;
    }
    const baseNum = Number(baseRaw);
    if (Number.isNaN(baseNum) || baseNum < 0) {
      setError("El valor base debe ser un monto válido.");
      return;
    }
    if (!det) {
      setError("Indique el detalle del incremento.");
      return;
    }
    if (!incRaw) {
      setError("Indique el monto del incremento.");
      return;
    }
    const n = Number(incRaw);
    if (Number.isNaN(n) || n < 0) {
      setError("El incremento debe ser un monto válido.");
      return;
    }

    onValorBaseChange(formatMontoInput(baseNum));
    onChange({ detalle: det, incremento: String(n) });
    setModalOpen(false);
  }

  function handleDelete() {
    onChange({ detalle: "", incremento: "" });
    setConfirmDeleteOpen(false);
    setModalOpen(false);
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={valorId}>{valorLabel}</Label>
      <div className="flex items-center gap-1.5">
        <Input
          id={valorId}
          type="number"
          step="0.01"
          min="0"
          value={precioDisplay}
          readOnly={tieneIncremento}
          onChange={(e) => {
            if (!tieneIncremento) onValorBaseChange(e.target.value);
          }}
          className={`min-w-0 flex-1${tieneIncremento ? " bg-muted/40" : ""}`}
          title={
            tieneIncremento
              ? "Con incremento: edite el valor base desde el botón +"
              : undefined
          }
        />
        <button
          type="button"
          onClick={openModal}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
          title={tieneIncremento ? "Editar incremento" : "Agregar incremento"}
          aria-label={tieneIncremento ? "Editar incremento" : "Agregar incremento"}
        >
          <PlusIcon className="h-5 w-5" />
        </button>
      </div>

      <Dialog
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={tieneIncremento ? "Editar incremento" : "Agregar incremento"}
        description="El precio de adquisición será el valor base más el incremento."
        className="max-w-md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}_valor_base`}>Valor base (S/)</Label>
            <Input
              id={`${idPrefix}_valor_base`}
              type="number"
              step="0.01"
              min="0"
              value={draftValorBase}
              onChange={(e) => {
                setDraftValorBase(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Ej. 220"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">Precio sin la mejora o componente.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}_detalle`}>Detalle del incremento</Label>
            <Input
              id={`${idPrefix}_detalle`}
              value={draftDetalle}
              onChange={(e) => {
                setDraftDetalle(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Ej. Memoria RAM 16 GB"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}_monto`}>Incremento (S/)</Label>
            <Input
              id={`${idPrefix}_monto`}
              type="number"
              step="0.01"
              min="0"
              value={draftIncremento}
              onChange={(e) => {
                setDraftIncremento(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Ej. 30"
            />
          </div>
          {draftTotal != null && !Number.isNaN(draftTotal) && (
            <p className="text-sm text-muted-foreground">
              Precio de adquisición:{" "}
              <span className="font-medium text-foreground">
                S/ {formatMonedaPE(draftTotal)}
              </span>
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {tieneIncremento ? (
              <Button
                type="button"
                variant="destructive"
                onClick={() => setConfirmDeleteOpen(true)}
              >
                Eliminar
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={handleSave}>
                Guardar
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        title="Eliminar incremento"
        description="Se quitará la mejora. El precio de adquisición quedará solo con el valor base."
        confirmLabel="Eliminar"
        confirmVariant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  );
}
