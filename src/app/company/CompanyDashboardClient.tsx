"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Plus, ClipboardList, BarChart3, Trophy, Users, Clock, ChevronRight,
  Play, Pause, Archive, Trash2, Copy, Check, LogOut, Building2, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ArenaUser, CompanyTest, TestAnalytics } from "@/types/arena";
import { updateTestStatus, deleteTest } from "@/features/company/actions";
import { authClient } from "@/lib/auth-client";
import CreateTestWizard from "./CreateTestWizard";
import TestResultsView from "./TestResultsView";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Props {
  user: ArenaUser;
  tests: CompanyTest[];
  analytics: TestAnalytics[];
}

type View = "overview" | "create" | "results";

export default function CompanyDashboardClient({ user, tests, analytics }: Props) {
  const router = useRouter();
  const [view, setView] = useState<View>("overview");
  const [selectedTestId, setSelectedTestId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  function copyInviteCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  function handleStatusChange(testId: string, status: "draft" | "active" | "closed") {
    startTransition(async () => {
      const { error } = await updateTestStatus(testId, status);
      if (error) toast.error(error);
      else { toast.success(`Test ${status === "active" ? "activated" : status === "closed" ? "closed" : "reverted to draft"}.`); router.refresh(); }
    });
  }

  function handleDelete(testId: string) {
    if (!confirm("Delete this test? All sessions and results will be lost.")) return;
    startTransition(async () => {
      const { error } = await deleteTest(testId);
      if (error) toast.error(error);
      else { toast.success("Test deleted."); router.refresh(); }
    });
  }

  // Aggregate stats
  const totalTests = tests.length;
  const activeTests = tests.filter((t) => t.status === "active").length;
  const totalParticipants = analytics.reduce((s, a) => s + Number(a.total_participants), 0);
  const avgScore = analytics.length
    ? analytics.reduce((s, a) => s + (a.avg_score ? Number(a.avg_score) : 0), 0) / analytics.filter((a) => a.avg_score).length
    : null;

  // ── Create Test View ──────────────────────────────────────────
  if (view === "create") {
    return (
      <div className="min-h-screen bg-background pt-20">
        <CreateTestWizard
          onSuccess={() => { setView("overview"); router.refresh(); }}
          onCancel={() => setView("overview")}
        />
      </div>
    );
  }

  // ── Results View ──────────────────────────────────────────────
  if (view === "results" && selectedTestId) {
    const test = tests.find((t) => t.id === selectedTestId);
    if (!test) { setView("overview"); return null; }
    return (
      <div className="min-h-screen bg-background pt-20">
        <TestResultsView
          test={test}
          onBack={() => { setView("overview"); setSelectedTestId(null); }}
        />
      </div>
    );
  }

  // ── Overview Dashboard ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">

        {/* Page Header */}
        <div className="pt-8 pb-6 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground uppercase tracking-widest">Company Portal</span>
            </div>
            <h1 className="text-3xl font-bold font-heading text-foreground">Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome back, <span className="text-foreground">{user.name}</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setView("create")} className="h-10 px-5">
              <Plus className="w-4 h-4 mr-2" />
              Create Test
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-4 h-4 mr-1.5" />
              Sign Out
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden">
          {[
            { icon: ClipboardList, label: "Total Tests", value: totalTests, sub: `${activeTests} active` },
            { icon: Users, label: "Participants", value: totalParticipants, sub: "all time" },
            { icon: BarChart3, label: "Avg Score", value: avgScore != null ? `${avgScore.toFixed(1)}%` : "—", sub: "completed tests" },
            { icon: Trophy, label: "Active Tests", value: activeTests, sub: "accepting candidates" },
          ].map(({ icon: Icon, label, value, sub }) => (
            <div key={label} className="bg-card px-5 py-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground font-heading">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Tests list */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold font-heading">Your Tests</h2>
            {tests.length > 0 && (
              <span className="text-xs text-muted-foreground">{tests.length} test{tests.length !== 1 ? "s" : ""}</span>
            )}
          </div>

          {tests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-16 text-center">
              <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No tests yet</p>
              <p className="text-xs text-muted-foreground mb-4">Create your first assessment to start inviting candidates.</p>
              <Button onClick={() => setView("create")} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Create First Test
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="grid grid-cols-12 px-5 py-3 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-4">Test</div>
                <div className="col-span-2 text-center">Questions</div>
                <div className="col-span-1 text-center">Status</div>
                <div className="col-span-2 text-center">Participants</div>
                <div className="col-span-2 text-center">Invite Code</div>
                <div className="col-span-1"></div>
              </div>

              {tests.map((test) => {
                const testAnalytics = analytics.find((a) => a.test_id === test.id);
                return (
                  <div
                    key={test.id}
                    className="grid grid-cols-12 px-5 py-4 border-b border-border/50 last:border-0 items-center hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Test info */}
                    <div className="col-span-4">
                      <p className="text-sm font-medium text-foreground truncate">{test.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {test.time_limit_minutes}min
                        {test.require_camera && <span className="text-orange-400">• Camera</span>}
                        {test.require_fullscreen && <span>• Fullscreen</span>}
                      </p>
                    </div>

                    {/* Questions */}
                    <div className="col-span-2 text-center">
                      <span className="text-sm font-medium">{test.total_questions}</span>
                    </div>

                    {/* Status */}
                    <div className="col-span-1 text-center">
                      <StatusBadge status={test.status} />
                    </div>

                    {/* Participants */}
                    <div className="col-span-2 text-center">
                      <span className="text-sm text-muted-foreground">
                        {testAnalytics ? Number(testAnalytics.total_participants) : 0}
                      </span>
                    </div>

                    {/* Invite code */}
                    <div className="col-span-2 text-center">
                      {test.invite_code ? (
                        <button
                          onClick={() => copyInviteCode(test.invite_code!)}
                          className="inline-flex items-center gap-1.5 font-mono text-xs bg-muted hover:bg-muted/80 px-2.5 py-1.5 rounded-md transition-colors"
                        >
                          {copiedCode === test.invite_code ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3 text-muted-foreground" />
                          )}
                          {test.invite_code}
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="col-span-1 flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => { setSelectedTestId(test.id); setView("results"); }}
                        title="View results"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>

                      {test.status === "draft" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                          onClick={() => handleStatusChange(test.id, "active")}
                          disabled={isPending}
                          title="Activate test"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      {test.status === "active" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                          onClick={() => handleStatusChange(test.id, "closed")}
                          disabled={isPending}
                          title="Close test"
                        >
                          <Pause className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      {test.status === "closed" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground"
                          onClick={() => handleStatusChange(test.id, "draft")}
                          disabled={isPending}
                          title="Reopen as draft"
                        >
                          <Archive className="w-3.5 h-3.5" />
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500/60 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => handleDelete(test.id)}
                        disabled={isPending}
                        title="Delete test"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick join panel for students */}
        <div className="mt-8 rounded-xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold font-heading mb-2 flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            Share with Candidates
          </h3>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Candidates join tests at{" "}
            <span className="font-mono text-foreground bg-muted px-1.5 py-0.5 rounded">
              {typeof window !== "undefined" ? window.location.origin : ""}/company/join
            </span>{" "}
            using the invite code from any active test above.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const origin = typeof window !== "undefined" ? window.location.origin : "";
              navigator.clipboard.writeText(`${origin}/company/join`);
              toast.success("Join link copied!");
            }}
          >
            <Copy className="w-3.5 h-3.5 mr-1.5" />
            Copy Join Link
          </Button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: CompanyTest["status"] }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs px-2 py-0.5",
        status === "active" && "border-emerald-500/40 text-emerald-400 bg-emerald-500/5",
        status === "draft" && "border-border text-muted-foreground",
        status === "closed" && "border-zinc-500/40 text-zinc-500"
      )}
    >
      {status}
    </Badge>
  );
}
