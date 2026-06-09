import {
  createActivo,
  updateActivo,
  type ActivoConUbicacion,
  type CreateActivoInput,
  type UpdateActivoInput,
} from "./activos";
import {
  base64ToFile,
  type QueuedFiles,
  type QueuedPayload,
  upsertCachedActivo,
} from "./offline";
import { updateActivoPaths, uploadActivoFile } from "./storage";

interface SyncQueueItem {
  id: string;
  operation: "create" | "update";
  entidad_id: string;
  activo_id: string | null;
  payload: string;
  last_error: string | null;
}

async function uploadQueuedFiles(
  entidadId: string,
  activoId: string,
  files?: QueuedFiles,
  comprobanteSerie?: string,
) {
  if (!files) return;

  if (files.comprobanteBase64 && files.comprobanteName && files.comprobanteType) {
    const file = base64ToFile(
      files.comprobanteBase64,
      files.comprobanteName,
      files.comprobanteType,
    );
    const upload = await uploadActivoFile(entidadId, activoId, file, "comprobante");
    if (upload.path) {
      await updateActivoPaths(activoId, {
        comprobante_path: upload.path,
        comprobante_serie: comprobanteSerie?.trim() || null,
      });
    }
  }

  if (files.fotoBase64 && files.fotoName && files.fotoType) {
    const file = base64ToFile(files.fotoBase64, files.fotoName, files.fotoType);
    const upload = await uploadActivoFile(entidadId, activoId, file, "foto");
    if (upload.path) {
      await updateActivoPaths(activoId, { foto_path: upload.path });
    }
  }
}

export async function processSyncQueue(): Promise<{
  processed: number;
  failed: number;
  lastError: string | null;
}> {
  if (!window.electronAPI?.offlineQueue) {
    return { processed: 0, failed: 0, lastError: null };
  }

  const queue = (await window.electronAPI.offlineQueue()) as SyncQueueItem[];
  let processed = 0;
  let failed = 0;
  let lastError: string | null = null;

  for (const item of queue) {
    try {
      const body = JSON.parse(item.payload) as QueuedPayload;

      if (item.operation === "create") {
        const result = await createActivo({
          entidad_id: item.entidad_id,
          ...(body.input as Omit<CreateActivoInput, "entidad_id">),
        });
        if (result.error) throw new Error(result.error);
        const activoId = result.data!.id;
        await uploadQueuedFiles(
          item.entidad_id,
          activoId,
          body.files,
          body.input.comprobante_serie as string | undefined,
        );
        await upsertCachedActivo(item.entidad_id, result.data as ActivoConUbicacion);
      } else {
        const activoId = item.activo_id;
        if (!activoId) throw new Error("Falta activo_id en cola de actualización");
        const result = await updateActivo(activoId, body.input as UpdateActivoInput);
        if (result.error) throw new Error(result.error);
        await uploadQueuedFiles(
          item.entidad_id,
          activoId,
          body.files,
          body.input.comprobante_serie as string | undefined,
        );
        if (result.data) {
          await upsertCachedActivo(item.entidad_id, {
            ...result.data,
            sede_nombre: body.localActivo?.sede_nombre,
            ambiente_nombre: body.localActivo?.ambiente_nombre,
          });
        }
      }

      await window.electronAPI.offlineRemove(item.id);
      processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error de sincronización";
      await window.electronAPI.offlineSetError(item.id, message);
      lastError = message;
      failed++;
    }
  }

  return { processed, failed, lastError };
}
