import { randomUUID } from "node:crypto";

import { commit, loadTables } from "./store.ts";
import { blockedColumn, canSelect, canWrite, type Viewer } from "./policy.ts";
import {
  COLUMN_DEFAULTS,
  PRIMARY_KEY,
  UNIQUE_KEYS,
  type LocalTables,
  type Row,
  type TableName,
} from "./tables.ts";

/**
 * A stand-in for the Supabase client, implementing exactly the surface this
 * app uses. Measured across the 24 call sites: select / insert / update /
 * upsert / delete, the filters eq, neq, in, gte, lte, plus order, limit,
 * single, maybeSingle and `{ count: "exact", head: true }`. There are no
 * joins, no nested selects, no .or() and no .rpc() anywhere in the codebase,
 * which is what makes standing in for it practical.
 *
 * Row visibility is delegated to ./policy, which mirrors the RLS in the
 * migrations. Pass viewer = null for the service-role client, which bypasses
 * policies exactly as it does in Postgres.
 */

type PgError = { message: string; code?: string };
type Result<T> = { data: T; error: PgError | null; count: number | null };

type Filter = { op: "eq" | "neq" | "gte" | "lte" | "in"; column: string; value: unknown };

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a) < String(b) ? -1 : 1;
}

function matches(row: Row, filter: Filter): boolean {
  const actual = row[filter.column];
  switch (filter.op) {
    case "eq":
      return actual === filter.value;
    case "neq":
      return actual !== filter.value;
    case "gte":
      return compare(actual, filter.value) >= 0;
    case "lte":
      return compare(actual, filter.value) <= 0;
    case "in":
      return Array.isArray(filter.value) && filter.value.includes(actual);
  }
}

/** Column list from a select() projection, or null for "*". */
function parseColumns(columns: string): string[] | null {
  const trimmed = columns.trim();
  if (trimmed === "*" || trimmed === "") return null;
  return trimmed.split(",").map((c) => c.trim());
}

function project(row: Row, columns: string[] | null): Row {
  if (!columns) return { ...row };
  const out: Row = {};
  for (const column of columns) out[column] = row[column];
  return out;
}

const TIMESTAMPED = new Set<TableName>([
  "daily_reports",
  "weekly_reports",
  "term_evaluations",
  "term_evaluation_items",
  "term_evaluation_marks",
]);

function applyInsertDefaults(table: TableName, row: Row): Row {
  const now = new Date().toISOString();
  // Column defaults first, so an explicitly-passed value always wins.
  const withDefaults: Row = { ...COLUMN_DEFAULTS[table], ...row };
  if (PRIMARY_KEY[table] === "id" && withDefaults.id === undefined) {
    withDefaults.id = randomUUID();
  }
  if (withDefaults.created_at === undefined) withDefaults.created_at = now;
  if (TIMESTAMPED.has(table) && withDefaults.updated_at === undefined) {
    withDefaults.updated_at = now;
  }
  return withDefaults;
}

function uniqueConflict(table: TableName, candidate: Row, rows: Row[], ignore?: Row): Row | null {
  for (const key of UNIQUE_KEYS[table] ?? []) {
    if (key.some((column) => candidate[column] === undefined)) continue;
    const hit = rows.find(
      (row) => row !== ignore && key.every((column) => row[column] === candidate[column])
    );
    if (hit) return hit;
  }
  return null;
}

class Query implements PromiseLike<Result<Row[] | Row | null>> {
  private filters: Filter[] = [];
  private orders: { column: string; ascending: boolean }[] = [];
  private limitTo: number | null = null;
  private columns: string[] | null = null;
  private wantRows = false;
  private headOnly = false;
  private wantCount = false;
  private cardinality: "many" | "one" | "maybeOne" = "many";
  private mutation:
    | { kind: "insert"; rows: Row[] }
    | { kind: "update"; patch: Row }
    | { kind: "upsert"; rows: Row[]; onConflict: string[] }
    | { kind: "delete" }
    | null = null;

  // Written out rather than declared as constructor parameter properties:
  // `node --experimental-strip-types` (what `npm test` uses) cannot strip those.
  private readonly table: TableName;
  private readonly viewer: Viewer;

  constructor(table: TableName, viewer: Viewer) {
    this.table = table;
    this.viewer = viewer;
  }

  select(columns = "*", options?: { count?: "exact"; head?: boolean }) {
    this.columns = parseColumns(columns);
    this.wantRows = true;
    this.wantCount = options?.count === "exact";
    this.headOnly = options?.head === true;
    return this;
  }

  insert(values: Row | Row[]) {
    this.mutation = { kind: "insert", rows: Array.isArray(values) ? values : [values] };
    return this;
  }

  update(patch: Row) {
    this.mutation = { kind: "update", patch };
    return this;
  }

  upsert(values: Row | Row[], options?: { onConflict?: string }) {
    this.mutation = {
      kind: "upsert",
      rows: Array.isArray(values) ? values : [values],
      onConflict: (options?.onConflict ?? PRIMARY_KEY[this.table]).split(",").map((c) => c.trim()),
    };
    return this;
  }

