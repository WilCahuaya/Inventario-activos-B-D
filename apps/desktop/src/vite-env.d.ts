/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  electronAPI?: {
    platform: string;
    authCallbackPath: string;
    openGoogleAuth: (url: string) => Promise<string>;
    onAuthCallback: (callback: (url: string) => void) => () => void;
    syncCatalog: (
      rows: unknown[],
    ) => Promise<{ count: number; syncedAt: string | null }>;
    searchCatalogLocal: (
      query: string,
      limit?: number,
    ) => Promise<
      Array<{
        codigo: string;
        denominacion: string;
        grupo: string | null;
        clase: string | null;
        cuenta_codigo?: string | null;
        contabilidad?: string | null;
        depreciacion?: string | null;
        resolucion?: string | null;
        estado?: string | null;
      }>
    >;
    getCatalogByCodigo: (codigo: string) => Promise<{
      codigo: string;
      denominacion: string;
      grupo: string | null;
      clase: string | null;
      cuenta_codigo: string | null;
      contabilidad: string | null;
      depreciacion: string | null;
      resolucion: string | null;
      estado: string | null;
    } | null>;
    getCatalogMeta: () => Promise<{ count: number; syncedAt: string | null }>;
    syncAtributoVocab: (
      rows: unknown[],
    ) => Promise<{ count: number; syncedAt: string | null }>;
    searchAtributoVocabLocal: (
      campo: string,
      query: string,
      limit?: number,
    ) => Promise<string[]>;
    upsertAtributoVocabLocal: (campo: string, valor: string) => Promise<void>;
    getAtributoVocabMeta: () => Promise<{ count: number; syncedAt: string | null }>;
    offlineEnqueue: (item: unknown) => Promise<unknown>;
    offlineQueue: () => Promise<unknown[]>;
    offlineQueueCount: () => Promise<number>;
    offlineRemove: (id: string) => Promise<void>;
    offlineSetError: (id: string, error: string) => Promise<void>;
    offlineCacheReplace: (entidadId: string, items: unknown[]) => Promise<number>;
    offlineCacheFind: (entidadId: string, codigo: string) => Promise<unknown | null>;
    offlineCacheUpsert: (entidadId: string, activo: unknown) => Promise<void>;
    offlineCacheMeta: (entidadId: string) => Promise<{ count: number; updatedAt: string | null }>;
    offlineCacheList: (entidadId: string) => Promise<unknown[]>;
    printBuildZpl: (options: {
      entidadNombre: string;
      codigoBarras: string;
      nombreBien: string;
    }) => Promise<string>;
    printSaveDialog: (zpl: string) => Promise<{ saved: boolean; path?: string; error?: string }>;
    printSend: (zpl: string, printerName?: string) => Promise<{ ok: boolean; message: string }>;
    printListPrinters: () => Promise<
      Array<{ name: string; status: string; isDefault: boolean }>
    >;
    inviteEntidadAdmin: (input: {
      entidadId: string;
      email: string;
      nombre: string;
      entidadNombre?: string;
    }) => Promise<{
      success?: boolean;
      invited?: boolean;
      message?: string;
      warning?: string;
      error?: string;
    }>;
  };
}
