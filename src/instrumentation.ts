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

  // Avoid running during local dev (Aurora VPC not reachable from sandbox)
  if (process.env.VERCEL !== "1" && process.env.RUN_MIGRATION !== "true") return;

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
