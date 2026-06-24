import { contextBridge, ipcRenderer } from "electron";
import {
  DESKTOP_OAUTH_REDIRECT_URL,
  OAUTH_CALLBACK_PATH,
} from "../shared/auth/constants";

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  authCallbackPath: OAUTH_CALLBACK_PATH,
  authCallbackUrl: DESKTOP_OAUTH_REDIRECT_URL,
  beginGoogleAuth: () => ipcRenderer.invoke("auth:begin"),
  cancelGoogleAuth: () => ipcRenderer.invoke("auth:cancel"),
  getAuthDiagnostics: () =>
    ipcRenderer.invoke("auth:diagnostics") as Promise<{
      ok: boolean;
      callbackUrl: string;
      callbackPort: number;
      platform: string;
      error?: string;
    }>,
  openGoogleAuth: (url: string) => ipcRenderer.invoke("auth:google", url),
  syncCatalog: (rows: unknown[]) => ipcRenderer.invoke("catalog:replace", rows),
  searchCatalogLocal: (query: string, limit?: number) =>
    ipcRenderer.invoke("catalog:search", query, limit),
  getCatalogByCodigo: (codigo: string) => ipcRenderer.invoke("catalog:getByCodigo", codigo),
  getCatalogMeta: () => ipcRenderer.invoke("catalog:meta"),
  upsertCatalogRow: (row: unknown) => ipcRenderer.invoke("catalog:upsert", row),
  deleteCatalogRow: (codigo: string) => ipcRenderer.invoke("catalog:delete", codigo),
  listCatalogoPropioLocal: () => ipcRenderer.invoke("catalog:listPropio"),
  syncAtributoVocab: (rows: unknown[]) => ipcRenderer.invoke("atributoVocab:replace", rows),
  searchAtributoVocabLocal: (campo: string, query: string, limit?: number) =>
    ipcRenderer.invoke("atributoVocab:search", campo, query, limit),
  upsertAtributoVocabLocal: (campo: string, valor: string) =>
    ipcRenderer.invoke("atributoVocab:upsert", campo, valor),
  getAtributoVocabMeta: () => ipcRenderer.invoke("atributoVocab:meta"),
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
    fechaAdquisicion?: string | null;
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
    mode?: "invite" | "resend";
  }) =>
    ipcRenderer.invoke("invite:entidadAdmin", input) as Promise<{
      success?: boolean;
      invited?: boolean;
      resent?: boolean;
      message?: string;
      warning?: string;
      error?: string;
    }>,
  inviteContador: (input: { email: string; nombre: string; mode?: "invite" | "resend" }) =>
    ipcRenderer.invoke("invite:contador", input) as Promise<{
      success?: boolean;
      invited?: boolean;
      resent?: boolean;
      message?: string;
      warning?: string;
      error?: string;
    }>,
  resendInvitacionUsuario: (input: {
    email: string;
    nombre: string;
    rol: "CONTADOR" | "ADMIN_ENTIDAD";
    entidadId?: string | null;
    entidadNombre?: string | null;
  }) =>
    ipcRenderer.invoke("users:resendInvitation", input) as Promise<{
      success?: boolean;
      invited?: boolean;
      resent?: boolean;
      message?: string;
      warning?: string;
      error?: string;
    }>,
  getUsuariosAccesoEstado: (emails: string[]) =>
    ipcRenderer.invoke("users:accesoEstado", emails) as Promise<
      Record<string, "confirmado" | "pendiente" | "sin_cuenta" | "desconocido">
    >,
  deleteAuthUser: (userId: string) =>
    ipcRenderer.invoke("users:deleteAuth", userId) as Promise<{ error?: string }>,
});
