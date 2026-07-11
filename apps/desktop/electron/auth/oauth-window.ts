import { BrowserWindow } from "electron";
import { hasOAuthCallbackPayload } from "../../shared/auth/constants";

let oauthWindow: BrowserWindow | null = null;

export function closeOAuthWindow(): void {
  if (!oauthWindow || oauthWindow.isDestroyed()) {
    oauthWindow = null;
    return;
  }
  oauthWindow.close();
  oauthWindow = null;
}

/**
 * Abre Google OAuth en una ventana Electron y captura el callback aunque
 * Supabase redirija al Site URL (p. ej. bdconsultores.org) en lugar de localhost.
 */
export function openOAuthWindow(
  oauthUrl: string,
  onCallback: (callbackUrl: string) => void,
): void {
  closeOAuthWindow();

  const win = new BrowserWindow({
    width: 520,
    height: 740,
    minWidth: 420,
    minHeight: 560,
    title: "Iniciar sesión — Inventario B&D",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  oauthWindow = win;
  let delivered = false;

  const deliver = (callbackUrl: string) => {
    if (delivered) return;
    if (!hasOAuthCallbackPayload(callbackUrl)) return;
    delivered = true;
    console.info("[auth] Callback capturado en ventana OAuth:", callbackUrl.slice(0, 120));
    onCallback(callbackUrl);
    if (!win.isDestroyed()) {
      win.hide();
      win.close();
    }
    oauthWindow = null;
  };

  const inspect = (url: string, event?: Electron.Event) => {
    if (!hasOAuthCallbackPayload(url)) return;
    event?.preventDefault();
    deliver(url);
  };

  win.webContents.on("will-redirect", (event, url) => inspect(url, event));
  win.webContents.on("will-navigate", (event, url) => inspect(url, event));
  win.webContents.on("did-navigate", (_event, url) => inspect(url));
  win.webContents.on("did-navigate-in-page", (_event, url) => inspect(url));
  win.webContents.on("did-fail-load", (_event, _code, _desc, validatedURL) => {
    if (validatedURL) inspect(validatedURL);
  });

  win.on("closed", () => {
    if (oauthWindow === win) oauthWindow = null;
  });

  void win.loadURL(oauthUrl);
}
