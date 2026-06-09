import type { ActivoConUbicacion } from "./activos";

const PRINTER_KEY = "inventario.desktop.printerName";

export function getSavedPrinterName(): string {
  return localStorage.getItem(PRINTER_KEY) ?? "";
}

export function setSavedPrinterName(name: string) {
  if (name) localStorage.setItem(PRINTER_KEY, name);
  else localStorage.removeItem(PRINTER_KEY);
}

export interface QueuedFiles {
  fotoBase64?: string;
  fotoName?: string;
  fotoType?: string;
  comprobanteBase64?: string;
  comprobanteName?: string;
  comprobanteType?: string;
}

export interface QueuedPayload {
  input: Record<string, unknown>;
  files?: QueuedFiles;
  localActivo?: ActivoConUbicacion;
}

export async function enqueueOfflineCreate(
  entidadId: string,
  payload: QueuedPayload,
): Promise<string | null> {
  if (!window.electronAPI?.offlineEnqueue) return null;
  const row = await window.electronAPI.offlineEnqueue({
    operation: "create",
    entidad_id: entidadId,
    payload,
  });
  return (row as { id: string }).id;
}

export async function enqueueOfflineUpdate(
  entidadId: string,
  activoId: string,
  payload: QueuedPayload,
): Promise<string | null> {
  if (!window.electronAPI?.offlineEnqueue) return null;
  const row = await window.electronAPI.offlineEnqueue({
    operation: "update",
    entidad_id: entidadId,
    activo_id: activoId,
    payload,
  });
  return (row as { id: string }).id;
}

export async function getPendingCount(): Promise<number> {
  if (!window.electronAPI?.offlineQueueCount) return 0;
  return window.electronAPI.offlineQueueCount();
}

export async function findCachedActivo(
  entidadId: string,
  codigo: string,
): Promise<ActivoConUbicacion | null> {
  if (!window.electronAPI?.offlineCacheFind) return null;
  const raw = await window.electronAPI.offlineCacheFind(entidadId, codigo);
  return raw ? (raw as ActivoConUbicacion) : null;
}

export async function upsertCachedActivo(entidadId: string, activo: ActivoConUbicacion) {
  await window.electronAPI?.offlineCacheUpsert?.(entidadId, activo);
}

export async function refreshActivosCache(entidadId: string, activos: ActivoConUbicacion[]) {
  await window.electronAPI?.offlineCacheReplace?.(entidadId, activos);
}

export async function listCachedActivos(entidadId: string): Promise<ActivoConUbicacion[]> {
  if (!window.electronAPI?.offlineCacheList) return [];
  const rows = await window.electronAPI.offlineCacheList(entidadId);
  return rows as ActivoConUbicacion[];
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(",") ? result.split(",")[1]! : result;
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function base64ToFile(base64: string, name: string, type: string): File {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], name, { type });
}
