/**
 * instrumentation.ts — Next.js server instrumentation hook.
 * Runs once when the server starts. Triggers the Aurora schema migration
 * automatically on first deploy so all tables exist before requests arrive.
 *
 * Only runs in the Node.js runtime (not Edge). Safe to re-run — all SQL
 * uses IF NOT EXISTS / CREATE OR REPLACE, so it is fully idempotent.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  // Aurora connects via IAM — check for the host variable instead of a
  // connection string. Skip only when explicitly disabled.
  const hasDb =
    !!process.env.AWS_APG_PGHOST ||
    !!process.env.PGHOST ||
    !!process.env.DATABASE_URL ||
    !!process.env.POSTGRES_URL;
  if (!hasDb || process.env.RUN_MIGRATION === "false") return;

  try {
    const { withAuroraConnection } = await import("./lib/db-aurora");
    // Dynamically import the SQL string from the migrate route to keep a
    // single source of truth without duplicating the DDL here.
    const { FULL_SCHEMA_SQL } = await import(
      "./app/api/aurora/migrate/_schema"
    );
    await withAuroraConnection(async (client) => {
      await client.query(FULL_SCHEMA_SQL);
    });
    console.log("[instrumentation] Aurora schema migration completed.");
  } catch (err) {
    // Log but don't crash startup — the app can still handle requests
    console.error("[instrumentation] Aurora schema migration failed:", err);
  }
}
