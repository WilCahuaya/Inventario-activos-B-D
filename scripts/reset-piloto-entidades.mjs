#!/usr/bin/env node
/**
 * Borra todas las entidades y datos operativos para reiniciar la prueba piloto.
 *
 * Conserva: catálogo nacional SBN, cuentas contables maestras, usuarios CONTADOR.
 * Elimina: activos, historial, sedes, ambientes, visitas, responsables, admins de entidad.
 *
 * Uso:
 *   pnpm reset:piloto -- --confirm
 *   pnpm reset:piloto -- --confirm --storage   (vacía buckets de fotos/comprobantes)
 *
 * Requiere SUPABASE_SERVICE_ROLE_KEY y URL en apps/web/.env.local o variables de entorno.
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const STORAGE_BUCKETS = ["fotos-activos", "comprobantes-activos"];

function loadEnvLocal() {
  const paths = [
    join(ROOT, "apps/web/.env.local"),
    join(ROOT, "apps/desktop/.env.local"),
    join(ROOT, ".env.local"),
  ];
  for (const path of paths) {
    if (!existsSync(path)) continue;
    const content = readFileSync(path, "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function getSupabaseAdmin() {
  loadEnvLocal();
  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Defina SUPABASE_SERVICE_ROLE_KEY y URL (NEXT_PUBLIC_SUPABASE_URL o SUPABASE_URL) en apps/web/.env.local",
    );
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function deleteAllRows(supabase, table, label) {
  const { count, error: countError } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (countError) throw new Error(`${label}: ${countError.message}`);
  if (!count) {
    console.log(`  ${label}: 0 (nada que borrar)`);
    return 0;
  }

  const { error } = await supabase.from(table).delete().gte("created_at", "1970-01-01T00:00:00Z");
  if (error) throw new Error(`${label}: ${error.message}`);
  console.log(`  ${label}: ${count} eliminado(s)`);
  return count;
}

async function deleteAdminUsers(supabase) {
  const { data: admins, error } = await supabase
    .from("profiles")
    .select("id, email, nombre")
    .eq("rol", "ADMIN_ENTIDAD");
  if (error) throw new Error(`Listar admins: ${error.message}`);
  if (!admins?.length) {
    console.log("  Usuarios admin: 0");
    return 0;
  }

  let deleted = 0;
  for (const admin of admins) {
    const { error: delError } = await supabase.auth.admin.deleteUser(admin.id);
    if (delError) {
      throw new Error(`Borrar admin ${admin.email}: ${delError.message}`);
    }
    console.log(`  Admin eliminado: ${admin.nombre} (${admin.email})`);
    deleted += 1;
  }
  return deleted;
}

async function emptyStorageBucket(supabase, bucket) {
  const pathsToVisit = [""];
  let removed = 0;

  while (pathsToVisit.length > 0) {
    const prefix = pathsToVisit.pop();
    const { data: entries, error } = await supabase.storage.from(bucket).list(prefix, {
      limit: 1000,
    });
    if (error) {
      console.warn(`  Storage ${bucket}/${prefix}: ${error.message}`);
      continue;
    }
    if (!entries?.length) continue;

    const files = [];
    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id) {
        files.push(path);
      } else {
        pathsToVisit.push(path);
      }
    }

    if (files.length > 0) {
      const { error: removeError } = await supabase.storage.from(bucket).remove(files);
      if (removeError) {
        console.warn(`  Storage remove ${bucket}: ${removeError.message}`);
      } else {
        removed += files.length;
      }
    }
  }

  console.log(`  Bucket ${bucket}: ${removed} archivo(s) eliminado(s)`);
  return removed;
}

async function main() {
  const confirm = process.argv.includes("--confirm");
  const clearStorage = process.argv.includes("--storage");

  if (!confirm) {
    console.error(
      "Operación destructiva. Ejecute con --confirm para borrar todas las entidades y datos operativos.",
    );
    console.error("  pnpm reset:piloto -- --confirm");
    console.error("  pnpm reset:piloto -- --confirm --storage");
    process.exit(1);
  }

  const supabase = getSupabaseAdmin();

  const { count: entidadCount } = await supabase
    .from("entidades")
    .select("*", { count: "exact", head: true });
  const { count: activoCount } = await supabase
    .from("activos")
    .select("*", { count: "exact", head: true });

  console.log("Reset piloto — estado actual:");
  console.log(`  Entidades: ${entidadCount ?? 0}`);
  console.log(`  Activos: ${activoCount ?? 0}`);
  console.log("");

  console.log("Eliminando datos…");

  await deleteAllRows(supabase, "activos", "Activos");
  await deleteAllRows(supabase, "eliminaciones_activos_log", "Log eliminaciones");
  await deleteAdminUsers(supabase);
  await deleteAllRows(supabase, "entidades", "Entidades");

  if (clearStorage) {
    console.log("Vaciando storage…");
    for (const bucket of STORAGE_BUCKETS) {
      await emptyStorageBucket(supabase, bucket);
    }
  } else {
    console.log("(Storage no modificado; use --storage para vaciar fotos/comprobantes)");
  }

  const { count: entidadesRestantes } = await supabase
    .from("entidades")
    .select("*", { count: "exact", head: true });
  const { count: activosRestantes } = await supabase
    .from("activos")
    .select("*", { count: "exact", head: true });

  console.log("");
  console.log("Listo. Estado final:");
  console.log(`  Entidades: ${entidadesRestantes ?? 0}`);
  console.log(`  Activos: ${activosRestantes ?? 0}`);
  console.log("Catálogo nacional y cuentas contables maestras se conservaron.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
