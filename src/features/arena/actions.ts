"use server";

import { auroraQuery } from "@/lib/db-aurora";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { nanoid } from "nanoid";
import type {
  ArenaLeaderboardEntry,
  QuestionLogEntry,
  PracticeAttempt,
} from "@/types/arena";

// ── Practice Arena ────────────────────────────────────────────

export async function submitPracticeAttempt(params: {
  score: number;
  totalQuestions: number;
  timeTakenMs: number;
  difficulty: "easy" | "medium" | "hard" | "mixed";
  questionLog: QuestionLogEntry[];
  warningsCount: number;
  isStrictMode: boolean;
}): Promise<{ attempt: PracticeAttempt | null; error: string | null }> {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  if (!session?.user) return { attempt: null, error: "You must be signed in to save your attempt." };
  const userId = session.user.id;

  const id = nanoid(24);
  const result = await auroraQuery(
    `INSERT INTO practice_attempts
       (id, user_id, score, total_questions, time_taken_ms, difficulty, question_log, warnings_count, is_strict_mode)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      id,
      userId,
      params.score,
      params.totalQuestions,
      params.timeTakenMs,
      params.difficulty,
      JSON.stringify(params.questionLog),
      params.warningsCount,
      params.isStrictMode,
    ]
  );

  return { attempt: result.rows[0] as PracticeAttempt, error: null };
}

export async function getPracticeLeaderboard(limit = 50): Promise<ArenaLeaderboardEntry[]> {
  // Best attempt per user: highest score, then fastest time
  // Joins the Better Auth 'user' table (same DB) for the display name
  const result = await auroraQuery(
    `SELECT DISTINCT ON (pa.user_id)
       pa.id,
       pa.user_id,
       u.name,
       u.image AS avatar_url,
       pa.score,
       pa.time_taken_ms,
       pa.created_at
     FROM practice_attempts pa
     JOIN "user" u ON u.id = pa.user_id
     ORDER BY pa.user_id, pa.score DESC, pa.time_taken_ms ASC, pa.created_at DESC
     LIMIT $1`,
    [limit]
  );

  // Re-sort by score desc, time asc after deduplication
  const rows = result.rows as Array<{
    id: string;
    user_id: string;
    name: string | null;
    avatar_url: string | null;
    score: number;
    time_taken_ms: number;
    created_at: string;
  }>;

  rows.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.time_taken_ms - b.time_taken_ms;
  });

  return rows.map((r, i) => ({
    rank: i + 1,
    user_id: r.user_id,
    name: r.name,
    avatar_url: r.avatar_url,
    score: r.score,
    time_taken_ms: r.time_taken_ms,
    created_at: r.created_at,
  }));
}

export async function getMyPracticeHistory(limit = 10): Promise<PracticeAttempt[]> {
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);
  if (!session?.user) return [];

  const result = await auroraQuery(
    `SELECT * FROM practice_attempts
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [session.user.id, limit]
  );

  return result.rows as PracticeAttempt[];
}

// ── Warning logging ───────────────────────────────────────────
export async function logWarning(params: {
  sessionId: string;
  sessionType: "practice" | "test";
  reason: string;
  warningNumber: number;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await auroraQuery(
    `INSERT INTO warning_logs (session_id, session_type, reason, warning_number, metadata)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      params.sessionId,
      params.sessionType,
      params.reason,
      params.warningNumber,
      JSON.stringify(params.metadata ?? {}),
    ]
  );
}
