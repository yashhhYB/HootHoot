/**
 * Runs SQL migration against Aurora PostgreSQL using OIDC-based IAM auth.
 * Uses VERCEL_OIDC_TOKEN + AWS_ROLE_ARN to assume the correct AWS role,
 * then gets an RDS auth token for the IAM-authenticated database connection.
 *
 * Usage:
 *   node --env-file=.env.aurora.local scripts/run-migration.mjs
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
import { Signer } from "@aws-sdk/rds-signer";
import { fromWebToken } from "@aws-sdk/credential-providers";

const { Pool } = pkg;
const __dirname = dirname(fileURLToPath(import.meta.url));

// Validate required env vars
const required = ["PGHOST", "AWS_REGION", "AWS_ROLE_ARN", "PGUSER", "PGDATABASE", "VERCEL_OIDC_TOKEN"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`[migration] Missing required env var: ${key}`);
    process.exit(1);
  }
}

console.log("[migration] Env vars validated.");
console.log(`[migration] PGHOST:    ${process.env.PGHOST}`);
console.log(`[migration] PGUSER:    ${process.env.PGUSER}`);
console.log(`[migration] PGDATABASE: ${process.env.PGDATABASE}`);
console.log(`[migration] AWS_REGION: ${process.env.AWS_REGION}`);

// Build credentials from the OIDC web identity token (Vercel federation)
const credentials = fromWebToken({
  roleArn: process.env.AWS_ROLE_ARN,
  webIdentityToken: process.env.VERCEL_OIDC_TOKEN,
  clientConfig: { region: process.env.AWS_REGION },
});

const signer = new Signer({
  credentials,
  region: process.env.AWS_REGION,
  hostname: process.env.PGHOST,
  username: process.env.PGUSER,
  port: 5432,
});

async function run() {
  let token;
  try {
    console.log("[migration] Fetching RDS IAM auth token...");
    token = await signer.getAuthToken();
    console.log("[migration] RDS auth token obtained.");
  } catch (e) {
    console.error("[migration] Failed to get IAM auth token:", e.message);
    process.exit(1);
  }

  const pool = new Pool({
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    port: parseInt(process.env.PGPORT || "5432"),
    user: process.env.PGUSER,
    password: token,
    ssl: { rejectUnauthorized: false },
    max: 1,
    connectionTimeoutMillis: 10000,
  });

  // Determine which SQL files to run
  const arg = process.argv[2];
  let sqlFiles;

  if (arg) {
    sqlFiles = [arg.startsWith("/") ? arg : join(__dirname, arg)];
  } else {
    // Run all numbered *.sql files in order
    const { readdirSync } = await import("fs");
    sqlFiles = readdirSync(__dirname)
      .filter((f) => /^\d+.*\.sql$/.test(f))
      .sort()
      .map((f) => join(__dirname, f));
  }

  for (const sqlFile of sqlFiles) {
    const sql = readFileSync(sqlFile, "utf8");
    const client = await pool.connect();
    try {
      console.log(`[migration] Running ${sqlFile} ...`);
      await client.query(sql);
      console.log(`[migration] Done: ${sqlFile}`);
    } catch (err) {
      console.error(`[migration] Failed on ${sqlFile}:`, err.message);
      client.release();
      await pool.end();
      process.exit(1);
    } finally {
      client.release();
    }
  }

  // Verify all tables after migration
  const verify = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  console.log("\n[migration] All tables in DB:", verify.rows.map(r => r.table_name).join(", "));
  console.log("[migration] All migrations completed successfully.");
  await pool.end();
}

run();