  delete() {
    this.mutation = { kind: "delete" };
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ op: "eq", column, value });
    return this;
  }
  neq(column: string, value: unknown) {
    this.filters.push({ op: "neq", column, value });
    return this;
  }
  gte(column: string, value: unknown) {
    this.filters.push({ op: "gte", column, value });
    return this;
  }
  lte(column: string, value: unknown) {
    this.filters.push({ op: "lte", column, value });
    return this;
  }
  in(column: string, values: unknown[]) {
    this.filters.push({ op: "in", column, value: values });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: options?.ascending !== false });
    return this;
  }

  limit(count: number) {
    this.limitTo = count;
    return this;
  }

  single() {
    this.cardinality = "one";
    this.wantRows = true;
    return this;
  }

  maybeSingle() {
    this.cardinality = "maybeOne";
    this.wantRows = true;
    return this;
  }

  then<TResult1 = Result<Row[] | Row | null>, TResult2 = never>(
    onfulfilled?: ((value: Result<Row[] | Row | null>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve()
      .then(() => this.run())
      .then(onfulfilled, onrejected);
  }

  private rows(): Row[] {
    return loadTables()[this.table] as unknown as Row[];
  }

  private visible(rows: Row[]): Row[] {
    const tables = loadTables();
    return rows.filter((row) => canSelect(this.table, row, tables, this.viewer));
  }

  private selected(): Row[] {
    let rows = this.visible(this.rows()).filter((row) =>
      this.filters.every((filter) => matches(row, filter))
    );
    for (const { column, ascending } of [...this.orders].reverse()) {
      rows = [...rows].sort((a, b) => (ascending ? 1 : -1) * compare(a[column], b[column]));
    }
    if (this.limitTo !== null) rows = rows.slice(0, this.limitTo);
    return rows;
  }

  private run(): Result<Row[] | Row | null> {
    try {
      return this.mutation ? this.runMutation() : this.runSelect(this.selected());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { data: null, error: { message }, count: null };
    }
  }

  private runSelect(rows: Row[]): Result<Row[] | Row | null> {
    const count = this.wantCount ? rows.length : null;
    if (this.headOnly) return { data: null, error: null, count };

    if (this.cardinality === "one") {
      if (rows.length !== 1) {
        return {
          data: null,
          error: { message: "JSON object requested, multiple (or no) rows returned", code: "PGRST116" },
          count,
        };
      }
      return { data: project(rows[0], this.columns), error: null, count };
    }
    if (this.cardinality === "maybeOne") {
      if (rows.length > 1) {
        return { data: null, error: { message: "more than one row returned" }, count };
      }
      return { data: rows[0] ? project(rows[0], this.columns) : null, error: null, count };
    }
    return { data: rows.map((row) => project(row, this.columns)), error: null, count };
  }

  private runMutation(): Result<Row[] | Row | null> {
    const mutation = this.mutation!;
    const tables = loadTables();
    const store = this.rows();
    const affected: Row[] = [];

    if (mutation.kind === "insert" || mutation.kind === "upsert") {
      for (const raw of mutation.rows) {
        const conflictKey = mutation.kind === "upsert" ? mutation.onConflict : null;
        const existing = conflictKey
          ? store.find((row) => conflictKey.every((column) => row[column] === raw[column]))
          : null;

        if (existing) {
          if (!canWrite(this.table, existing, tables, this.viewer)) continue;
          Object.assign(existing, raw, { updated_at: new Date().toISOString() });
          affected.push(existing);
          continue;
        }

        const row = applyInsertDefaults(this.table, raw);
        if (!canWrite(this.table, row, tables, this.viewer)) {
          return {
            data: null,
            error: { message: "new row violates row-level security policy", code: "42501" },
            count: null,
          };
        }
        if (uniqueConflict(this.table, row, store)) {
          return {
            data: null,
            error: { message: "duplicate key value violates unique constraint", code: "23505" },
            count: null,
          };
        }
        store.push(row);
        affected.push(row);
      }
    } else {
      // update / delete operate on rows the viewer can both see and write.
      const targets = this.selected().filter((row) => canWrite(this.table, row, tables, this.viewer));

      if (mutation.kind === "update") {
        for (const row of targets) {
          const candidate = { ...row, ...mutation.patch };
          const blocked = blockedColumn(this.table, row, candidate, tables, this.viewer);
          if (blocked) {
            return {
              data: null,
              error: {
                message: `column "${blocked}" may only be changed by an administrator`,
                code: "42501",
              },
              count: null,
            };
          }
          if (uniqueConflict(this.table, candidate, store, row)) {
            return {
              data: null,
              error: { message: "duplicate key value violates unique constraint", code: "23505" },
              count: null,
            };
          }
          // A write must also satisfy the policy in its NEW state -- the SQL
          // equivalent of a policy's WITH CHECK clause.
          if (!canWrite(this.table, candidate, tables, this.viewer)) continue;
          Object.assign(row, mutation.patch);
          if (TIMESTAMPED.has(this.table)) row.updated_at = new Date().toISOString();
          affected.push(row);
        }
      } else {
        for (const row of targets) {
          store.splice(store.indexOf(row), 1);
          affected.push(row);
        }
      }
    }

    commit();
    return this.wantRows
      ? this.runSelect(affected)
      : { data: null, error: null, count: this.wantCount ? affected.length : null };
  }
}

export type LocalClient = {
  from: (table: TableName) => Query;
  auth: {
    getUser: () => Promise<{ data: { user: { id: string } | null }; error: null }>;
  };
};

/**
 * @param viewer the signed-in user, or null for service-role access.
 */
export function createLocalClient(viewer: Viewer) {
  return {
    from: (table: TableName) => new Query(table, viewer),
    auth: {
      getUser: async () => ({ data: { user: viewer ? { id: viewer.id } : null }, error: null }),
    },
  };
}

export type { LocalTables };
