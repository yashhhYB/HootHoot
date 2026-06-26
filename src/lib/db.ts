/**
 * db.ts — PostgreSQL connection pool.
 *
 * Production (Vercel): AWS Aurora PostgreSQL via IAM auth (RDS Signer).
 *   Env vars: AWS_APG_PGHOST, AWS_APG_AWS_REGION, AWS_APG_AWS_ROLE_ARN,
 *             AWS_APG_PGUSER, AWS_APG_PGDATABASE
 *
 * Local dev: Falls back to the Neon connection string (DATABASE_URL /
 *   POSTGRES_URL) when the Aurora host is not set, so development works
 *   without VPN access to the Aurora VPC.
 *
 * All app code queries through:
 *   db         — Drizzle ORM client (schema-typed queries)
 *   auroraPool — raw pg Pool (re-exported to db-aurora.ts for lightweight helpers)
 */
import { Pool, type ClientBase } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { attachDatabasePool } from "@vercel/functions";
import * as schema from "./schema";

// ── Detect which backend is available ────────────────────────────────────────
const auroraHost =
  process.env.AWS_APG_PGHOST ?? process.env.PGHOST ?? "";

const neonConnStr =
  process.env.DATABASE_URL ??
  process.env.POSTGRES_URL ??
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.POSTGRES_URL_NON_POOLING ??
  "";

const useAurora = !!auroraHost;

// ── Build the pool ────────────────────────────────────────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var _dbPool: Pool | undefined;
}

function buildPool(): Pool {
  if (useAurora) {
    // Lazy-require so the RDS Signer is never imported when running on Neon
    // (avoids the OIDC credential fetch failing in non-Vercel environments).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Signer } = require("@aws-sdk/rds-signer") as typeof import("@aws-sdk/rds-signer");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { awsCredentialsProvider } = require("@vercel/functions/oidc") as typeof import("@vercel/functions/oidc");

    const region  = process.env.AWS_APG_AWS_REGION  ?? process.env.AWS_REGION  ?? "us-east-1";
    const roleArn = process.env.AWS_APG_AWS_ROLE_ARN ?? process.env.AWS_ROLE_ARN ?? "";
    const user     = process.env.AWS_APG_PGUSER     ?? process.env.PGUSER     ?? "postgres";
    const database = process.env.AWS_APG_PGDATABASE ?? process.env.PGDATABASE ?? "postgres";

    if (!roleArn) {
      console.error("[db] AWS_APG_AWS_ROLE_ARN not set — IAM auth will fail on Aurora.");
    }

    const signer = new Signer({
      credentials: awsCredentialsProvider({
        roleArn,
        clientConfig: { region },
      }),
      region,
      hostname: auroraHost,
      username: user,
      port: 5432,
    });

    console.log("[db] Using AWS Aurora PostgreSQL (IAM auth) —", auroraHost);

    return new Pool({
      host: auroraHost,
      database,
      port: 5432,
      user,
      // RDS Signer tokens are valid for 15 min; the pool refreshes them per
      // new connection, so long-lived pools stay authenticated automatically.
      password: () => signer.getAuthToken(),
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 15_000,
    });
  }

  // ── Neon / connection-string fallback (local dev) ──────────────────────────
  if (!neonConnStr) {
    console.error("[db] No database connection available. Set AWS_APG_PGHOST (Aurora) or DATABASE_URL (Neon).");
  } else {
    console.log("[db] Using Neon PostgreSQL (connection string) — local dev mode.");
  }

  return new Pool({
    connectionString: neonConnStr,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

const pool = global._dbPool ?? buildPool();

if (process.env.NODE_ENV !== "production") {
  global._dbPool = pool;
}

attachDatabasePool(pool);

// Drizzle ORM client
export const db = drizzle(pool, { schema });

// Raw pool re-exported to db-aurora.ts
export { pool as auroraPool };
