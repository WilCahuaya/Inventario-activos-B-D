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
  getCatalogMeta: () => ipcRenderer.invoke("catalog:meta"),
});
