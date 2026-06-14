import { app, BrowserWindow, dialog } from "electron";
import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";
import { buildBatchLabelZpl, buildLabelZpl } from "../shared/print/label-zpl";
import { sendRawZplToWindowsPrinter } from "./print/raw-windows";

const execFileAsync = promisify(execFile);

export { buildBatchLabelZpl, buildLabelZpl };

export interface PrinterInfo {
  name: string;
  status: string;
  isDefault: boolean;
}

export async function saveZplDialog(
  zpl: string,
  parent?: BrowserWindow | null,
): Promise<{ saved: boolean; path?: string; error?: string }> {
  const owner =
    parent ?? BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null;

  if (!owner) {
    return { saved: false, error: "No hay ventana activa para mostrar el diálogo de guardado." };
  }

  const result = await dialog.showSaveDialog(owner, {
    title: "Guardar etiqueta ZPL",
    defaultPath: path.join(app.getPath("documents"), "etiqueta-activo.zpl"),
    filters: [{ name: "ZPL", extensions: ["zpl"] }],
    buttonLabel: "Guardar",
  });

  if (result.canceled || !result.filePath) {
    return { saved: false };
  }

  try {
    fs.writeFileSync(result.filePath, zpl, "utf8");
    return { saved: true, path: result.filePath };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "No se pudo escribir el archivo";
    return { saved: false, error: msg };
  }
}

type WindowsPrinterRow = {
  Name: string;
  PrinterStatus: number;
  IsDefault: boolean;
  WorkOffline?: boolean;
};

function parseWindowsPrinterJson(stdout: string): PrinterInfo[] {
  const trimmed = stdout.trim();
  if (!trimmed) return [];

  try {
    const parsed = JSON.parse(trimmed) as WindowsPrinterRow | WindowsPrinterRow[];
    const rows = Array.isArray(parsed) ? parsed : [parsed];
    return rows
      .filter((row) => row.Name?.trim())
      .map((row) => ({
        name: row.Name.trim(),
        status: row.WorkOffline
          ? "Fuera de línea"
          : windowsPrinterStatusLabel(row.PrinterStatus),
        isDefault: Boolean(row.IsDefault),
      }));
  } catch {
    return [];
  }
}

function electronPrinterStatusLabel(status: number): string {
  const map: Record<number, string> = {
    0: "En espera",
    1: "Imprimiendo",
    2: "Error",
  };
  return map[status] ?? "Disponible";
}

function mergePrinterLists(...lists: PrinterInfo[][]): PrinterInfo[] {
  const byName = new Map<string, PrinterInfo>();

  for (const list of lists) {
    for (const printer of list) {
      const name = printer.name.trim();
      if (!name) continue;

      const existing = byName.get(name);
      if (!existing) {
        byName.set(name, { ...printer, name });
        continue;
      }

      if (printer.isDefault) existing.isDefault = true;
      if (existing.status === "Disponible" && printer.status !== "Disponible") {
        existing.status = printer.status;
      }
    }
  }

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

async function runWindowsPrinterScript(script: string): Promise<PrinterInfo[]> {
  const tmpScript = path.join(os.tmpdir(), `inventario-printers-${Date.now()}.ps1`);
  fs.writeFileSync(tmpScript, script, "utf8");

  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", tmpScript],
      { timeout: 15000, encoding: "utf8" },
    );
    const printers = parseWindowsPrinterJson(stdout);
    if (printers.length > 0) {
      console.info(`[print] ${printers.length} impresora(s) detectada(s) vía PowerShell`);
    }
    return printers;
  } catch (err) {
    console.error("[print] Consulta de impresoras Windows falló:", err);
    return [];
  } finally {
    try {
      fs.unlinkSync(tmpScript);
    } catch {
      /* ignore */
    }
  }
}

