import fs from "fs";
import path from "path";
import { app } from "electron";

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

/** Carga .env.local del proyecto desktop en el proceso principal (solo dev/build local). */
export function loadDesktopEnvFiles(): void {
  const candidates = [
    path.join(app.getAppPath(), ".env.local"),
    path.join(app.getAppPath(), ".env"),
    path.join(process.cwd(), "apps/desktop/.env.local"),
    path.join(process.cwd(), ".env.local"),
  ];

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const parsed = parseEnvLine(line);
      if (!parsed || process.env[parsed.key] !== undefined) continue;
      process.env[parsed.key] = parsed.value;
    }
  }
}

export function getSupabaseUrl(): string | null {
  return process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? null;
}

export function getServiceRoleKey(): string | null {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}

export function getSiteOrigin(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.VITE_SITE_URL ??
    process.env.SITE_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "http://localhost:3000";
}
