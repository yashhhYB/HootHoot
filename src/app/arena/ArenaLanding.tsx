"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Zap, Trophy, Clock, Target, ChevronRight, Shield } from "lucide-react";
import type { ArenaUser, ArenaLeaderboardEntry } from "@/types/arena";
import ArenaGame from "./ArenaGame";
import { cn } from "@/lib/utils";

interface Props {
  user: ArenaUser | null;
  leaderboard: ArenaLeaderboardEntry[];
}

function formatTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function getRankBadge(rank: number) {
  if (rank === 1) return { label: "#1", className: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" };
  if (rank === 2) return { label: "#2", className: "bg-zinc-400/20 text-zinc-300 border-zinc-400/30" };
  if (rank === 3) return { label: "#3", className: "bg-amber-700/20 text-amber-600 border-amber-700/30" };
  return { label: `#${rank}`, className: "bg-white/5 text-muted-foreground border-white/10" };
}

export default function ArenaLanding({ user, leaderboard }: Props) {
  const [playing, setPlaying] = useState(false);
  const [strictMode, setStrictMode] = useState(false);

  if (playing) {
    return (
      <ArenaGame
        user={user}
        strictMode={strictMode}
        onExit={() => setPlaying(false)}
      />
    );
  }

  const stats = [
    { icon: Target, label: "Questions", value: "10" },
    { icon: Clock, label: "Progressive Time", value: "30→12s" },
    { icon: Zap, label: "Difficulty", value: "Rising" },
    { icon: Trophy, label: "Live Leaderboard", value: "Real-time" },
  ];

  return (
    <div className="min-h-screen bg-background pt-20 pb-16">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Hero */}
        <div className="pt-12 pb-10 border-b border-border">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="text-xs border-purple-500/40 text-purple-400">
                  BETA
                </Badge>
                <span className="text-xs text-muted-foreground">Competitive Practice Mode</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-bold text-foreground font-heading tracking-tight">
                Practice Arena
              </h1>
              <p className="mt-3 text-muted-foreground max-w-xl leading-relaxed">
                10 questions. Progressive difficulty. Every second counts.
                Prove your aptitude against a global leaderboard.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              {user ? (
                <>
                  <Button
                    onClick={() => { setStrictMode(false); setPlaying(true); }}
                    size="lg"
                    className="h-12 px-8 font-semibold"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Start Challenge
                  </Button>
                  <Button
                    onClick={() => { setStrictMode(true); setPlaying(true); }}
                    size="lg"
                    variant="outline"
                    className="h-12 px-8 font-semibold border-orange-500/40 text-orange-400 hover:bg-orange-500/10"
                  >
                    <Shield className="w-4 h-4 mr-2" />
                    Strict Mode
                  </Button>
                </>
              ) : (
                <Button asChild size="lg" className="h-12 px-8 font-semibold">
                  <Link href="/arena/auth?redirect=/arena">
                    Sign in to Compete
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Link>
                </Button>
              )}
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-xl overflow-hidden">
            {stats.map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-card px-5 py-4 flex items-center gap-3">
                <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-semibold text-foreground">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold font-heading flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Global Leaderboard
            </h2>
            <span className="text-xs text-muted-foreground">Best score per player</span>
          </div>

          {leaderboard.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Trophy className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No attempts yet. Be the first on the board!</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 px-4 py-3 bg-muted/50 border-b border-border text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <div className="col-span-1">Rank</div>
                <div className="col-span-5">Player</div>
                <div className="col-span-2 text-center">Score</div>
                <div className="col-span-2 text-center">Time</div>
                <div className="col-span-2 text-right">Date</div>
              </div>

              {leaderboard.map((entry) => {
                const badge = getRankBadge(entry.rank);
                const isCurrentUser = user?.id === entry.user_id;
                return (
                  <div
                    key={entry.user_id}
                    className={cn(
                      "grid grid-cols-12 px-4 py-3.5 border-b border-border/50 last:border-0 items-center",
                      "transition-colors hover:bg-white/[0.02]",
                      isCurrentUser && "bg-purple-500/5 border-l-2 border-l-purple-500"
                    )}
                  >
                    <div className="col-span-1">
                      <Badge
                        variant="outline"
                        className={cn("text-xs font-mono px-1.5 py-0.5", badge.className)}
                      >
                        {badge.label}
                      </Badge>
                    </div>

                    <div className="col-span-5 flex items-center gap-3">
                      <Avatar className="w-7 h-7 shrink-0">
                        <AvatarFallback className="text-xs bg-muted">
                          {entry.name?.[0]?.toUpperCase() ?? "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn("text-sm font-medium truncate", isCurrentUser && "text-purple-300")}>
                        {entry.name ?? "Anonymous"}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs text-muted-foreground">(you)</span>
                        )}
                      </span>
                    </div>

                    <div className="col-span-2 text-center">
                      <span className="text-sm font-bold text-foreground">
                        {entry.score}
                        <span className="text-xs text-muted-foreground font-normal">/10</span>
                      </span>
                    </div>

                    <div className="col-span-2 text-center">
                      <span className="text-sm text-muted-foreground font-mono">
                        {formatTime(entry.time_taken_ms)}
                      </span>
                    </div>

                    <div className="col-span-2 text-right">
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* How it works */}
        <div className="mt-12 grid sm:grid-cols-3 gap-4">
          {[
            {
              step: "01",
              title: "Answer 10 Questions",
              desc: "Pulled from our Switch, Deductive, and Sequence game banks with increasing difficulty.",
            },
            {
              step: "02",
              title: "Beat the Clock",
              desc: "Each question has a countdown timer. Easy questions give you 30s, hardest give you 12s.",
            },
            {
              step: "03",
              title: "Claim Your Rank",
              desc: "Your score + completion time determines your leaderboard position. Fastest wins ties.",
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="rounded-xl border border-border bg-card p-5">
              <span className="text-4xl font-black text-muted-foreground/20 font-heading">{step}</span>
              <h3 className="text-sm font-semibold text-foreground mt-1 mb-1.5">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
