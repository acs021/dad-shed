import { mkdir, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
const localDir = join(process.cwd(), ".data", "pglite");
let pool: pg.Pool | undefined;
let seeded: Promise<void> | undefined;

const globalForDb = globalThis as unknown as { localDb?: Promise<PGlite> };

type Row = Record<string, unknown>;

export async function sql<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  if (databaseUrl !== "") {
    pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    return (await pool.query(text, params)).rows as T[];
  }
  return (await (await localDb()).query<T>(text, params)).rows;
}

export async function withTransaction<T>(
  fn: (query: <R = Row>(text: string, params?: unknown[]) => Promise<R[]>) => Promise<T>,
): Promise<T> {
  if (databaseUrl !== "") {
    pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    const client = await pool.connect();
    try {
      await client.query("begin");
      const result = await fn(async <R = Row>(text: string, params: unknown[] = []) => {
        return (await client.query(text, params)).rows as R[];
      });
      await client.query("commit");
      return result;
    } catch (error) {
      try {
        await client.query("rollback");
      } catch {
        // The original error is the one worth throwing.
      }
      throw error;
    } finally {
      client.release();
    }
  }
  const db = await localDb();
  return db.transaction(async (tx) => {
    return fn(async <R = Row>(text: string, params: unknown[] = []) => {
      return (await tx.query<R>(text, params)).rows;
    });
  });
}

function localDb(): Promise<PGlite> {
  globalForDb.localDb ??= startLocal().catch((error: unknown) => {
    globalForDb.localDb = undefined;
    throw error;
  });
  return globalForDb.localDb;
}

async function startLocal(): Promise<PGlite> {
  await mkdir(join(process.cwd(), ".data"), { recursive: true });
  const db = new PGlite(localDir);
  await db.exec(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const done = new Set(
    (await db.query<{ name: string }>("select name from schema_migrations")).rows.map((row) => row.name),
  );
  const files = (await readdir("migrations").catch(() => [])).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    if (done.has(file)) continue;
    await db.exec(await readFile(join("migrations", file), "utf8"));
    await db.query("insert into schema_migrations (name) values ($1)", [file]);
  }
  return db;
}

export async function readyDb() {
  await sql("select 1 as ok");
  if (databaseUrl !== "" || process.env.DADSHED_NO_SEED === "1") return;
  seeded ??= seedIfEmpty().catch((error: unknown) => {
    seeded = undefined;
    throw error;
  });
  await seeded;
}

async function seedIfEmpty() {
  const rows = await sql<{ n: number }>("select count(*)::int as n from members");
  if ((rows[0]?.n ?? 0) > 0) return;
  const { seedDemo } = await import("../server/seed");
  await seedDemo();
}
