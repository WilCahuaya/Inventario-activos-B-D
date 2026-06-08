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
  };
}
