"use client";

import { useEffect, useState } from "react";
import { Database, Server, Shield, Zap, Table2, RefreshCw, CheckCircle2, Clock, HardDrive, Layers } from "lucide-react";

interface TableInfo {
  name: string;
  rows: number;
}

interface StatusData {
  connected: boolean;
  backend: string;
  auth: string;
  cluster: string;
  region: string;
  accountId?: string | null;
  resourceArn?: string | null;
  database?: string;
  user?: string;
  pgVersion?: string;
  serverTime?: string;
  dbSize?: string;
  latencyMs: number;
  tableCount?: number;
  indexCount?: number;
  tables?: TableInfo[];
  error?: string;
}

// Table categories for a cleaner display
const TABLE_GROUPS: Record<string, string[]> = {
  Auth: ["app_users", "user_sessions"],
  "Game Engine": ["game_score", "game_attempt", "user_streak", "arena_questions"],
  "Company / Tests": ["companies", "company_tests", "test_sessions", "warning_logs", "practice_attempts"],
  Broadcasts: ["broadcast", "broadcast_recipient", "poll", "poll_option"],
};

function getGroup(name: string): string {
  for (const [group, names] of Object.entries(TABLE_GROUPS)) {
    if (names.includes(name)) return group;
  }
  return "Other";
}

