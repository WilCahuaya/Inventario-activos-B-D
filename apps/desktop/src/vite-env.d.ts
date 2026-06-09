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
      }>
    >;
    getCatalogMeta: () => Promise<{ count: number; syncedAt: string | null }>;
  };
}
