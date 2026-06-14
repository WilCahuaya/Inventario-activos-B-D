import { execFile } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const RAW_PRINTER_HELPER = `
using System;
using System.Runtime.InteropServices;
public class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public class DOCINFO {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool OpenPrinter(string pPrinterName, out IntPtr hPrinter, IntPtr pDefault);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int Level, [In] DOCINFO di);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool WritePrinter(IntPtr hPrinter, byte[] pBytes, int dwCount, out int dwWritten);
  public static string Send(string printerName, byte[] bytes) {
    IntPtr hPrinter = IntPtr.Zero;
    if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) {
      throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "OpenPrinter");
    }
    try {
      var di = new DOCINFO();
      di.pDocName = "Inventario ZPL";
      di.pDataType = "RAW";
      if (!StartDocPrinter(hPrinter, 1, di)) {
        throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "StartDocPrinter");
      }
      try {
        if (!StartPagePrinter(hPrinter)) {
          throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "StartPagePrinter");
        }
        try {
          int written;
          if (!WritePrinter(hPrinter, bytes, bytes.Length, out written) || written != bytes.Length) {
            throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(), "WritePrinter");
          }
        } finally {
          EndPagePrinter(hPrinter);
        }
      } finally {
        EndDocPrinter(hPrinter);
      }
    } finally {
      ClosePrinter(hPrinter);
    }
    return "OK";
  }
}
`;

export async function sendRawZplToWindowsPrinter(
  zpl: string,
  printerName: string,
): Promise<{ ok: boolean; message: string }> {
  const trimmedName = printerName.trim();
  if (!trimmedName) {
    return { ok: false, message: "Indique el nombre de la impresora Honeywell." };
  }

  const tmpFile = path.join(os.tmpdir(), `inventario-label-${Date.now()}.zpl`);
  const tmpScript = path.join(os.tmpdir(), `inventario-raw-print-${Date.now()}.ps1`);

  fs.writeFileSync(tmpFile, zpl, { encoding: "utf8" });

  const ps = `
$ErrorActionPreference = "Stop"
$printer = @'
${trimmedName.replace(/'/g, "''")}
'@
$file = @'
${tmpFile.replace(/'/g, "''")}
'@
$helper = @'
${RAW_PRINTER_HELPER}
'@
Add-Type -TypeDefinition $helper
$bytes = [System.IO.File]::ReadAllBytes($file)
[RawPrinterHelper]::Send($printer, $bytes) | Out-Null
Write-Output "OK"
`;

  fs.writeFileSync(tmpScript, ps, "utf8");

  try {
    const { stdout } = await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", tmpScript],
      { timeout: 30000, encoding: "utf8" },
    );

    if (!stdout.includes("OK")) {
      return { ok: false, message: "La impresora no confirmó la recepción del ZPL." };
    }

    return {
      ok: true,
      message: `ZPL enviado en modo RAW a «${trimmedName}».`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error al imprimir";
    return {
      ok: false,
      message: `No se pudo imprimir en modo RAW: ${msg}. Verifique el nombre exacto de la impresora en Windows.`,
    };
  } finally {
    for (const file of [tmpFile, tmpScript]) {
      try {
        fs.unlinkSync(file);
      } catch {
        /* ignore */
      }
    }
  }
}