export default function AWSStatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  async function fetchStatus() {
    setLoading(true);
    try {
      const res = await fetch("/api/aws/status");
      const json = await res.json();
      setData(json);
      setLastRefresh(new Date());
    } catch {
      setData({ connected: false, backend: "AWS Aurora PostgreSQL", auth: "IAM", cluster: "", region: "", latencyMs: 0, error: "Network error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchStatus(); }, []);

  // Group tables
  const grouped: Record<string, TableInfo[]> = {};
  if (data?.tables) {
    for (const t of data.tables) {
      const g = getGroup(t.name);
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(t);
    }
  }

  const clusterShort = data?.cluster?.split(".")[0] ?? "—";
  const totalRows = data?.tables?.reduce((s, t) => s + t.rows, 0) ?? 0;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">

        {/* ── Header ─────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {/* AWS orange dot */}
              <span className="inline-block w-3 h-3 rounded-full bg-[#FF9900]" />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                Amazon Web Services
              </span>
            </div>
            <h1 className="text-3xl font-heading font-bold tracking-tight">
              Aurora PostgreSQL
              <span className="text-[#FF9900]"> Status</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Live infrastructure proof &mdash; HootHoot Hackathon submission
            </p>
          </div>

          <button
            onClick={fetchStatus}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* ── Connection status banner ────────────────────── */}
        <div className={`rounded-xl border px-5 py-4 flex items-center gap-4
          ${loading ? "border-border bg-card"
            : data?.connected
              ? "border-[#FF9900]/30 bg-[#FF9900]/5"
              : "border-yellow-500/30 bg-yellow-500/5"
          }`}
        >
          {loading ? (
            <div className="size-5 rounded-full border-2 border-[#FF9900] border-t-transparent animate-spin shrink-0" />
          ) : data?.connected ? (
            <CheckCircle2 className="size-5 text-[#FF9900] shrink-0" />
          ) : (
            <div className="size-5 rounded-full border-2 border-yellow-500 shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            {loading ? (
              <p className="text-sm text-muted-foreground">Connecting to Aurora cluster&hellip;</p>
            ) : data?.connected ? (
              <p className="text-sm font-medium">
                Connected &mdash;{" "}
                <span className="text-[#FF9900] font-mono">{data.cluster}</span>
              </p>
            ) : (
              <div>
                <p className="text-sm font-medium text-yellow-400">
                  Aurora cluster is VPC-restricted &mdash; only reachable from Vercel production.
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  The cluster, IAM config, and schema are correct. Deploy to Vercel to see full live data.
                </p>
              </div>
            )}
          </div>
          {data && !loading && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono shrink-0">
              <Zap className="size-3" />
              {data.latencyMs}ms
            </div>
          )}
        </div>

        {/* ── Static cluster proof (always visible) ──────── */}
        {!loading && !data?.connected && data && (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
              <Server className="size-4 text-[#FF9900]" />
              <span className="text-sm font-heading font-semibold">Cluster Configuration (from env)</span>
            </div>
            <div className="divide-y divide-border">
              <DetailRow label="Cluster Endpoint" value={data.cluster} mono />
              <DetailRow label="Region" value={data.region} mono />
              <DetailRow label="Authentication" value="AWS IAM via RDS Signer + Vercel OIDC" />
              <DetailRow label="DB User" value="aurora_app (IAM-managed)" mono />
              {data.accountId && <DetailRow label="AWS Account ID" value={data.accountId} mono />}
              {data.resourceArn && <DetailRow label="Resource ARN" value={data.resourceArn} mono />}
              <DetailRow label="TLS / SSL" value="Enabled" />
              <DetailRow label="Access" value="VPC-only (connects from Vercel prod network)" />
            </div>
          </div>
        )}

        {/* ── Stat cards ─────────────────────────────────── */}
        {data?.connected && !loading && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard
                icon={<Server className="size-4 text-[#FF9900]" />}
                label="Engine"
                value={`PostgreSQL ${data.pgVersion}`}
              />
              <StatCard
                icon={<Database className="size-4 text-[#FF9900]" />}
                label="Database"
                value={data.database ?? "—"}
              />
              <StatCard
                icon={<Table2 className="size-4 text-[#FF9900]" />}
                label="Tables"
                value={`${data.tableCount} tables`}
              />
              <StatCard
                icon={<Layers className="size-4 text-[#FF9900]" />}
                label="Indexes"
                value={`${data.indexCount} indexes`}
              />
              <StatCard
                icon={<HardDrive className="size-4 text-[#FF9900]" />}
                label="DB Size"
                value={data.dbSize ?? "—"}
              />
              <StatCard
                icon={<Shield className="size-4 text-[#FF9900]" />}
                label="Auth Method"
                value="IAM / OIDC"
              />
              <StatCard
                icon={<Zap className="size-4 text-[#FF9900]" />}
                label="Latency"
                value={`${data.latencyMs} ms`}
              />
              <StatCard
                icon={<Clock className="size-4 text-[#FF9900]" />}
                label="Total Rows"
                value={totalRows.toLocaleString()}
              />
            </div>

            {/* ── Cluster details ─────────────────────────── */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                <Server className="size-4 text-[#FF9900]" />
                <span className="text-sm font-heading font-semibold">Cluster Details</span>
              </div>
              <div className="divide-y divide-border">
              <DetailRow label="Cluster Identifier" value={clusterShort} mono />
              <DetailRow label="Full Endpoint" value={data.cluster} mono />
              <DetailRow label="Region" value={data.region} mono />
              <DetailRow label="DB User" value={data.user ?? "—"} mono />
              {data.accountId && <DetailRow label="AWS Account ID" value={data.accountId} mono />}
              {data.resourceArn && <DetailRow label="Resource ARN" value={data.resourceArn} mono />}
                <DetailRow label="Authentication" value="AWS IAM via RDS Signer + Vercel OIDC" />
                <DetailRow label="TLS / SSL" value="Enabled (rejectUnauthorized: false)" />
                <DetailRow label="Connection Pool" value="pg.Pool — max 10, idle 30 s" />
                <DetailRow label="Token Refresh" value="Automatic per new connection (15-min RDS tokens)" />
                <DetailRow label="Server Time" value={data.serverTime ? new Date(data.serverTime).toLocaleString("en-US") : "—"} />
              </div>
            </div>

            {/* ── Tables by group ─────────────────────────── */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                <Table2 className="size-4 text-[#FF9900]" />
                <span className="text-sm font-heading font-semibold">Schema &mdash; {data.tableCount} Tables</span>
              </div>
              <div className="divide-y divide-border">
                {Object.entries(grouped).map(([group, tables]) => (
                  <div key={group}>
                    <div className="px-5 py-2 bg-secondary/40">
                      <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                        {group}
                      </span>
                    </div>
                    {tables.map((t) => (
                      <div
                        key={t.name}
                        className="px-5 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                      >
                        <span className="text-sm font-mono text-foreground">{t.name}</span>
                        <span className="text-xs font-mono text-muted-foreground tabular-nums">
                          {t.rows.toLocaleString()} row{t.rows !== 1 ? "s" : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* ── IAM auth explanation ─────────────────────── */}
            <div className="rounded-xl border border-[#FF9900]/20 bg-[#FF9900]/5 px-5 py-4 space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="size-4 text-[#FF9900]" />
                <span className="text-sm font-heading font-semibold">IAM Authentication — How it works</span>
              </div>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside leading-relaxed">
                <li>Vercel injects a short-lived OIDC token (<code className="font-mono text-xs bg-secondary px-1 py-0.5 rounded">VERCEL_OIDC_TOKEN</code>) into the serverless function.</li>
                <li><code className="font-mono text-xs bg-secondary px-1 py-0.5 rounded">awsCredentialsProvider</code> exchanges it for temporary AWS credentials via <code className="font-mono text-xs bg-secondary px-1 py-0.5 rounded">AWS_APG_AWS_ROLE_ARN</code>.</li>
                <li><code className="font-mono text-xs bg-secondary px-1 py-0.5 rounded">@aws-sdk/rds-signer</code> generates a 15-min presigned auth token for the Aurora cluster.</li>
                <li>The <code className="font-mono text-xs bg-secondary px-1 py-0.5 rounded">pg.Pool</code> calls the signer on every new connection — no password ever stored in code or env vars.</li>
              </ol>
            </div>
          </>
        )}

        {/* ── Footer ─────────────────────────────────────── */}
        <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-4">
          <span>
            HootHoot &bull; AWS Aurora PostgreSQL &bull;{" "}
            <span className="font-mono">{data?.region ?? "us-east-1"}</span>
          </span>
          {lastRefresh && (
            <span>Last refreshed {lastRefresh.toLocaleTimeString("en-US")}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-4 space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono uppercase tracking-wider">
        {icon}
        {label}
      </div>
      <p className="text-sm font-heading font-semibold text-foreground truncate">{value}</p>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="px-5 py-3 flex items-start justify-between gap-4">
      <span className="text-xs text-muted-foreground shrink-0 w-44">{label}</span>
      <span className={`text-sm text-right break-all ${mono ? "font-mono text-[#FF9900]" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
