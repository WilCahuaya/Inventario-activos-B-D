import { useEffect, useState } from "react";
import { Button, Dialog, Input, Label } from "@inventario/ui";
import { getSavedPrinterName, setSavedPrinterName } from "../lib/offline";
import { buildBatchLabelZpl } from "../lib/zpl";
import type { PrinterOption } from "./PrintLabelDialog";

export interface BatchLabelItem {
  codigoBarras: string;
  nombreBien: string;
}

interface PrintBatchLabelDialogProps {
  open: boolean;
  onClose: () => void;
  entidadNombre: string;
  items: BatchLabelItem[];
}

function pickInitialPrinter(printers: PrinterOption[], saved: string): string {
  if (saved && printers.some((p) => p.name === saved)) return saved;
  const defaultPrinter = printers.find((p) => p.isDefault);
  if (defaultPrinter) return defaultPrinter.name;
  return printers[0]?.name ?? "";
}

export function PrintBatchLabelDialog({
  open,
  onClose,
  entidadNombre,
  items,
}: PrintBatchLabelDialogProps) {
  const [zpl, setZpl] = useState("");
  const [printers, setPrinters] = useState<PrinterOption[]>([]);
  const [printersLoading, setPrintersLoading] = useState(false);
  const [printerName, setPrinterName] = useState("");
  const [showZpl, setShowZpl] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const sinImpresora = !printersLoading && printers.length === 0;
  const count = items.length;

  async function loadPrinters() {
    setPrintersLoading(true);
    try {
      const list = (await window.electronAPI?.printListPrinters?.()) ?? [];
      const options = list as PrinterOption[];
      setPrinters(options);
      setPrinterName(pickInitialPrinter(options, getSavedPrinterName()));
    } finally {
      setPrintersLoading(false);
    }
  }

  useEffect(() => {
    if (!open || items.length === 0) return;
    setMessage(null);
    setShowZpl(false);
    setZpl(
      buildBatchLabelZpl(
        entidadNombre,
        items.map((item) => ({
          entidadNombre,
          codigoBarras: item.codigoBarras,
          nombreBien: item.nombreBien,
        })),
      ),
    );
    void loadPrinters();
  }, [open, entidadNombre, items]);

  async function handlePrint() {
    if (!zpl) return;
    if (!printerName.trim()) {
      setMessage("Seleccione o escriba el nombre de una impresora.");
      return;
    }
    setPending(true);
    setMessage(null);
    setSavedPrinterName(printerName);
    const result = await window.electronAPI?.printSend?.(zpl, printerName);
    setPending(false);
    setMessage(result?.message ?? "No se pudo imprimir");
    if (result?.ok) onClose();
  }

  async function handleSave() {
    if (!zpl) return;
    if (!window.electronAPI?.printSaveDialog) {
      setMessage("Error: la app no está en modo escritorio (Electron).");
      return;
    }
    setPending(true);
    setMessage(null);
    try {
      const result = await window.electronAPI.printSaveDialog(zpl);
      if (result.saved && result.path) {
        setMessage(`Guardado en ${result.path}`);
      } else if (result.error) {
        setMessage(`Error al guardar: ${result.error}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al guardar el archivo";
      setMessage(`Error al guardar: ${msg}`);
    } finally {
      setPending(false);
    }
  }

  if (items.length === 0) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Imprimir etiquetas por lote"
      description={`${count} etiqueta${count === 1 ? "" : "s"} seleccionada${count === 1 ? "" : "s"}`}
      className="max-w-2xl"
    >
      <div className="space-y-5">
        <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border bg-muted/30 p-3 text-sm">
          {items.map((item) => (
            <li key={item.codigoBarras} className="flex justify-between gap-2">
              <span className="truncate font-medium">{item.nombreBien}</span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {item.codigoBarras}
              </span>
            </li>
          ))}
        </ul>

        {sinImpresora && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
            No se detectaron impresoras. Pulse <strong>Actualizar lista</strong> o escriba el nombre
            exacto de la impresora.
          </p>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="batch_printer_name">Impresora</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              disabled={printersLoading}
              onClick={() => void loadPrinters()}
            >
              {printersLoading ? "Buscando…" : "Actualizar lista"}
            </Button>
          </div>

          {printers.length > 0 ? (
            <select
              id="batch_printer_name"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={printerName}
              onChange={(e) => setPrinterName(e.target.value)}
            >
              {printers.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name}
                  {p.isDefault ? " (predeterminada)" : ""} — {p.status}
                </option>
              ))}
            </select>
          ) : (
            <Input
              id="batch_printer_name"
              value={printerName}
              onChange={(e) => setPrinterName(e.target.value)}
              placeholder="Nombre de impresora en el sistema"
              disabled={printersLoading}
            />
          )}
        </div>

        <div className="space-y-2">
          <button
            type="button"
            className="text-xs font-medium text-primary hover:underline"
            onClick={() => setShowZpl((v) => !v)}
          >
            {showZpl ? "Ocultar código ZPL" : "Ver código ZPL"}
          </button>
          {showZpl && (
            <pre className="max-h-32 overflow-auto rounded-md border bg-muted/40 p-3 text-xs whitespace-pre-wrap">
              {zpl}
            </pre>
          )}
        </div>

        {message && (
          <p
            className={`text-sm ${message.includes("Error") || message.toLowerCase().includes("fall") ? "text-destructive" : "text-primary"}`}
          >
            {message}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void handleSave()}
            disabled={pending || !zpl}
          >
            {pending ? "Guardando…" : "Guardar .zpl"}
          </Button>
          <Button
            type="button"
            onClick={() => void handlePrint()}
            disabled={pending || !zpl || !printerName.trim()}
          >
            {pending ? "Imprimiendo…" : `Imprimir ${count} etiqueta${count === 1 ? "" : "s"}`}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
