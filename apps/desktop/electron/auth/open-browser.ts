import { execFile, spawn } from "child_process";
import { shell } from "electron";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function spawnDetached(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("spawn", () => {
      child.unref();
      resolve();
    });
  });
}

/**
 * En Windows, `cmd /c start URL` rompe en `&` (query string) y se pierde redirect_to.
 * Por eso preferimos shell.openExternal / Start-Process con la URL entre comillas.
 */
async function openWindowsBrowser(url: string): Promise<void> {
  try {
    await shell.openExternal(url, { activate: true });
    console.info("[auth] Navegador abierto con shell.openExternal");
    return;
  } catch (error) {
    console.warn("[auth] shell.openExternal falló:", error);
  }

  try {
    const escaped = url.replace(/'/g, "''");
    await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", `Start-Process -FilePath '${escaped}'`],
      { windowsHide: true },
    );
    console.info("[auth] Navegador abierto con PowerShell Start-Process");
    return;
  } catch (error) {
    console.warn("[auth] PowerShell Start-Process falló:", error);
  }

  // Último recurso: un solo argumento tras /c para que `&` no separe comandos.
  const quoted = url.replace(/"/g, "");
  await spawnDetached("cmd.exe", ["/d", "/c", `start "" "${quoted}"`]);
  console.info("[auth] Navegador abierto con cmd start (URL entrecomillada)");
}

export async function openSystemBrowser(url: string): Promise<void> {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error("URL de autenticación inválida");
  }

  if (process.platform === "win32") {
    await openWindowsBrowser(url);
    return;
  }

  await shell.openExternal(url, { activate: true });
  console.info("[auth] Navegador abierto con shell.openExternal");
}
