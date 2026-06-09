"use client";

import { useEffect, useState } from "react";
import { Button, Dialog, Input, Label } from "@inventario/ui";

interface ComprobanteSerieDialogProps {
  open: boolean;
  fileName?: string;
  initialSerie?: string;
  onConfirm: (serie: string) => void;
  onCancel: () => void;
}

export function ComprobanteSerieDialog({
  open,
  fileName,
  initialSerie = "",
  onConfirm,
  onCancel,
}: ComprobanteSerieDialogProps) {
  const [serie, setSerie] = useState(initialSerie);

  useEffect(() => {
    if (open) setSerie(initialSerie);
  }, [open, initialSerie]);

  function handleConfirm() {
    const trimmed = serie.trim();
    if (!trimmed) return;
    onConfirm(trimmed);
  }

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title="Serie del comprobante"
      description={
        fileName
          ? `Indique la serie o número del comprobante para el archivo «${fileName}».`
          : "Indique la serie o número del comprobante."
      }
      className="max-w-md"
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="comprobante_serie_dialog">Serie del comprobante</Label>
          <Input
            id="comprobante_serie_dialog"
            value={serie}
            onChange={(e) => setSerie(e.target.value)}
            placeholder="Ej. F/E001-129"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleConfirm();
              }
            }}
          />
          <p className="text-xs text-muted-foreground">
            Este texto se mostrará en la columna Comprobante. Puede guardarlo sin adjuntar PDF.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!serie.trim()}>
            Confirmar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