async function listElectronPrinters(window: BrowserWindow | null | undefined): Promise<PrinterInfo[]> {
  if (!window || window.isDestroyed()) return [];

  const fromAsync = async (): Promise<PrinterInfo[]> => {
    try {
      const printers = await window.webContents.getPrintersAsync();
      return printers
        .filter((printer) => printer.name?.trim())
        .map((printer) => ({
          name: printer.name.trim(),
          status: electronPrinterStatusLabel(printer.status),
          isDefault: Boolean(printer.isDefault),
        }));
    } catch (err) {
      console.error("[print] getPrintersAsync falló:", err);
      return [];
    }
  };

  const fromSync = (): PrinterInfo[] => {
    try {
      const webContents = window.webContents as typeof window.webContents & {
        getPrinters?: () => Array<{
          name: string;
          status: number;
          isDefault: boolean;
        }>;
      };

      if (typeof webContents.getPrinters !== "function") return [];

      return webContents
        .getPrinters()
        .filter((printer) => printer.name?.trim())
        .map((printer) => ({
          name: printer.name.trim(),
          status: electronPrinterStatusLabel(printer.status),
          isDefault: Boolean(printer.isDefault),
        }));
    } catch (err) {
      console.error("[print] getPrinters falló:", err);
      return [];
    }
  };

  return mergePrinterLists(await fromAsync(), fromSync());
}

async function listWindowsPrintersViaGetPrinter(): Promise<PrinterInfo[]> {
  return runWindowsPrinterScript(`
$default = (Get-CimInstance Win32_Printer -Filter "Default='True'" | Select-Object -ExpandProperty Name -First 1)
$printers = @(Get-Printer -ErrorAction SilentlyContinue)
if ($printers.Count -gt 0) {
  $printers | Select-Object Name, PrinterStatus, @{N='IsDefault';E={$_.Name -eq $default}}, WorkOffline | ConvertTo-Json -Compress
}
`);
}

async function listWindowsPrintersViaWmi(): Promise<PrinterInfo[]> {
  return runWindowsPrinterScript(`
$default = (Get-CimInstance Win32_Printer -Filter "Default='True'" | Select-Object -ExpandProperty Name -First 1)
$rows = @(Get-CimInstance Win32_Printer |
  Select-Object @{N='Name';E={$_.Name}}, @{N='PrinterStatus';E={$_.PrinterStatus}}, @{N='IsDefault';E={$_.Default}}, @{N='WorkOffline';E={$_.WorkOffline}})
if ($rows.Count -gt 0) {
  $rows | ConvertTo-Json -Compress
}
`);
}

async function listWindowsPrintersViaDotNet(): Promise<PrinterInfo[]> {
  return runWindowsPrinterScript(`
Add-Type -AssemblyName System.Drawing
$default = (Get-CimInstance Win32_Printer -Filter "Default='True'" | Select-Object -ExpandProperty Name -First 1)
$offline = @{}
Get-CimInstance Win32_Printer -ErrorAction SilentlyContinue | ForEach-Object { $offline[$_.Name] = $_.WorkOffline }
$names = @([System.Drawing.Printing.PrinterSettings]::InstalledPrinters)
if ($names.Count -eq 0) { return }
$rows = foreach ($name in $names) {
  [PSCustomObject]@{
    Name = [string]$name
    PrinterStatus = 0
    IsDefault = ($name -eq $default)
    WorkOffline = [bool]$offline[[string]$name]
  }
}
$rows | ConvertTo-Json -Compress
`);
}

async function listWindowsPrinters(): Promise<PrinterInfo[]> {
  const [fromGetPrinter, fromWmi, fromDotNet] = await Promise.all([
    listWindowsPrintersViaGetPrinter(),
    listWindowsPrintersViaWmi(),
    listWindowsPrintersViaDotNet(),
  ]);

  return mergePrinterLists(fromGetPrinter, fromWmi, fromDotNet);
}

