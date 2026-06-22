-- ============================================================
-- HootHoot Competitive Arena + Company Testing Platform
-- Aurora PostgreSQL Schema — Migration 001
-- ============================================================

-- ── Role enum for users ───────────────────────────────────────
-- student  : regular player / test-taker
-- company  : HR / recruiter who creates and manages tests
CREATE TABLE IF NOT EXISTS arena_users (
  id            VARCHAR(36)   PRIMARY KEY,
  email         VARCHAR(255)  NOT NULL UNIQUE,
  name          VARCHAR(255),
  password_hash TEXT          NOT NULL,
  role          VARCHAR(20)   NOT NULL DEFAULT 'student'
                              CHECK (role IN ('student', 'company')),
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arena_users_email  ON arena_users(email);
CREATE INDEX IF NOT EXISTS idx_arena_users_role   ON arena_users(role);

-- ── Sessions (JWT-free, server-side sessions) ─────────────────
CREATE TABLE IF NOT EXISTS arena_sessions (
  id         VARCHAR(64)  PRIMARY KEY,
  user_id    VARCHAR(36)  NOT NULL REFERENCES arena_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ  NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arena_sessions_user_id    ON arena_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_arena_sessions_expires_at ON arena_sessions(expires_at);

-- ── Companies ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id          VARCHAR(36)   PRIMARY KEY,
  user_id     VARCHAR(36)   NOT NULL UNIQUE REFERENCES arena_users(id) ON DELETE CASCADE,
  name        VARCHAR(255)  NOT NULL,
  logo_url    TEXT,
  industry    VARCHAR(100),
  website     VARCHAR(255),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);

-- ── Practice Arena Attempts ───────────────────────────────────
-- One row per completed practice session (10 questions)
CREATE TABLE IF NOT EXISTS practice_attempts (
  id              VARCHAR(36)  PRIMARY KEY,
  user_id         VARCHAR(36)  NOT NULL REFERENCES arena_users(id) ON DELETE CASCADE,
  score           INT          NOT NULL CHECK (score >= 0 AND score <= 10),
  total_questions INT          NOT NULL DEFAULT 10,
  time_taken_ms   INT          NOT NULL CHECK (time_taken_ms >= 0),
  -- Difficulty spread: 'easy' | 'medium' | 'hard' | 'mixed'
  difficulty      VARCHAR(20)  NOT NULL DEFAULT 'mixed',
  -- Per-question breakdown stored as JSONB for flexible querying
  question_log    JSONB        NOT NULL DEFAULT '[]',
  warnings_count  INT          NOT NULL DEFAULT 0,
  is_strict_mode  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_practice_attempts_user_id    ON practice_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_score      ON practice_attempts(score DESC);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_created_at ON practice_attempts(created_at DESC);
-- Leaderboard: best score, then fastest time
CREATE INDEX IF NOT EXISTS idx_practice_leaderboard ON practice_attempts(score DESC, time_taken_ms ASC);

-- ── Company Tests ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_tests (
  id                  VARCHAR(36)   PRIMARY KEY,
  company_id          VARCHAR(36)   NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title               VARCHAR(255)  NOT NULL,
  description         TEXT,
  -- Question configuration: array of { gameSlug, count, difficulty }
  question_config     JSONB         NOT NULL DEFAULT '[]',
  total_questions     INT           NOT NULL CHECK (total_questions BETWEEN 1 AND 30),
  time_limit_minutes  INT           NOT NULL DEFAULT 30 CHECK (time_limit_minutes BETWEEN 5 AND 180),
  -- Proctoring settings
  require_fullscreen  BOOLEAN       NOT NULL DEFAULT TRUE,
  require_camera      BOOLEAN       NOT NULL DEFAULT FALSE,
  max_warnings        INT           NOT NULL DEFAULT 3,
  allow_tab_switch    BOOLEAN       NOT NULL DEFAULT FALSE,
  -- Status: 'draft' | 'active' | 'closed'
  status              VARCHAR(20)   NOT NULL DEFAULT 'draft'
                                    CHECK (status IN ('draft', 'active', 'closed')),
  -- Invite code for students to join
  invite_code         VARCHAR(12)   UNIQUE,
  max_participants    INT,
  -- Scheduling
  starts_at           TIMESTAMPTZ,
  ends_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_tests_company_id   ON company_tests(company_id);
CREATE INDEX IF NOT EXISTS idx_company_tests_status       ON company_tests(status);
CREATE INDEX IF NOT EXISTS idx_company_tests_invite_code  ON company_tests(invite_code) WHERE invite_code IS NOT NULL;

-- ── Test Sessions (individual student attempts at a company test) ──
CREATE TABLE IF NOT EXISTS test_sessions (
  id                VARCHAR(36)  PRIMARY KEY,
  test_id           VARCHAR(36)  NOT NULL REFERENCES company_tests(id) ON DELETE CASCADE,
  user_id           VARCHAR(36)  NOT NULL REFERENCES arena_users(id) ON DELETE CASCADE,
  -- score null until completed
  score             INT          CHECK (score >= 0),
  total_questions   INT          NOT NULL,
  time_taken_ms     INT          CHECK (time_taken_ms >= 0),
  warnings_count    INT          NOT NULL DEFAULT 0,
  -- status: 'in_progress' | 'completed' | 'disqualified' | 'abandoned'
  status            VARCHAR(20)  NOT NULL DEFAULT 'in_progress'
                                  CHECK (status IN ('in_progress', 'completed', 'disqualified', 'abandoned')),
  -- Detailed question-by-question log
  question_log      JSONB        NOT NULL DEFAULT '[]',
  -- Proctoring snapshots metadata
  proctor_log       JSONB        NOT NULL DEFAULT '[]',
  started_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  UNIQUE(test_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_test_sessions_test_id   ON test_sessions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_id   ON test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_status    ON test_sessions(status);
-- Leaderboard per test
CREATE INDEX IF NOT EXISTS idx_test_sessions_leaderboard ON test_sessions(test_id, score DESC, time_taken_ms ASC)
  WHERE status = 'completed';

-- ── Warning Logs ──────────────────────────────────────────────
-- Fine-grained proctoring event log
CREATE TABLE IF NOT EXISTS warning_logs (
  id             SERIAL       PRIMARY KEY,
  session_id     VARCHAR(36)  NOT NULL,
  session_type   VARCHAR(20)  NOT NULL CHECK (session_type IN ('practice', 'test')),
  -- reason: 'tab_switch' | 'no_face' | 'multiple_faces' | 'minimize' | 'fullscreen_exit'
  reason         VARCHAR(50)  NOT NULL,
  warning_number INT          NOT NULL,
  s3_image_url   TEXT,
  metadata       JSONB        NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_warning_logs_session ON warning_logs(session_id, session_type);
CREATE INDEX IF NOT EXISTS idx_warning_logs_created ON warning_logs(created_at DESC);

-- ── Arena Questions Bank ──────────────────────────────────────
-- Canonical question records sourced from game logic
-- gameSlug maps to existing game routes (switch-challenge, digit-challenge, etc.)
CREATE TABLE IF NOT EXISTS arena_questions (
  id          SERIAL        PRIMARY KEY,
  game_slug   VARCHAR(100)  NOT NULL,
  difficulty  INT           NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  category    VARCHAR(50)   NOT NULL,
  -- Full question payload (game-specific, stored as JSONB for flexibility)
  payload     JSONB         NOT NULL,
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arena_questions_game_slug   ON arena_questions(game_slug);
CREATE INDEX IF NOT EXISTS idx_arena_questions_difficulty  ON arena_questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_arena_questions_active      ON arena_questions(is_active) WHERE is_active = TRUE;
-- For random shuffle + difficulty filter (used in arena question selection)
CREATE INDEX IF NOT EXISTS idx_arena_questions_slug_diff   ON arena_questions(game_slug, difficulty) WHERE is_active = TRUE;

-- ── Keep updated_at fresh automatically ─────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_arena_users_updated_at
  BEFORE UPDATE ON arena_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_company_tests_updated_at
  BEFORE UPDATE ON company_tests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ── Composite analytics view ──────────────────────────────────
-- Pre-built view for HR dashboards (avoids expensive GROUP BY every request)
CREATE OR REPLACE VIEW test_analytics AS
SELECT
  ct.id                                         AS test_id,
  ct.company_id,
  ct.title,
  COUNT(ts.id)                                  AS total_participants,
  COUNT(ts.id) FILTER (WHERE ts.status = 'completed')     AS completed_count,
  COUNT(ts.id) FILTER (WHERE ts.status = 'disqualified')  AS disqualified_count,
  ROUND(AVG(ts.score) FILTER (WHERE ts.status = 'completed'), 2) AS avg_score,
  MAX(ts.score) FILTER (WHERE ts.status = 'completed')    AS top_score,
  MIN(ts.score) FILTER (WHERE ts.status = 'completed')    AS min_score,
  ROUND(AVG(ts.time_taken_ms) FILTER (WHERE ts.status = 'completed') / 1000.0, 1) AS avg_time_seconds,
  COUNT(ts.id) FILTER (WHERE ts.score >= (ct.total_questions * 0.7) AND ts.status = 'completed') AS pass_count
FROM company_tests ct
LEFT JOIN test_sessions ts ON ts.test_id = ct.id
GROUP BY ct.id, ct.company_id, ct.title, ct.total_questions;
