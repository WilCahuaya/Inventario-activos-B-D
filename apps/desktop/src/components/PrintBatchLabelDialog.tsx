import { useEffect, useState } from "react";
import { Button, Dialog } from "@inventario/ui";
import { getSavedPrinterName, setSavedPrinterName } from "../lib/offline";
import type { LabelZplInput } from "../lib/label-print";
import { buildBatchLabelZpl, LABELS_PER_ROW } from "../lib/zpl";
import { PrinterSelector, type PrinterOption } from "./PrinterSelector";

interface PrintBatchLabelDialogProps {
  open: boolean;
  onClose: () => void;
  labels: LabelZplInput[];
}

function pickInitialPrinter(printers: PrinterOption[], saved: string): string {
  if (saved && printers.some((p) => p.name === saved)) return saved;
  const defaultPrinter = printers.find((p) => p.isDefault);
  if (defaultPrinter) return defaultPrinter.name;
  return printers[0]?.name ?? "";
}

export function PrintBatchLabelDialog({ open, onClose, labels }: PrintBatchLabelDialogProps) {
  const [selectedLabels, setSelectedLabels] = useState<LabelZplInput[]>(labels);
  const [zpl, setZpl] = useState("");
  const [printers, setPrinters] = useState<PrinterOption[]>([]);
  const [printersLoading, setPrintersLoading] = useState(false);
  const [printerName, setPrinterName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const count = selectedLabels.length;
  const rowCount = Math.ceil(count / LABELS_PER_ROW);
  const entidadNombre = selectedLabels[0]?.entidadNombre ?? "Entidad";

  async function loadPrinters() {
    if (!window.electronAPI?.printListPrinters) {
      setPrinters([]);
      setPrinterName("");
      setMessage("La detección de impresoras solo funciona en la app de escritorio.");
      return;
    }

    setPrintersLoading(true);
    setMessage(null);
    try {
      const list = await window.electronAPI.printListPrinters();
      const options = list as PrinterOption[];
      setPrinters(options);
      setPrinterName(pickInitialPrinter(options, getSavedPrinterName()));
      if (options.length === 0) {
        setMessage(
          "No se encontraron impresoras. Verifique que estén instaladas en Windows y pulse Actualizar lista.",
        );
      }
    } catch (err) {
      setPrinters([]);
      setPrinterName("");
      const msg = err instanceof Error ? err.message : "Error al detectar impresoras";
      setMessage(msg);
    } finally {
      setPrintersLoading(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    setSelectedLabels(labels);
    setMessage(null);
    void loadPrinters();
  }, [open, labels]);

  useEffect(() => {
    if (!open || selectedLabels.length === 0) return;
    setZpl(buildBatchLabelZpl(entidadNombre, selectedLabels));
  }, [open, selectedLabels, entidadNombre]);

  function removeLabel(codigoBarras: string) {
    setSelectedLabels((prev) => {
      const next = prev.filter((label) => label.codigoBarras !== codigoBarras);
      if (next.length === 0) {
        queueMicrotask(() => onClose());
      }
      return next;
    });
  }

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

  if (!open || labels.length === 0) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Imprimir etiquetas por lote"
      description={`${count} etiqueta${count === 1 ? "" : "s"} · ${rowCount} fila${rowCount === 1 ? "" : "s"} (2 columnas de 50×25 mm)`}
      className="max-w-md sm:max-w-xl"
    >
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Etiquetas en el lote</p>
            <ul className="max-h-36 space-y-1 overflow-y-auto rounded-md border bg-muted/30 p-2 text-sm">
              {selectedLabels.map((label) => (
                <li
                  key={label.codigoBarras}
                  className="flex items-center gap-1.5 rounded px-1 py-0.5 hover:bg-muted/50"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{label.nombreBien}</span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                    {label.codigoBarras}
                  </span>
                  <button
                    type="button"
                    className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Quitar ${label.nombreBien}`}
                    title="Quitar del lote"
                    disabled={pending}
                    onClick={() => removeLabel(label.codigoBarras)}
                  >
                    <span className="text-base leading-none">×</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-w-0 w-full flex-1 space-y-3 sm:max-w-[16rem]">
            <PrinterSelector
              id="batch_printer_name"
              printers={printers}
              printersLoading={printersLoading}
              printerName={printerName}
              onPrinterNameChange={setPrinterName}
              onRefresh={() => void loadPrinters()}
            />
          </div>
        </div>

        {message && (
          <p
            className={`text-sm ${message.includes("Error") || message.toLowerCase().includes("fall") ? "text-destructive" : "text-primary"}`}
          >
            {message}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-border/40 pt-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => void handleSave()}
            disabled={pending || !zpl}
          >
            {pending ? "Guardando…" : "Guardar .zpl"}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => void handlePrint()}
            disabled={pending || !zpl || !printerName.trim()}
          >
            {pending
              ? "Imprimiendo…"
              : `Imprimir ${count} etiqueta${count === 1 ? "" : "s"} (${rowCount} fila${rowCount === 1 ? "" : "s"})`}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