export async function sendZplToPrinter(
  zpl: string,
  printerName?: string,
): Promise<{ ok: boolean; message: string }> {
  if (process.platform === "win32" && printerName?.trim()) {
    return sendRawZplToWindowsPrinter(zpl, printerName);
  }

  const tmpFile = path.join(os.tmpdir(), `inventario-label-${Date.now()}.zpl`);
  fs.writeFileSync(tmpFile, zpl, "ascii");

  try {
    if (process.platform !== "win32") {
      const args = printerName?.trim()
        ? ["-d", printerName, "-o", "raw", tmpFile]
        : ["-o", "raw", tmpFile];
      await execFileAsync("lp", args, { timeout: 30000 });
      return {
        ok: true,
        message: printerName
          ? `Enviado a «${printerName}» (modo raw).`
          : "Enviado a la impresora predeterminada (modo raw).",
      };
    }

    return {
      ok: false,
      message:
        "En Windows seleccione la impresora Honeywell del listado o guarde el archivo .zpl para probarlo en BarTender.",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al imprimir";
    return { ok: false, message: msg };
  } finally {
    try {
      fs.unlinkSync(tmpFile);
    } catch {
      /* ignore */
    }
  }
}

function windowsPrinterStatusLabel(status: number): string {
  const map: Record<number, string> = {
    0: "Lista",
    1: "Pausada",
    2: "Error",
    3: "Eliminación pendiente",
    4: "Papel atascado",
    5: "Sin papel",
    6: "Tóner bajo",
    7: "Sin tóner",
    8: "Fuera de línea",
  };
  return map[status] ?? `Estado ${status}`;
}

async function listLinuxPrinters(): Promise<PrinterInfo[]> {
  const byName = new Map<string, PrinterInfo>();
  let defaultPrinter = "";

  try {
    const { stdout } = await execFileAsync("lpstat", ["-d"], { timeout: 5000 });
    const match = stdout.match(
      /(?:system default destination|destino predeterminado(?:\s+del sistema)?):\s*(\S+)/i,
    );
    defaultPrinter = match?.[1] ?? "";
  } catch {
    /* sin predeterminada */
  }

  try {
    const { stdout } = await execFileAsync("lpstat", ["-a"], { timeout: 15000 });
    for (const line of stdout.split(/\r?\n/)) {
      const match = line.match(/^(\S+)\s+(?:accepting|aceptando)/i);
      if (!match) continue;
      const name = match[1];
      byName.set(name, {
        name,
        status: "Disponible",
        isDefault: name === defaultPrinter,
      });
    }
  } catch {
    /* lpstat -a no disponible */
  }

  try {
    const { stdout } = await execFileAsync("lpstat", ["-p"], { timeout: 15000 });
    for (const line of stdout.split(/\r?\n/)) {
      const match = line.match(/^(?:printer|impresora)\s+(\S+)\s+(.+)$/i);
      if (!match) continue;
      const name = match[1];
      const rest = match[2].toLowerCase();
      if (rest.includes("disabled") || rest.includes("deshabilitad")) continue;

      let status = "Activa";
      if (rest.includes("idle") || rest.includes("inactiva") || rest.includes("inactivo")) {
        status = "En espera";
      } else if (rest.includes("printing") || rest.includes("imprimiendo")) {
        status = "Imprimiendo";
      } else if (rest.includes("enabled") || rest.includes("habilitad")) {
        status = "Habilitada";
      }

      if (!byName.has(name)) {
        byName.set(name, { name, status, isDefault: name === defaultPrinter });
      }
    }
  } catch {
    /* lpstat -p no disponible */
  }

  return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function listSystemPrinters(
  windows: BrowserWindow[] = [],
): Promise<PrinterInfo[]> {
  try {
    const uniqueWindows = windows.filter((window) => window && !window.isDestroyed());
    const electronLists = await Promise.all(uniqueWindows.map((window) => listElectronPrinters(window)));

    if (process.platform === "win32") {
      const windowsPrinters = await listWindowsPrinters();
      return mergePrinterLists(...electronLists, windowsPrinters);
    }

    const linuxPrinters = await listLinuxPrinters();
    return mergePrinterLists(...electronLists, linuxPrinters);
  } catch (err) {
    console.error("[print] listSystemPrinters falló:", err);
    return [];
  }
}
