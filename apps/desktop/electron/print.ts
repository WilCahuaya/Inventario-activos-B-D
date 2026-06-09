import { app, BrowserWindow, dialog } from "electron";
import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export interface PrinterInfo {
  name: string;
  status: string;
  isDefault: boolean;
}

export function buildLabelZpl(options: {
  entidadNombre: string;
  codigoBarras: string;
  nombreBien: string;
}): string {
  const entidad = options.entidadNombre.slice(0, 28).replace(/\^/g, " ");
  const codigo = options.codigoBarras.replace(/\^/g, "");
  const nombre = options.nombreBien.slice(0, 32).replace(/\^/g, " ");

  return `^XA
^FO20,10^A0N,18,18^FDB&D - ${entidad}^FS
^FO20,32^BY2^BCN,56,Y,N,N^FD${codigo}^FS
^FO20,100^A0N,16,16^FD${nombre}^FS
^XZ
`;
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

export async function sendZplToPrinter(
  zpl: string,
  printerName?: string,
): Promise<{ ok: boolean; message: string }> {
  const tmpFile = path.join(os.tmpdir(), `inventario-label-${Date.now()}.zpl`);
  fs.writeFileSync(tmpFile, zpl, "utf8");

  try {
    if (process.platform === "win32" && printerName?.trim()) {
      const ps = `
$printer = "${printerName.replace(/"/g, '`"')}"
$file = "${tmpFile.replace(/\\/g, "\\\\")}"
Get-Content -Path $file -Raw -Encoding UTF8 | Out-Printer -Name $printer
`;
      await execFileAsync("powershell.exe", ["-NoProfile", "-Command", ps], { timeout: 30000 });
      return { ok: true, message: `Enviado a impresora «${printerName}».` };
    }

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
        "En Windows indique el nombre de la impresora en Ajustes o guarde el archivo .zpl y envíelo desde el driver Honeywell.",
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

export async function listSystemPrinters(): Promise<PrinterInfo[]> {
  try {
    if (process.platform === "win32") {
      const script = `
$default = (Get-CimInstance Win32_Printer -Filter "Default=$true" | Select-Object -ExpandProperty Name)
$printers = Get-Printer | Where-Object { -not $_.WorkOffline } | Select-Object Name, PrinterStatus, @{N='IsDefault';E={$_.Name -eq $default}}
$printers | ConvertTo-Json -Compress
`;
      const { stdout } = await execFileAsync(
        "powershell.exe",
        ["-NoProfile", "-Command", script],
        { timeout: 15000 },
      );
      const trimmed = stdout.trim();
      if (!trimmed) return [];

      const parsed = JSON.parse(trimmed) as
        | { Name: string; PrinterStatus: number; IsDefault: boolean }
        | Array<{ Name: string; PrinterStatus: number; IsDefault: boolean }>;
      const rows = Array.isArray(parsed) ? parsed : [parsed];

      return rows
        .filter((row) => row.Name?.trim())
        .map((row) => ({
          name: row.Name.trim(),
          status: windowsPrinterStatusLabel(row.PrinterStatus),
          isDefault: Boolean(row.IsDefault),
        }));
    }

    return listLinuxPrinters();
  } catch {
    return [];
  }
}
