import fs from "fs";
import path from "path";
import Database from "better-sqlite3";

function safeParseJson(value) {
  if (typeof value !== "string" || value.trim() === "") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function clampLimit(value, fallback = 20) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, 100);
}

export function createRecipeStore(dbPathInput) {
  const dbPath = path.resolve(process.cwd(), dbPathInput || "data/recipes.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      source_url TEXT,
      original_json TEXT NOT NULL,
      optimized_json TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_recipes_created_at
      ON recipes(created_at DESC);
  `);

  const insertStmt = db.prepare(`
    INSERT INTO recipes (title, source_url, original_json, optimized_json)
    VALUES (@title, @source_url, @original_json, @optimized_json)
  `);

  const listStmt = db.prepare(`
    SELECT id, title, source_url, created_at
    FROM recipes
    ORDER BY id DESC
    LIMIT ?
  `);

  const getByIdStmt = db.prepare(`
    SELECT id, title, source_url, original_json, optimized_json, created_at
    FROM recipes
    WHERE id = ?
  `);

  function saveRecipeHistory({ title, sourceUrl, originalJson, optimizedJson }) {
    const payload = {
      title:
        typeof title === "string" && title.trim().length > 0
          ? title.trim()
          : "Recette sans titre",
      source_url:
        typeof sourceUrl === "string" && sourceUrl.trim().length > 0
          ? sourceUrl.trim()
          : null,
      original_json: JSON.stringify(originalJson ?? {}),
      optimized_json: JSON.stringify(optimizedJson ?? {}),
    };
    const result = insertStmt.run(payload);
    return Number(result.lastInsertRowid);
  }

  function listRecipeHistory(limit = 20) {
    const normalizedLimit = clampLimit(limit, 20);
    return listStmt.all(normalizedLimit).map((row) => ({
      id: row.id,
      title: row.title,
      source_url: row.source_url,
      created_at: row.created_at,
    }));
  }

  function getRecipeHistoryById(id) {
    const normalizedId = Number.parseInt(String(id), 10);
    if (!Number.isFinite(normalizedId) || normalizedId <= 0) return null;

    const row = getByIdStmt.get(normalizedId);
    if (!row) return null;

    return {
      id: row.id,
      title: row.title,
      source_url: row.source_url,
      original_json: safeParseJson(row.original_json),
      optimized_json: safeParseJson(row.optimized_json),
      created_at: row.created_at,
    };
  }

  function getKnownIngredients() {
    const rows = db.prepare("SELECT original_json FROM recipes").all();
    const names = new Set();
    for (const row of rows) {
      const parsed = safeParseJson(row.original_json);
      if (!parsed || !Array.isArray(parsed.ingredients)) continue;
      for (const ing of parsed.ingredients) {
        const name = typeof ing?.name === "string" ? ing.name.trim().toLowerCase() : "";
        if (name) names.add(name);
      }
    }
    return [...names].sort();
  }

  return {
    dbPath,
    saveRecipeHistory,
    listRecipeHistory,
    getRecipeHistoryById,
    getKnownIngredients,
  };
}
