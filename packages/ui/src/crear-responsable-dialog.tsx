"use client";

import { useRef, useState } from "react";
import type { CreateResponsableInput, Responsable } from "@inventario/types";
import { Button, Dialog } from "./components";
import { ResponsableFormFields, responsableFromForm } from "./responsable-form-fields";

export interface CrearResponsableDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (
    input: CreateResponsableInput,
  ) => Promise<{ data?: Responsable; error?: string }>;
  onCreated?: (responsable: Responsable) => void;
  title?: string;
}

export function CrearResponsableDialog({
  open,
  onClose,
  onCreate,
  onCreated,
  title = "Nuevo responsable",
}: CrearResponsableDialogProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    if (pending) return;
    setError(null);
    onClose();
  }

  async function handleSave() {
    if (!formRef.current) return;
    setPending(true);
    setError(null);
    try {
      const result = await onCreate(responsableFromForm(new FormData(formRef.current)));
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.data) onCreated?.(result.data);
      setError(null);
      onClose();
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} title={title} className="max-w-lg">
      <form
        ref={formRef}
        className="grid gap-3 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
      >
        <div className="sm:col-span-2">
          <ResponsableFormFields idPrefix="crear_resp" />
        </div>
        {error && (
          <p className="text-sm text-destructive sm:col-span-2">{error}</p>
        )}
        <div className="flex justify-end gap-2 sm:col-span-2">
          <Button type="button" variant="outline" onClick={handleClose} disabled={pending}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => void handleSave()} disabled={pending}>
            {pending ? "Guardando…" : "Guardar responsable"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
