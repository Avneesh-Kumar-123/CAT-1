import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

/**
 * Lazy pool — only created the first time it is accessed.
 * This lets the API server start and serve health checks even if
 * DATABASE_URL is not yet configured; DB-backed routes will fail
 * with a clear error message rather than crashing the process.
 */
let _pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL is not set. Provide a PostgreSQL connection string " +
          "(Neon, Supabase, Railway, etc.) as the DATABASE_URL secret.",
      );
    }
    _pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return _pool;
}

// Drizzle requires a pool or client at construction time.
// We create a thin proxy so the pool is still initialised lazily.
export const pool = new Proxy({} as pg.Pool, {
  get(_target, prop) {
    return (getPool() as any)[prop];
  },
});

export const db = drizzle(pool, { schema });

export * from "./schema";
