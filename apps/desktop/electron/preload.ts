import { contextBridge, ipcRenderer } from "electron";

const AUTH_CALLBACK_PATH = "/auth/callback";

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  authCallbackPath: AUTH_CALLBACK_PATH,
  openGoogleAuth: (url: string) => ipcRenderer.invoke("auth:google", url),
  onAuthCallback: (callback: (url: string) => void) => {
    const listener = (_event: unknown, url: string) => callback(url);
    ipcRenderer.on("auth-callback", listener);
    return () => ipcRenderer.removeListener("auth-callback", listener);
  },
  syncCatalog: (rows: unknown[]) => ipcRenderer.invoke("catalog:replace", rows),
  searchCatalogLocal: (query: string, limit?: number) =>
    ipcRenderer.invoke("catalog:search", query, limit),
  getCatalogByCodigo: (codigo: string) => ipcRenderer.invoke("catalog:getByCodigo", codigo),
  getCatalogMeta: () => ipcRenderer.invoke("catalog:meta"),
  offlineEnqueue: (item: unknown) => ipcRenderer.invoke("offline:enqueue", item),
  offlineQueue: () => ipcRenderer.invoke("offline:queue"),
  offlineQueueCount: () => ipcRenderer.invoke("offline:queueCount") as Promise<number>,
  offlineRemove: (id: string) => ipcRenderer.invoke("offline:remove", id),
  offlineSetError: (id: string, error: string) =>
    ipcRenderer.invoke("offline:setError", id, error),
  offlineCacheReplace: (entidadId: string, items: unknown[]) =>
    ipcRenderer.invoke("offline:cacheReplace", entidadId, items),
  offlineCacheFind: (entidadId: string, codigo: string) =>
    ipcRenderer.invoke("offline:cacheFind", entidadId, codigo),
  offlineCacheUpsert: (entidadId: string, activo: unknown) =>
    ipcRenderer.invoke("offline:cacheUpsert", entidadId, activo),
  offlineCacheMeta: (entidadId: string) =>
    ipcRenderer.invoke("offline:cacheMeta", entidadId) as Promise<{
      count: number;
      updatedAt: string | null;
    }>,
  offlineCacheList: (entidadId: string) =>
    ipcRenderer.invoke("offline:cacheList", entidadId) as Promise<unknown[]>,
  printBuildZpl: (options: {
    entidadNombre: string;
    codigoBarras: string;
    nombreBien: string;
  }) => ipcRenderer.invoke("print:buildZpl", options) as Promise<string>,
  printSaveDialog: (zpl: string) =>
    ipcRenderer.invoke("print:saveDialog", zpl) as Promise<{
      saved: boolean;
      path?: string;
      error?: string;
    }>,
  printSend: (zpl: string, printerName?: string) =>
    ipcRenderer.invoke("print:send", zpl, printerName) as Promise<{ ok: boolean; message: string }>,
  printListPrinters: () =>
    ipcRenderer.invoke("print:listPrinters") as Promise<
      Array<{ name: string; status: string; isDefault: boolean }>
    >,
  inviteEntidadAdmin: (input: {
    entidadId: string;
    email: string;
    nombre: string;
    entidadNombre?: string;
  }) =>
    ipcRenderer.invoke("invite:entidadAdmin", input) as Promise<{
      success?: boolean;
      invited?: boolean;
      message?: string;
      warning?: string;
      error?: string;
    }>,
});
