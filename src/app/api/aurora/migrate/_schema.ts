/**
 * _schema.ts — idempotent DDL run automatically on Vercel startup
 * (via src/instrumentation.ts) and by the /api/aurora/migrate route.
 *
 * Single source of truth for the ENTIRE database:
 *  - Auth: app_users + user_sessions (the only auth system).
 *  - Game features: game_score, game_attempt, user_streak, poll, broadcast.
 *  - Arena / Company: companies, practice_attempts, company_tests,
 *    test_sessions, warning_logs, arena_questions.
 *
 * Every statement is IF NOT EXISTS so it is safe to run on every cold start.
 */
export const FULL_SCHEMA_SQL = `
-- ══ AUTH ══════════════════════════════════════════════════════
-- Unified user table. role drives student vs company experience.
CREATE TABLE IF NOT EXISTS app_users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'company')),
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);

CREATE TABLE IF NOT EXISTS user_sessions (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token   ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- ══ GAME FEATURES ═════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS game_score (
  id          TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  "gameId"    TEXT NOT NULL,
  score       INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS game_score_user_game_idx ON game_score("userId", "gameId");

CREATE TABLE IF NOT EXISTS game_attempt (
  id         TEXT PRIMARY KEY,
  "userId"   TEXT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  "gameSlug" TEXT NOT NULL,
  date       TEXT NOT NULL,
  count      INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT game_attempt_unique UNIQUE ("userId", "gameSlug", date)
);
CREATE INDEX IF NOT EXISTS game_attempt_user_slug_date_idx ON game_attempt("userId", "gameSlug", date);

CREATE TABLE IF NOT EXISTS user_streak (
  "userId"           TEXT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  "currentStreak"    INTEGER NOT NULL DEFAULT 1,
  "longestStreak"    INTEGER NOT NULL DEFAULT 1,
  "lastActivityDate" TEXT NOT NULL,
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poll (
  id          TEXT PRIMARY KEY,
  question    TEXT NOT NULL,
  "isActive"  BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS poll_option (
  id        TEXT PRIMARY KEY,
  label     TEXT NOT NULL,
  votes     INTEGER NOT NULL DEFAULT 0,
  "isInput" BOOLEAN NOT NULL DEFAULT false,
  "pollId"  TEXT NOT NULL REFERENCES poll(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS broadcast (
  id            TEXT PRIMARY KEY,
  subject       TEXT NOT NULL,
  message       TEXT NOT NULL,
  "imageName"   TEXT,
  "totalCount"  INTEGER NOT NULL DEFAULT 0,
  "sentCount"   INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS broadcast_recipient (
  id            TEXT PRIMARY KEY,
  "broadcastId" TEXT NOT NULL REFERENCES broadcast(id) ON DELETE CASCADE,
  "userId"      TEXT NOT NULL,
  email         TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending',
  error         TEXT,
  "sentAt"      TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS broadcast_recipient_broadcast_idx ON broadcast_recipient("broadcastId");
CREATE INDEX IF NOT EXISTS broadcast_recipient_status_idx    ON broadcast_recipient("broadcastId", status);

-- ══ ARENA / COMPANY ═══════════════════════════════════════════
-- One row per company HR account. user_id = app_users.id (role='company').
CREATE TABLE IF NOT EXISTS companies (
  id          VARCHAR(36)   PRIMARY KEY,
  user_id     TEXT          NOT NULL UNIQUE REFERENCES app_users(id) ON DELETE CASCADE,
  name        VARCHAR(255)  NOT NULL,
  logo_url    TEXT,
  industry    VARCHAR(100),
  website     VARCHAR(255),
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);

CREATE TABLE IF NOT EXISTS practice_attempts (
  id              VARCHAR(36)  PRIMARY KEY,
  user_id         TEXT         NOT NULL,
  score           INT          NOT NULL CHECK (score >= 0 AND score <= 10),
  total_questions INT          NOT NULL DEFAULT 10,
  time_taken_ms   INT          NOT NULL CHECK (time_taken_ms >= 0),
  difficulty      VARCHAR(20)  NOT NULL DEFAULT 'mixed',
  question_log    JSONB        NOT NULL DEFAULT '[]',
  warnings_count  INT          NOT NULL DEFAULT 0,
  is_strict_mode  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_user_id    ON practice_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_score      ON practice_attempts(score DESC);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_created_at ON practice_attempts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_practice_leaderboard         ON practice_attempts(score DESC, time_taken_ms ASC);

CREATE TABLE IF NOT EXISTS company_tests (
  id                  VARCHAR(36)   PRIMARY KEY,
  company_id          VARCHAR(36)   NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title               VARCHAR(255)  NOT NULL,
  description         TEXT,
  question_config     JSONB         NOT NULL DEFAULT '[]',
  total_questions     INT           NOT NULL CHECK (total_questions BETWEEN 1 AND 30),
  time_limit_minutes  INT           NOT NULL DEFAULT 30 CHECK (time_limit_minutes BETWEEN 5 AND 180),
  require_fullscreen  BOOLEAN       NOT NULL DEFAULT TRUE,
  require_camera      BOOLEAN       NOT NULL DEFAULT FALSE,
  max_warnings        INT           NOT NULL DEFAULT 3,
  allow_tab_switch    BOOLEAN       NOT NULL DEFAULT FALSE,
  status              VARCHAR(20)   NOT NULL DEFAULT 'draft'
                                    CHECK (status IN ('draft', 'active', 'closed')),
  invite_code         VARCHAR(12)   UNIQUE,
  max_participants    INT,
  starts_at           TIMESTAMPTZ,
  ends_at             TIMESTAMPTZ,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_company_tests_company_id  ON company_tests(company_id);
CREATE INDEX IF NOT EXISTS idx_company_tests_status      ON company_tests(status);
CREATE INDEX IF NOT EXISTS idx_company_tests_invite_code ON company_tests(invite_code) WHERE invite_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS test_sessions (
  id                VARCHAR(36)  PRIMARY KEY,
  test_id           VARCHAR(36)  NOT NULL REFERENCES company_tests(id) ON DELETE CASCADE,
  user_id           TEXT         NOT NULL,
  score             INT          CHECK (score >= 0),
  total_questions   INT          NOT NULL,
  time_taken_ms     INT          CHECK (time_taken_ms >= 0),
  warnings_count    INT          NOT NULL DEFAULT 0,
  status            VARCHAR(20)  NOT NULL DEFAULT 'in_progress'
                                  CHECK (status IN ('in_progress', 'completed', 'disqualified', 'abandoned')),
  question_log      JSONB        NOT NULL DEFAULT '[]',
  proctor_log       JSONB        NOT NULL DEFAULT '[]',
  started_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at      TIMESTAMPTZ,
  UNIQUE(test_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_test_sessions_test_id ON test_sessions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_id ON test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_status  ON test_sessions(status);

CREATE TABLE IF NOT EXISTS warning_logs (
  id             SERIAL       PRIMARY KEY,
  session_id     VARCHAR(36)  NOT NULL,
  session_type   VARCHAR(20)  NOT NULL CHECK (session_type IN ('practice', 'test')),
  reason         VARCHAR(50)  NOT NULL,
  warning_number INT          NOT NULL,
  s3_image_url   TEXT,
  metadata       JSONB        NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_warning_logs_session ON warning_logs(session_id, session_type);

CREATE TABLE IF NOT EXISTS arena_questions (
  id          SERIAL        PRIMARY KEY,
  game_slug   VARCHAR(100)  NOT NULL,
  difficulty  INT           NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  category    VARCHAR(50)   NOT NULL,
  payload     JSONB         NOT NULL,
  is_active   BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_arena_questions_slug_diff ON arena_questions(game_slug, difficulty) WHERE is_active = TRUE;

-- ── Analytics view (company dashboard) ────────────────────────
CREATE OR REPLACE VIEW test_analytics AS
SELECT
  ct.id                                                                            AS test_id,
  ct.company_id,
  ct.title,
  COUNT(ts.id)                                                                     AS total_participants,
  COUNT(ts.id) FILTER (WHERE ts.status = 'completed')                              AS completed_count,
  COUNT(ts.id) FILTER (WHERE ts.status = 'disqualified')                           AS disqualified_count,
  ROUND(AVG(ts.score) FILTER (WHERE ts.status = 'completed'), 2)                   AS avg_score,
  MAX(ts.score) FILTER (WHERE ts.status = 'completed')                             AS top_score,
  MIN(ts.score) FILTER (WHERE ts.status = 'completed')                             AS min_score,
  ROUND(AVG(ts.time_taken_ms) FILTER (WHERE ts.status = 'completed') / 1000.0, 1)  AS avg_time_seconds,
  COUNT(ts.id) FILTER (
    WHERE ts.score >= (ct.total_questions * 0.7) AND ts.status = 'completed'
  )                                                                                AS pass_count
FROM company_tests ct
LEFT JOIN test_sessions ts ON ts.test_id = ct.id
GROUP BY ct.id, ct.company_id, ct.title, ct.total_questions;
`;
