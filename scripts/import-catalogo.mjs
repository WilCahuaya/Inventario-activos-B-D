#!/usr/bin/env node
/**
 * Importa el catálogo nacional desde docs/Catalogo nacional de activos.ods
 *
 *   pnpm import:catalogo           → genera supabase/seed/catalogo_nacional.sql
 *   pnpm import:catalogo -- --push → upsert a Supabase (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)
 */

import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const SEED_PATH = join(ROOT, "supabase/seed/catalogo_nacional.sql");

function sqlVal(value) {
  if (value == null || value === "") return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function writeSeedSql(rows) {
  mkdirSync(dirname(SEED_PATH), { recursive: true });
  const lines = [
    "-- Catálogo nacional — generado por scripts/import-catalogo.mjs",
    "-- Ejecutar después de 20260609100000_catalogo_nacional.sql",
    "-- Idempotente: upsert (no TRUNCATE; activos referencia catalogo_nacional por FK)",
    "BEGIN;",
  ];

  const onConflict = `
ON CONFLICT (codigo) DO UPDATE SET
  denominacion = EXCLUDED.denominacion,
  grupo = EXCLUDED.grupo,
  clase = EXCLUDED.clase,
  cuenta_codigo = EXCLUDED.cuenta_codigo,
  contabilidad = EXCLUDED.contabilidad,
  depreciacion = EXCLUDED.depreciacion,
  resolucion = EXCLUDED.resolucion,
  estado = EXCLUDED.estado`;

  for (let i = 0; i < rows.length; i += 200) {
    const batch = rows.slice(i, i + 200);
    lines.push(
      "INSERT INTO public.catalogo_nacional (codigo, denominacion, grupo, clase, cuenta_codigo, contabilidad, depreciacion, resolucion, estado, origen) VALUES",
    );
    lines.push(
      batch
        .map(
          (r) =>
            `  (${[
              sqlVal(r.codigo),
              sqlVal(r.denominacion),
              sqlVal(r.grupo),
              sqlVal(r.clase),
              sqlVal(r.cuenta_codigo),
              sqlVal(r.contabilidad),
              sqlVal(r.depreciacion),
              sqlVal(r.resolucion),
              sqlVal(r.estado),
              sqlVal("NACIONAL"),
            ].join(", ")})`,
        )
        .join(",\n") + onConflict + ";",
    );
  }

  lines.push("COMMIT;");
  writeFileSync(SEED_PATH, lines.join("\n"), "utf8");
  console.log(`Seed SQL: ${SEED_PATH} (${rows.length} filas)`);
}

async function pushToSupabase(rows) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Defina SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para --push");
  }

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const batchSize = 500;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from("catalogo_nacional").upsert(batch, { onConflict: "codigo" });
    if (error) throw error;
    console.log(`Upsert ${Math.min(i + batchSize, rows.length)} / ${rows.length}`);
  }

  console.log("Catálogo cargado en Supabase.");
}

async function main() {
  const stdout = execFileSync("python3", [join(__dirname, "parse-catalogo-ods.py")], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const rows = JSON.parse(stdout);
  console.log(`ODS: ${rows.length} ítems`);
  writeSeedSql(rows);

  if (process.argv.includes("--push")) {
    await pushToSupabase(rows);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
