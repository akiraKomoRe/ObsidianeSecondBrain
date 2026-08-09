import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { buildSeed } from "./seed.ts";
import type { LocalTables } from "./tables.ts";

/**
 * JSON-file store standing in for Postgres while there is no database.
 *
 * Deliberately synchronous. Every caller is a Server Component or Server
 * Action that would otherwise be waiting on a network round-trip, the file is
 * a few hundred kilobytes at most, and sync reads mean a request can never
 * observe a half-written state. Set LOCAL_DB_PATH to point it elsewhere --
 * the tests use that to get an isolated file per run.
 */

function dbPath(): string {
  return process.env.LOCAL_DB_PATH || join(process.cwd(), ".data", "db.json");
}

let cache: { path: string; data: LocalTables } | null = null;

function read(path: string): LocalTables {
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<LocalTables>;
    // Merge over a fresh seed so that a store written before a table existed
    // still loads instead of throwing on an undefined array.
    return { ...buildSeed(), ...parsed };
  } catch {
    const seeded = buildSeed();
    write(path, seeded);
    return seeded;
  }
}

function write(path: string, data: LocalTables): void {
  mkdirSync(dirname(path), { recursive: true });
  // Write-then-rename: a crash mid-write leaves the previous file intact
  // rather than a truncated one that would fail to parse and silently reseed.
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  renameSync(tmp, path);
}

export function loadTables(): LocalTables {
  const path = dbPath();
  if (!cache || cache.path !== path) {
    cache = { path, data: read(path) };
  }
  return cache.data;
}

/** Persist whatever the caller mutated in the object returned by loadTables. */
export function commit(): void {
  if (cache) write(cache.path, cache.data);
}

/** Drop the in-process cache. Used by tests between cases. */
export function resetStoreCache(): void {
  cache = null;
}
