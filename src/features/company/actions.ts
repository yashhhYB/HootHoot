"use server";

import { auroraQuery, withAuroraConnection } from "@/lib/db-aurora";
import { getSessionUser } from "@/lib/get-session";
import { nanoid } from "nanoid";
import type { CompanyTest, TestSession, TestAnalytics, QuestionConfig } from "@/types/arena";

// ── Guard helper — uses Simple Auth session ───────────────────
async function requireAuthUser() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) throw new Error("Unauthorized: Sign in required.");
  return { id: sessionUser.id, email: sessionUser.email, name: sessionUser.name };
}

// ── Ensure a company row exists for a user (upsert) ───────────
async function ensureCompany(userId: string, name?: string): Promise<string> {
  const existing = await auroraQuery(
    `SELECT id FROM companies WHERE user_id = $1`,
    [userId]
  );
  if (existing.rows.length > 0) return existing.rows[0].id as string;

  // Auto-create company row on first use
  const id = nanoid(24);
  await auroraQuery(
    `INSERT INTO companies (id, user_id, name, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())`,
    [id, userId, name ?? "My Company"]
  );
  return id;
}

// ── Test CRUD ─────────────────────────────────────────────────

export async function createCompanyTest(params: {
  title: string;
  description?: string;
  questionConfig: QuestionConfig[];
  totalQuestions: number;
  timeLimitMinutes: number;
  requireFullscreen: boolean;
  requireCamera: boolean;
  maxWarnings: number;
  allowTabSwitch: boolean;
  maxParticipants?: number;
  startsAt?: string;
  endsAt?: string;
}): Promise<{ test: CompanyTest | null; error: string | null }> {
  try {
    const user = await requireAuthUser();
    const companyId = await ensureCompany(user.id, user.name ?? undefined);

    // Generate unique invite code
    const inviteCode = nanoid(8).toUpperCase();
    const id = nanoid(24);

    const result = await auroraQuery(
      `INSERT INTO company_tests (
        id, company_id, title, description, question_config, total_questions,
        time_limit_minutes, require_fullscreen, require_camera, max_warnings,
        allow_tab_switch, status, invite_code, max_participants, starts_at, ends_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'draft',$12,$13,$14,$15)
       RETURNING *`,
      [
        id, companyId, params.title, params.description ?? null,
        JSON.stringify(params.questionConfig), params.totalQuestions,
        params.timeLimitMinutes, params.requireFullscreen, params.requireCamera,
        params.maxWarnings, params.allowTabSwitch, inviteCode,
        params.maxParticipants ?? null,
        params.startsAt ?? null, params.endsAt ?? null,
      ]
    );

    return { test: result.rows[0] as CompanyTest, error: null };
  } catch (e) {
    return { test: null, error: e instanceof Error ? e.message : "Failed to create test." };
  }
}

export async function getCompanyTests(userId?: string): Promise<CompanyTest[]> {
  try {
    const uid = userId ?? (await requireAuthUser()).id;
    const companyId = await ensureCompany(uid);
    const result = await auroraQuery(
      `SELECT * FROM company_tests WHERE company_id = $1 ORDER BY created_at DESC`,
      [companyId]
    );
    return result.rows as CompanyTest[];
  } catch {
    return [];
  }
}

export async function updateTestStatus(
  testId: string,
  status: "draft" | "active" | "closed"
): Promise<{ error: string | null }> {
  try {
    const user = await requireAuthUser();
    const companyId = await ensureCompany(user.id);
    await auroraQuery(
      `UPDATE company_tests SET status = $1 WHERE id = $2 AND company_id = $3`,
      [status, testId, companyId]
    );
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Update failed." };
  }
}

export async function deleteTest(testId: string): Promise<{ error: string | null }> {
  try {
    const user = await requireAuthUser();
    const companyId = await ensureCompany(user.id);
    await auroraQuery(
      `DELETE FROM company_tests WHERE id = $1 AND company_id = $2`,
      [testId, companyId]
    );
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Delete failed." };
  }
}

// ── Test Sessions & Analytics ─────────────────────────────────

