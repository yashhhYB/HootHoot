/**
 * POST /api/aurora/migrate
 * Runs the full idempotent schema migration against Aurora PostgreSQL.
 * Call this once after first deploy (or any schema change).
 * GET /api/aurora/migrate checks which tables exist (useful for debugging).
 *
 * In production, POST requires x-migration-secret header === MIGRATION_SECRET.
 * The schema is auto-applied on startup via instrumentation.ts anyway.
 */
import { NextResponse } from "next/server";
import { auroraQuery, withAuroraConnection } from "@/lib/db-aurora";
import { FULL_SCHEMA_SQL } from "./_schema";

const ALL_TABLE_NAMES = [
  // Auth (the only auth system)
  "app_users", "user_sessions",
  // Game features
  "game_score", "game_attempt", "user_streak",
  "poll", "poll_option", "broadcast", "broadcast_recipient",
  // Arena / company
  "companies", "practice_attempts", "company_tests",
  "test_sessions", "warning_logs", "arena_questions",
];

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    const secret = req.headers.get("x-migration-secret");
    if (secret !== process.env.MIGRATION_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    await withAuroraConnection(async (client) => {
      await client.query(FULL_SCHEMA_SQL);
    });

    const result = await auroraQuery(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1::text[])
       ORDER BY table_name`,
      [ALL_TABLE_NAMES]
    );

    return NextResponse.json({
      success: true,
      message: "Schema migrated successfully",
      tables: result.rows.map((r: { table_name: string }) => r.table_name),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[Aurora Migration] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await auroraQuery(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = ANY($1::text[])
       ORDER BY table_name`,
      [ALL_TABLE_NAMES]
    );
    const found = result.rows.map((r: { table_name: string }) => r.table_name);
    const missing = ALL_TABLE_NAMES.filter((t) => !found.includes(t));
    return NextResponse.json({ found, missing, ready: missing.length === 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
