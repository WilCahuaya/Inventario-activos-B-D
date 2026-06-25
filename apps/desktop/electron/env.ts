import fs from "fs";
import path from "path";
import { app } from "electron";

interface MainEnvConfig {
  supabaseUrl?: string | null;
  serviceRoleKey?: string | null;
  siteOrigin?: string | null;
}

let embeddedConfig: MainEnvConfig | null | undefined;

function parseEnvLine(line: string): { key: string; value: string } | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const eq = trimmed.indexOf("=");
  if (eq <= 0) return null;
  const key = trimmed.slice(0, eq).trim();
  let value = trimmed.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

function loadEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed || process.env[parsed.key] !== undefined) continue;
    process.env[parsed.key] = parsed.value;
  }
}

function collectEnvFileCandidates(): string[] {
  const roots = new Set<string>();
  const names = [".env.local", ".env"];

  let dir = process.cwd();
  for (let depth = 0; depth < 5; depth += 1) {
    roots.add(dir);
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  try {
    roots.add(app.getAppPath().replace(/app\.asar$/, ""));
    roots.add(path.dirname(app.getPath("exe")));
  } catch {
    // app no listo aún
  }

  const candidates: string[] = [];
  for (const root of roots) {
    for (const name of names) {
      candidates.push(path.join(root, name));
    }
  }

  return [...new Set(candidates)];
}

function loadEmbeddedConfig(): MainEnvConfig {
  if (embeddedConfig !== undefined) return embeddedConfig ?? {};

  embeddedConfig = {};
  try {
    const configPath = path.join(__dirname, "main-env.json");
    if (fs.existsSync(configPath)) {
      embeddedConfig = JSON.parse(fs.readFileSync(configPath, "utf8")) as MainEnvConfig;
    }
  } catch {
    embeddedConfig = {};
  }

  return embeddedConfig ?? {};
}

/** Carga variables del monorepo y embebidas en build para el proceso principal. */
export function loadDesktopEnvFiles(): void {
  for (const filePath of collectEnvFileCandidates()) {
    loadEnvFile(filePath);
  }

  const embedded = loadEmbeddedConfig();
  if (!process.env.SUPABASE_URL && embedded.supabaseUrl) {
    process.env.SUPABASE_URL = embedded.supabaseUrl;
  }
  if (!process.env.VITE_SUPABASE_URL && embedded.supabaseUrl) {
    process.env.VITE_SUPABASE_URL = embedded.supabaseUrl;
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && embedded.serviceRoleKey) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = embedded.serviceRoleKey;
  }
  if (!process.env.NEXT_PUBLIC_SITE_URL && embedded.siteOrigin) {
    process.env.NEXT_PUBLIC_SITE_URL = embedded.siteOrigin;
  }
  if (!process.env.VITE_SITE_URL && embedded.siteOrigin) {
    process.env.VITE_SITE_URL = embedded.siteOrigin;
  }
}

export function getSupabaseUrl(): string | null {
  const embedded = loadEmbeddedConfig();
  return (
    process.env.SUPABASE_URL ??
    process.env.VITE_SUPABASE_URL ??
    embedded.supabaseUrl ??
    null
  );
}

export function getServiceRoleKey(): string | null {
  const embedded = loadEmbeddedConfig();
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? embedded.serviceRoleKey ?? null;
}

export function getSiteOrigin(): string {
  const embedded = loadEmbeddedConfig();
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VITE_SITE_URL ??
    process.env.SITE_URL ??
    embedded.siteOrigin;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://localhost:3000";
}

export function hasInviteCapabilities(): boolean {
  return Boolean(getSupabaseUrl() && getServiceRoleKey());
}
