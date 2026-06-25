import { NextResponse } from "next/server";
import { auroraPool } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const t0 = Date.now();

  try {
    const client = await auroraPool.connect();

    // Basic connection info
    const info = await client.query<{
      db: string;
      usr: string;
      version: string;
      server_time: string;
    }>(`
      SELECT
        current_database()                        AS db,
        current_user                              AS usr,
        version()                                 AS version,
        NOW()::TEXT                               AS server_time
    `);

    // Table list with row counts
    const tables = await client.query<{
      table_name: string;
      row_count: string;
    }>(`
      SELECT
        t.table_name,
        (xpath('/row/c/text()',
          query_to_xml(format('SELECT count(*) AS c FROM %I', t.table_name), false, true, '')
        ))[1]::text AS row_count
      FROM information_schema.tables t
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name
    `);

    // Index count
    const indexes = await client.query<{ count: string }>(`
      SELECT count(*) AS count
      FROM pg_indexes
      WHERE schemaname = 'public'
    `);

    // DB size
    const dbSize = await client.query<{ size: string }>(`
      SELECT pg_size_pretty(pg_database_size(current_database())) AS size
    `);

    client.release();

    const row = info.rows[0];
    const pgVersion = row.version.match(/PostgreSQL ([\d.]+)/)?.[1] ?? row.version;
    const latencyMs = Date.now() - t0;

    return NextResponse.json({
      connected: true,
      backend: "AWS Aurora PostgreSQL",
      auth: "IAM (AWS RDS Signer + OIDC)",
      cluster: process.env.AWS_APG_PGHOST ?? "aurora",
      region: process.env.AWS_APG_AWS_REGION ?? "us-east-1",
      accountId: process.env.AWS_APG_AWS_ACCOUNT_ID ?? null,
      resourceArn: process.env.AWS_APG_AWS_RESOURCE_ARN ?? null,
      database: row.db,
      user: row.usr,
      pgVersion,
      serverTime: row.server_time,
      dbSize: dbSize.rows[0].size,
      latencyMs,
      tableCount: tables.rows.length,
      indexCount: parseInt(indexes.rows[0].count),
      tables: tables.rows.map((r) => ({
        name: r.table_name,
        rows: parseInt(r.row_count ?? "0"),
      })),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        connected: false,
        backend: "AWS Aurora PostgreSQL",
        auth: "IAM (AWS RDS Signer + OIDC)",
        cluster: process.env.AWS_APG_PGHOST ?? "aurora",
        region: process.env.AWS_APG_AWS_REGION ?? "us-east-1",
        error: msg,
        latencyMs: Date.now() - t0,
      },
      { status: 503 }
    );
  }
}
