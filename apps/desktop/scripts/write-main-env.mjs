import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.join(__dirname, "..");
const monorepoRoot = path.join(desktopRoot, "../..");

function parseEnvLine(line) {
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

function parseEnvFile(filePath) {
  const result = {};
  if (!fs.existsSync(filePath)) return result;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (parsed) result[parsed.key] = parsed.value;
  }
  return result;
}

const merged = {
  ...parseEnvFile(path.join(monorepoRoot, ".env")),
  ...parseEnvFile(path.join(monorepoRoot, ".env.local")),
  ...parseEnvFile(path.join(desktopRoot, ".env")),
  ...parseEnvFile(path.join(desktopRoot, ".env.local")),
};

const siteOrigin = (
  merged.NEXT_PUBLIC_SITE_URL ??
  merged.VITE_SITE_URL ??
  merged.SITE_URL ??
  ""
).replace(/\/$/, "");

const payload = {
  supabaseUrl: merged.SUPABASE_URL ?? merged.VITE_SUPABASE_URL ?? null,
  serviceRoleKey: merged.SUPABASE_SERVICE_ROLE_KEY ?? null,
  siteOrigin: siteOrigin || null,
};

const outPath = path.join(desktopRoot, "electron/main-env.json");
const payloadText = `${JSON.stringify(payload, null, 2)}\n`;
fs.writeFileSync(outPath, payloadText, "utf8");

const distPath = path.join(desktopRoot, "dist-electron/electron/main-env.json");
if (fs.existsSync(path.dirname(distPath))) {
  fs.writeFileSync(distPath, payloadText, "utf8");
}

console.log("[desktop] main-env.json generado para el proceso Electron.");
