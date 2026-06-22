// ── Arena User ────────────────────────────────────────────────
export interface ArenaUser {
  id: string;
  email: string;
  name: string | null;
  role: "student" | "company";
  avatar_url: string | null;
  created_at: string;
}

export interface ArenaSession {
  id: string;
  user_id: string;
  expires_at: string;
}

// ── Company ───────────────────────────────────────────────────
export interface Company {
  id: string;
  user_id: string;
  name: string;
  logo_url: string | null;
  industry: string | null;
  website: string | null;
  created_at: string;
}

// ── Practice Arena ────────────────────────────────────────────
export interface PracticeAttempt {
  id: string;
  user_id: string;
  score: number;
  total_questions: number;
  time_taken_ms: number;
  difficulty: "easy" | "medium" | "hard" | "mixed";
  question_log: QuestionLogEntry[];
  warnings_count: number;
  is_strict_mode: boolean;
  created_at: string;
}

export interface QuestionLogEntry {
  question_id: string;
  game_slug: string;
  difficulty: number;
  time_taken_ms: number;
  is_correct: boolean;
  selected_answer: string | null;
}

// ── Arena Leaderboard ─────────────────────────────────────────
export interface ArenaLeaderboardEntry {
  rank: number;
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  score: number;
  time_taken_ms: number;
  created_at: string;
}

// ── Company Test ──────────────────────────────────────────────
export interface QuestionConfig {
  game_slug: string;
  count: number;
  difficulty: 1 | 2 | 3 | 4 | 5 | "mixed";
}

export interface CompanyTest {
  id: string;
  company_id: string;
  title: string;
  description: string | null;
  question_config: QuestionConfig[];
  total_questions: number;
  time_limit_minutes: number;
  require_fullscreen: boolean;
  require_camera: boolean;
  max_warnings: number;
  allow_tab_switch: boolean;
  status: "draft" | "active" | "closed";
  invite_code: string | null;
  max_participants: number | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
}

// ── Test Session ──────────────────────────────────────────────
export type TestSessionStatus = "in_progress" | "completed" | "disqualified" | "abandoned";

export interface TestSession {
  id: string;
  test_id: string;
  user_id: string;
  score: number | null;
  total_questions: number;
  time_taken_ms: number | null;
  warnings_count: number;
  status: TestSessionStatus;
  question_log: QuestionLogEntry[];
  started_at: string;
  completed_at: string | null;
}

// ── Warning ───────────────────────────────────────────────────
export type WarningReason =
  | "tab_switch"
  | "no_face"
  | "multiple_faces"
  | "minimize"
  | "fullscreen_exit";

export interface WarningLog {
  id: number;
  session_id: string;
  session_type: "practice" | "test";
  reason: WarningReason;
  warning_number: number;
  s3_image_url: string | null;
  created_at: string;
}

// ── Test Analytics ────────────────────────────────────────────
export interface TestAnalytics {
  test_id: string;
  company_id: string;
  title: string;
  total_participants: number;
  completed_count: number;
  disqualified_count: number;
  avg_score: number | null;
  top_score: number | null;
  min_score: number | null;
  avg_time_seconds: number | null;
  pass_count: number;
}

// ── Arena Question ────────────────────────────────────────────
export interface ArenaQuestion {
  id: number;
  game_slug: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  category: string;
  payload: Record<string, unknown>;
  is_active: boolean;
}

// ── Game slugs ────────────────────────────────────────────────
export const GAME_SLUGS = [
  "switch-challenge",
  "digit-challenge",
  "deductive-challenge",
  "motion-challenge",
  "grid-challenge",
  "inductive-challenge",
] as const;

export type GameSlug = (typeof GAME_SLUGS)[number];
