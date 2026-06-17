import { getCatalogDb } from "./catalogo";

export interface AtributoVocabRow {
  campo: string;
  valor: string;
  valor_normalizado: string;
  uso_count: number;
}

export interface AtributoVocabMeta {
  count: number;
  syncedAt: string | null;
}

export function initAtributoVocabSchema(): void {
  const db = getCatalogDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS activo_atributos_vocab (
      campo TEXT NOT NULL,
      valor TEXT NOT NULL,
      valor_normalizado TEXT NOT NULL,
      uso_count INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (campo, valor_normalizado)
    );
    CREATE INDEX IF NOT EXISTS idx_atributo_vocab_suggest
      ON activo_atributos_vocab (campo, valor_normalizado);
  `);
}

export function replaceAtributoVocab(rows: AtributoVocabRow[]): AtributoVocabMeta {
  const db = getCatalogDb();
  const insert = db.prepare(`
    INSERT OR REPLACE INTO activo_atributos_vocab (campo, valor, valor_normalizado, uso_count)
    VALUES (@campo, @valor, @valor_normalizado, @uso_count)
  `);

  const syncedAt = new Date().toISOString();
  const tx = db.transaction((items: AtributoVocabRow[]) => {
    db.exec("DELETE FROM activo_atributos_vocab");
    for (const row of items) insert.run(row);
    db.prepare(
      "INSERT OR REPLACE INTO meta (key, value) VALUES ('atributo_vocab_synced_at', @value)",
    ).run({ value: syncedAt });
  });

  tx(rows);

  return { count: rows.length, syncedAt };
}

export function searchAtributoVocab(
  campo: string,
  query: string,
  limit = 10,
): string[] {
  const db = getCatalogDb();
  const trimmed = query.trim();
  if (trimmed.length < 1) return [];

  const pattern = `%${trimmed.toLowerCase()}%`;
  const prefix = `${trimmed.toLowerCase()}%`;

  const rows = db
    .prepare(
      `
      SELECT valor
      FROM activo_atributos_vocab
      WHERE campo = @campo
        AND valor_normalizado LIKE @pattern
      ORDER BY
        CASE WHEN valor_normalizado LIKE @prefix THEN 0 ELSE 1 END,
        uso_count DESC,
        valor
      LIMIT @limit
    `,
    )
    .all({
      campo,
      pattern,
      prefix,
      limit: Math.min(Math.max(limit, 1), 10),
    }) as Array<{ valor: string }>;

  return rows.map((row) => row.valor);
}

export function upsertAtributoVocabLocal(campo: string, valor: string): void {
  const db = getCatalogDb();
  const trimmed = valor.trim();
  if (!trimmed) return;
  if (!["marca", "modelo", "serie", "color", "medidas"].includes(campo)) return;

  const valorNormalizado = trimmed.toLowerCase();

  db.prepare(
    `
    INSERT INTO activo_atributos_vocab (campo, valor, valor_normalizado, uso_count)
    VALUES (@campo, @valor, @valor_normalizado, 1)
    ON CONFLICT(campo, valor_normalizado) DO UPDATE SET
      uso_count = uso_count + 1
  `,
  ).run({
    campo,
    valor: trimmed,
    valor_normalizado: valorNormalizado,
  });
}

export function getAtributoVocabMeta(): AtributoVocabMeta {
  const db = getCatalogDb();
  const countRow = db
    .prepare("SELECT COUNT(*) AS count FROM activo_atributos_vocab")
    .get() as { count: number };
  const syncedRow = db
    .prepare("SELECT value FROM meta WHERE key = 'atributo_vocab_synced_at'")
    .get() as { value: string } | undefined;

  return {
    count: countRow?.count ?? 0,
    syncedAt: syncedRow?.value ?? null,
  };
}