export async function getTestSessions(testId: string): Promise<TestSession[]> {
  try {
    const user = await requireAuthUser();
    const companyId = await ensureCompany(user.id);
    // Verify ownership
    const owns = await auroraQuery(
      `SELECT 1 FROM company_tests WHERE id = $1 AND company_id = $2`,
      [testId, companyId]
    );
    if (owns.rows.length === 0) return [];

    const result = await auroraQuery(
      `SELECT ts.*, au.name as candidate_name, au.email as candidate_email
       FROM test_sessions ts
       JOIN arena_users au ON au.id = ts.user_id
       WHERE ts.test_id = $1
       ORDER BY ts.score DESC NULLS LAST, ts.time_taken_ms ASC NULLS LAST`,
      [testId]
    );
    return result.rows as TestSession[];
  } catch {
    return [];
  }
}

export async function getTestAnalytics(testId: string): Promise<TestAnalytics | null> {
  try {
    const user = await requireAuthUser();
    const companyId = await ensureCompany(user.id);
    const result = await auroraQuery(
      `SELECT * FROM test_analytics WHERE test_id = $1 AND company_id = $2`,
      [testId, companyId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0] as TestAnalytics;
  } catch {
    return null;
  }
}

export async function getAllTestsAnalytics(userId?: string): Promise<TestAnalytics[]> {
  try {
    const uid = userId ?? (await requireAuthUser()).id;
    const companyId = await ensureCompany(uid);
    const result = await auroraQuery(
      `SELECT * FROM test_analytics WHERE company_id = $1`,
      [companyId]
    );
    return result.rows as TestAnalytics[];
  } catch {
    return [];
  }
}

// ── Student: Join & take a test ───────────────────────────────

export async function joinTestByCode(inviteCode: string): Promise<{
  test: CompanyTest | null;
  error: string | null;
}> {
  try {
    const sessionUser = await requireAuthUser();

    const result = await auroraQuery(
      `SELECT * FROM company_tests WHERE invite_code = $1 AND status = 'active'`,
      [inviteCode.toUpperCase()]
    );
    if (result.rows.length === 0) {
      return { test: null, error: "Invalid code or test is not active." };
    }

    return { test: result.rows[0] as CompanyTest, error: null };
  } catch (e) {
    return { test: null, error: e instanceof Error ? e.message : "Failed to join." };
  }
}

export async function startTestSession(testId: string): Promise<{
  sessionId: string | null;
  error: string | null;
}> {
  try {
    const user = await requireAuthUser();

    const test = await auroraQuery(
      `SELECT total_questions FROM company_tests WHERE id = $1 AND status = 'active'`,
      [testId]
    );
    if (test.rows.length === 0) return { sessionId: null, error: "Test not available." };

    const id = nanoid(24);
    await auroraQuery(
      `INSERT INTO test_sessions (id, test_id, user_id, total_questions, status)
       VALUES ($1, $2, $3, $4, 'in_progress')
       ON CONFLICT (test_id, user_id) DO NOTHING`,
      [id, testId, user.id, test.rows[0].total_questions]
    );

    const existing = await auroraQuery(
      `SELECT id FROM test_sessions WHERE test_id = $1 AND user_id = $2`,
      [testId, user.id]
    );

    return { sessionId: existing.rows[0]?.id ?? null, error: null };
  } catch (e) {
    return { sessionId: null, error: e instanceof Error ? e.message : "Failed to start." };
  }
}

export async function submitTestSession(params: {
  sessionId: string;
  testId: string;
  score: number;
  timeTakenMs: number;
  questionLog: unknown[];
  warningsCount: number;
  status: "completed" | "disqualified";
}): Promise<{ error: string | null }> {
  try {
    const user = await requireAuthUser();

    await auroraQuery(
      `UPDATE test_sessions
       SET score = $1, time_taken_ms = $2, question_log = $3,
           warnings_count = $4, status = $5, completed_at = NOW()
       WHERE id = $6 AND user_id = $7`,
      [
        params.score,
        params.timeTakenMs,
        JSON.stringify(params.questionLog),
        params.warningsCount,
        params.status,
        params.sessionId,
        user.id,
      ]
    );
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Submit failed." };
  }
}
