#!/usr/bin/env node
/**
 * Normaliza cuenta_codigo y contabilidad en supabase/seed/catalogo_nacional.sql
 *
 *   node scripts/normalize-catalogo-seed.mjs
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CUENTA_CONTABLE_CODIGO_RE = /^\d{1,6}$/;
const CUENTA_CONTA_COMBINADA_RE = /^(\d{4,5})\s+(.+)$/;

function normalizeCuentaCodigo(value) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, "");
  return CUENTA_CONTABLE_CODIGO_RE.test(digits) ? digits : null;
}

function normalizeNombreCuentaContable(cuentaCodigo, contabilidad) {
  let nombre = contabilidad?.trim().replace(/\s+/g, " ") ?? "";
  if (!nombre) return null;
  if (cuentaCodigo && (nombre === cuentaCodigo || nombre.startsWith(`${cuentaCodigo} `))) {
    nombre = nombre.slice(cuentaCodigo.length).trim();
  }
  if (!nombre || nombre === cuentaCodigo) return null;
  return nombre;
}

function normalizeCuentaContableFields(cuentaCodigo, contabilidad) {
  let codigo = normalizeCuentaCodigo(cuentaCodigo);
  let rawNombre = contabilidad?.trim().replace(/\s+/g, " ") ?? "";

  if (!codigo && rawNombre) {
    const soloCodigo = normalizeCuentaCodigo(rawNombre);
    if (soloCodigo && rawNombre === soloCodigo) {
      return { cuenta_codigo: soloCodigo, contabilidad: null };
    }
    const match = CUENTA_CONTA_COMBINADA_RE.exec(rawNombre);
    if (match) {
      codigo = match[1];
      rawNombre = match[2].trim();
    }
  }

  return {
    cuenta_codigo: codigo,
    contabilidad: normalizeNombreCuentaContable(codigo, rawNombre || null),
  };
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const SEED_PATH = join(__dirname, "../supabase/seed/catalogo_nacional.sql");

function sqlVal(value) {
  if (value == null || value === "") return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function splitSqlValues(line) {
  const values = [];
  let i = 0;
  const s = line.trim();
  if (!s.startsWith("(")) return null;

  i = 1;
  while (i < s.length) {
    while (i < s.length && (s[i] === " " || s[i] === ",")) i += 1;
    if (i >= s.length || s[i] === ")") break;

    if (s.startsWith("NULL", i)) {
      values.push(null);
      i += 4;
      continue;
    }

    if (s[i] !== "'") return null;

    i += 1;
    let value = "";
    while (i < s.length) {
      if (s[i] === "'" && s[i + 1] === "'") {
        value += "'";
        i += 2;
      } else if (s[i] === "'") {
        i += 1;
        break;
      } else {
        value += s[i];
        i += 1;
      }
    }
    values.push(value);
  }

  return values.length === 9 ? values : null;
}

function formatRow(values) {
  return `(${values.map(sqlVal).join(", ")})`;
}

function normalizeSeedLine(line) {
  const trimmed = line.trimEnd();
  if (!trimmed.startsWith("(") && !trimmed.startsWith("  (")) return line;

  const endsWithComma = trimmed.endsWith(",");
  const endsWithSemicolon = trimmed.endsWith(");");
  const core = trimmed.replace(/[;,]+$/, "");
  const values = splitSqlValues(core);
  if (!values) return line;

  const cuenta = normalizeCuentaContableFields(values[4], values[5]);
  values[4] = cuenta.cuenta_codigo;
  values[5] = cuenta.contabilidad;

  const indent = line.match(/^\s*/)?.[0] ?? "  ";
  let ending = "";
  if (endsWithSemicolon) ending = ");";
  else if (endsWithComma) ending = ",";

  return `${indent}${formatRow(values)}${ending}`;
}

function main() {
  const original = readFileSync(SEED_PATH, "utf8");
  const lines = original.split("\n");
  let changed = 0;

  const next = lines.map((line) => {
    if (!line.trimStart().startsWith("(")) return line;
    const normalized = normalizeSeedLine(line);
    if (normalized !== line) changed += 1;
    return normalized;
  });

  writeFileSync(SEED_PATH, next.join("\n"), "utf8");
  console.log(`Seed normalizado: ${SEED_PATH} (${changed} filas actualizadas)`);
}

main();
