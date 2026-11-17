import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
let pool: pg.Pool | undefined;
let local: Promise<PGlite> | undefined;
let seeded: Promise<void> | undefined;

type Row = Record<string, unknown>;

export async function sql<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  if (databaseUrl !== "") {
    pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    return (await pool.query(text, params)).rows as T[];
  }
  local ??= startLocal().catch((error: unknown) => {
    local = undefined;
    throw error;
  });
  return (await (await local).query<T>(text, params)).rows;
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
  local ??= startLocal().catch((error: unknown) => {
    local = undefined;
    throw error;
  });
  const db = await local;
  return db.transaction(async (tx) => {
    return fn(async <R = Row>(text: string, params: unknown[] = []) => {
      return (await tx.query<R>(text, params)).rows;
    });
  });
}

async function startLocal(): Promise<PGlite> {
  const db = new PGlite();
  const files = (await readdir("migrations").catch(() => [])).filter((file) => file.endsWith(".sql")).sort();
  for (const file of files) {
    await db.exec(await readFile(`migrations/${file}`, "utf8"));
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
