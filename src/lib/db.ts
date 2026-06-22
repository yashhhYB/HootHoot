/**
 * db.ts — Drizzle ORM client backed by AWS Aurora PostgreSQL.
 *
 * Authentication uses IAM via awsCredentialsProvider (OIDC) on Vercel,
 * or VERCEL_OIDC_TOKEN + AssumeRoleWithWebIdentity in local dev after
 * `npx vercel env pull`.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { Signer } from "@aws-sdk/rds-signer";
import { fromWebToken } from "@aws-sdk/credential-providers";
import { awsCredentialsProvider } from "@vercel/functions/oidc";
import { attachDatabasePool } from "@vercel/functions";
import * as schema from "./schema";

function getCredentials() {
  // On Vercel (production + preview) the OIDC token is injected automatically
  // by the runtime via awsCredentialsProvider. Locally after `vercel env pull`
  // VERCEL_OIDC_TOKEN is present in .env.aurora.local — we use fromWebToken.
  if (process.env.VERCEL_OIDC_TOKEN) {
    return fromWebToken({
      roleArn: process.env.AWS_ROLE_ARN!,
      webIdentityToken: process.env.VERCEL_OIDC_TOKEN,
      clientConfig: { region: process.env.AWS_REGION },
    });
  }
  return awsCredentialsProvider({
    roleArn: process.env.AWS_ROLE_ARN!,
    clientConfig: { region: process.env.AWS_REGION },
  });
}

const signer = new Signer({
  credentials: getCredentials(),
  region: process.env.AWS_REGION,
  hostname: process.env.PGHOST!,
  username: process.env.PGUSER ?? "postgres",
  port: 5432,
});

// Singleton pool — safe across hot-reloads in dev and serverless cold-starts
declare global {
  // eslint-disable-next-line no-var
  var _auroraPool: Pool | undefined;
}

const pool =
  global._auroraPool ??
  new Pool({
    host: process.env.PGHOST,
    database: process.env.PGDATABASE ?? "postgres",
    port: 5432,
    user: process.env.PGUSER ?? "postgres",
    password: () => signer.getAuthToken(),
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

if (process.env.NODE_ENV !== "production") {
  global._auroraPool = pool;
}

attachDatabasePool(pool);

export const db = drizzle(pool, { schema });
// Export the raw pool so auth.ts can pass it directly to Better Auth
export { pool as auroraPool };
