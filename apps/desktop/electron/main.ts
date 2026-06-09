import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { loadDesktopEnvFiles } from "./env";
import { inviteEntidadAdmin } from "./invite";
import {
  getCatalogByCodigo,
  getCatalogMeta,
  initCatalogDatabase,
  replaceCatalog,
  searchCatalog,
  type CatalogoRow,
} from "./database/catalogo";
import {
  cacheMeta,
  enqueueSyncItem,
  findCachedActivo,
  listCachedActivos,
  listSyncQueue,
  removeSyncItem,
  replaceActivosCache,
  setSyncItemError,
  syncQueueCount,
  upsertCachedActivo,
} from "./database/offline";
import { buildLabelZpl, listSystemPrinters, saveZplDialog, sendZplToPrinter } from "./print";

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

ipcMain.handle("catalog:replace", (_event, rows: CatalogoRow[]) => {
  return replaceCatalog(rows);
});

ipcMain.handle("catalog:search", (_event, query: string, limit?: number) => {
  return searchCatalog(query, limit);
});

ipcMain.handle("catalog:getByCodigo", (_event, codigo: string) => {
  return getCatalogByCodigo(codigo);
});

ipcMain.handle("catalog:meta", () => {
  return getCatalogMeta();
});

ipcMain.handle("offline:enqueue", (_event, item) => enqueueSyncItem(item));
ipcMain.handle("offline:queue", () => listSyncQueue());
ipcMain.handle("offline:queueCount", () => syncQueueCount());
ipcMain.handle("offline:remove", (_event, id: string) => removeSyncItem(id));
ipcMain.handle("offline:setError", (_event, id: string, error: string) => setSyncItemError(id, error));
ipcMain.handle("offline:cacheReplace", (_event, entidadId: string, items: unknown[]) =>
  replaceActivosCache(entidadId, items),
);
ipcMain.handle("offline:cacheFind", (_event, entidadId: string, codigo: string) =>
  findCachedActivo(entidadId, codigo),
);
ipcMain.handle("offline:cacheUpsert", (_event, entidadId: string, activo: unknown) =>
  upsertCachedActivo(entidadId, activo),
);
ipcMain.handle("offline:cacheMeta", (_event, entidadId: string) => cacheMeta(entidadId));
ipcMain.handle("offline:cacheList", (_event, entidadId: string) => listCachedActivos(entidadId));

ipcMain.handle("print:buildZpl", (_event, options) => buildLabelZpl(options));
ipcMain.handle("print:saveDialog", (event, zpl: string) => {
  const parent = BrowserWindow.fromWebContents(event.sender) ?? mainWindow;
  return saveZplDialog(zpl, parent);
});
ipcMain.handle("print:send", (_event, zpl: string, printerName?: string) =>
  sendZplToPrinter(zpl, printerName),
);
ipcMain.handle("print:listPrinters", () => listSystemPrinters());

ipcMain.handle("invite:entidadAdmin", (_event, input) => inviteEntidadAdmin(input));

app.whenReady().then(() => {
  loadDesktopEnvFiles();
  initCatalogDatabase();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
