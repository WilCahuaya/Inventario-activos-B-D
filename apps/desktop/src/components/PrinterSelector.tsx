"use client";

import { Button, Label } from "@inventario/ui";

export interface PrinterOption {
  name: string;
  status: string;
  isDefault: boolean;
}

interface PrinterSelectorProps {
  id: string;
  printers: PrinterOption[];
  printersLoading: boolean;
  printerName: string;
  onPrinterNameChange: (name: string) => void;
  onRefresh: () => void;
}

export function PrinterSelector({
  id,
  printers,
  printersLoading,
  printerName,
  onPrinterNameChange,
  onRefresh,
}: PrinterSelectorProps) {
  const sinImpresora = !printersLoading && printers.length === 0;
  const selectedName =
    printerName && printers.some((printer) => printer.name === printerName) ? printerName : "";

  return (
    <div className="space-y-2">
      {sinImpresora && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
          No se detectaron impresoras en este equipo. Compruebe que la Honeywell aparece en{" "}
          <strong>Configuración → Impresoras y escáneres</strong> de Windows y pulse{" "}
          <strong>Actualizar lista</strong>.
        </p>
      )}

      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id}>Impresora</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 text-xs"
          disabled={printersLoading}
          onClick={onRefresh}
        >
          {printersLoading ? "Buscando…" : "Actualizar lista"}
        </Button>
      </div>

      <select
        id={id}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        value={selectedName}
        onChange={(e) => onPrinterNameChange(e.target.value)}
        disabled={printersLoading || sinImpresora}
      >
        {sinImpresora ? (
          <option value="">No hay impresoras detectadas</option>
        ) : (
          <option value="" disabled>
            Seleccione una impresora…
          </option>
        )}
        {printers.map((printer) => (
          <option key={printer.name} value={printer.name}>
            {printer.name}
            {printer.isDefault ? " (predeterminada)" : ""} — {printer.status}
          </option>
        ))}
      </select>

      {printersLoading && (
        <p className="text-sm text-muted-foreground">Detectando impresoras del equipo…</p>
      )}

      {!printersLoading && printers.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {printers.length} impresora{printers.length === 1 ? "" : "s"} detectada
          {printers.length === 1 ? "" : "s"} en este equipo.
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        Elija la Honeywell del listado; el ZPL se envía en <strong>modo RAW</strong> (como
        BarTender). No use <strong>Ctrl+P</strong>.
      </p>
    </div>
  );
}
