import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";

let mainWindow: BrowserWindow | null = null;

function getDistPath(): string {
  return path.join(__dirname, "../dist");
}

function isAuthCallbackUrl(targetUrl: string): boolean {
  return targetUrl.includes("/auth/callback");
}

function createWindow(): void {
  const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: "Inventario Activos B&D",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(getDistPath(), "index.html"));
  }
}

ipcMain.handle("auth:google", async (_event, oauthUrl: string) => {
  return new Promise<string>((resolve, reject) => {
    const authWindow = new BrowserWindow({
      width: 520,
      height: 720,
      show: true,
      title: "Iniciar sesión con Google",
      autoHideMenuBar: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    let settled = false;

    const finish = (callbackUrl: string) => {
      if (settled) return;
      settled = true;
      mainWindow?.webContents.send("auth-callback", callbackUrl);
      if (!authWindow.isDestroyed()) authWindow.close();
      resolve(callbackUrl);
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      if (!authWindow.isDestroyed()) authWindow.close();
      reject(new Error(message));
    };

    authWindow.on("closed", () => {
      if (!settled) fail("Ventana de autenticación cerrada");
    });

    authWindow.webContents.on("will-redirect", (_event, targetUrl) => {
      if (isAuthCallbackUrl(targetUrl)) finish(targetUrl);
    });

    authWindow.webContents.on("did-navigate", (_event, targetUrl) => {
      if (isAuthCallbackUrl(targetUrl)) finish(targetUrl);
    });

    authWindow.webContents.on("will-navigate", (_event, targetUrl) => {
      if (isAuthCallbackUrl(targetUrl)) finish(targetUrl);
    });

    authWindow.loadURL(oauthUrl).catch((error: Error) => fail(error.message));
  });
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
