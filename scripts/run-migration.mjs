/**
 * Runs SQL migration scripts against Aurora PostgreSQL using IAM auth.
 * Usage: node --env-file-if-exists=/vercel/share/.env.project scripts/run-migration.mjs
 */
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pkg from "pg";
import { Signer } from "@aws-sdk/rds-signer";

const { Pool } = pkg;
const __dirname = dirname(fileURLToPath(import.meta.url));

// Validate required env vars
const required = ["PGHOST", "AWS_REGION", "AWS_ROLE_ARN", "PGUSER", "PGDATABASE"];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`Missing env var: ${key}`);
    process.exit(1);
  }
}

// AWS credentials from environment (set by --env-file-if-exists)
const signer = new Signer({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
  region: process.env.AWS_REGION,
  hostname: process.env.PGHOST,
  username: process.env.PGUSER,
  port: 5432,
});

async function run() {
  let token;
  try {
    token = await signer.getAuthToken();
  } catch (e) {
    console.error("Failed to get IAM auth token:", e.message);
    process.exit(1);
  }

  const pool = new Pool({
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    port: 5432,
    user: process.env.PGUSER,
    password: token,
    ssl: { rejectUnauthorized: false },
    max: 1,
  });

  const sqlFile = join(__dirname, "001-arena-schema.sql");
  const sql = readFileSync(sqlFile, "utf8");

  const client = await pool.connect();
  try {
    console.log("Running migration: 001-arena-schema.sql ...");
    await client.query(sql);
    console.log("Migration completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
