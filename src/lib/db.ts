/**
 * db.ts — Drizzle ORM client backed by a PostgreSQL connection string.
 *
 * The project's database (provisioned via the connected integration) is a
 * standard password-authenticated Postgres instance. We connect with the
 * pooled connection string exposed by the integration:
 *   DATABASE_URL (preferred) → POSTGRES_URL → *_UNPOOLED fallbacks.
 *
 * A single global pool is reused across hot-reloads (dev) and warm serverless
 * invocations (prod) to avoid exhausting connections.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { attachDatabasePool } from "@vercel/functions";
import * as schema from "./schema";

const connectionString =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING;

if (!connectionString) {
  // Surface a clear error early instead of a cryptic pg connection timeout.
  console.error(
    "[db] No database connection string found. Expected DATABASE_URL or POSTGRES_URL."
  );
}

// Singleton pool — safe across hot-reloads in dev and serverless cold-starts
declare global {
  // eslint-disable-next-line no-var
  var _dbPool: Pool | undefined;
}

const pool =
  global._dbPool ??
  new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") {
  global._dbPool = pool;
}

attachDatabasePool(pool);

export const db = drizzle(pool, { schema });
// Raw pool for the lightweight query helpers in db-aurora.ts
export { pool as auroraPool };
