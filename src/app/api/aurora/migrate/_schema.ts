/**
 * _schema.ts — single source of truth for the full Aurora DDL.
 * Imported by both the /api/aurora/migrate route and instrumentation.ts.
 * Every statement is idempotent (IF NOT EXISTS / CREATE OR REPLACE).
 */
export const FULL_SCHEMA_SQL = `
-- ── Better Auth core tables ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "user" (
  id                       TEXT PRIMARY KEY,
  name                     TEXT,
  email                    TEXT NOT NULL UNIQUE,
  "emailVerified"          BOOLEAN NOT NULL DEFAULT false,
  image                    TEXT,
  "createdAt"              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "isPro"                  BOOLEAN NOT NULL DEFAULT false,
  "razorpaySubscriptionId" TEXT,
  "razorpayCustomerId"     TEXT,
  "subscriptionStatus"     TEXT
);

CREATE TABLE IF NOT EXISTS session (
  id           TEXT PRIMARY KEY,
  "expiresAt"  TIMESTAMPTZ NOT NULL,
  token        TEXT NOT NULL UNIQUE,
  "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "ipAddress"  TEXT,
  "userAgent"  TEXT,
  "userId"     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account (
  id                      TEXT PRIMARY KEY,
  "accountId"             TEXT NOT NULL,
  "providerId"            TEXT NOT NULL,
  "userId"                TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "accessToken"           TEXT,
  "refreshToken"          TEXT,
  "idToken"               TEXT,
  "accessTokenExpiresAt"  TIMESTAMPTZ,
  "refreshTokenExpiresAt" TIMESTAMPTZ,
  scope                   TEXT,
  password                TEXT,
  "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS verification (
  id           TEXT PRIMARY KEY,
  identifier   TEXT NOT NULL,
  value        TEXT NOT NULL,
  "expiresAt"  TIMESTAMPTZ NOT NULL,
  "createdAt"  TIMESTAMPTZ,
  "updatedAt"  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_session_user_id  ON session("userId");
CREATE INDEX IF NOT EXISTS idx_session_token    ON session(token);
CREATE INDEX IF NOT EXISTS idx_account_user_id  ON account("userId");
CREATE INDEX IF NOT EXISTS idx_user_email       ON "user"(email);

-- ── App tables ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_score (
  id          TEXT PRIMARY KEY,
  "userId"    TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "gameId"    TEXT NOT NULL,
  score       INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS game_score_user_game_idx ON game_score("userId", "gameId");

CREATE TABLE IF NOT EXISTS game_attempt (
  id         TEXT PRIMARY KEY,
  "userId"   TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "gameSlug" TEXT NOT NULL,
  date       TEXT NOT NULL,
  count      INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT game_attempt_unique UNIQUE ("userId", "gameSlug", date)
);
CREATE INDEX IF NOT EXISTS game_attempt_user_slug_date_idx ON game_attempt("userId", "gameSlug", date);

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

CREATE TABLE IF NOT EXISTS user_streak (
  "userId"           TEXT PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  "currentStreak"    INTEGER NOT NULL DEFAULT 1,
  "longestStreak"    INTEGER NOT NULL DEFAULT 1,
  "lastActivityDate" TEXT NOT NULL,
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

CREATE TABLE IF NOT EXISTS subscription (
  id                       TEXT PRIMARY KEY,
  "userId"                 TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  "planType"               TEXT NOT NULL,
  "razorpaySubscriptionId" TEXT NOT NULL UNIQUE,
  status                   TEXT NOT NULL DEFAULT 'created',
  "expiresAt"              TIMESTAMPTZ,
  "createdAt"              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS subscription_user_idx ON subscription("userId");

-- ── Arena / Company tables ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS companies (
  id         VARCHAR(36)  PRIMARY KEY,
  user_id    TEXT         NOT NULL UNIQUE,
  name       VARCHAR(255) NOT NULL DEFAULT 'My Company',
  website    TEXT,
  industry   VARCHAR(100),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON companies(user_id);

CREATE TABLE IF NOT EXISTS practice_attempts (
  id              VARCHAR(36) PRIMARY KEY,
  user_id         TEXT        NOT NULL,
  score           INTEGER     NOT NULL DEFAULT 0,
  total_questions INTEGER     NOT NULL DEFAULT 10,
  time_taken_ms   BIGINT      NOT NULL DEFAULT 0,
  difficulty      VARCHAR(20) NOT NULL DEFAULT 'mixed',
  question_log    JSONB,
  warnings_count  INTEGER     NOT NULL DEFAULT 0,
  is_strict_mode  BOOLEAN     NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_practice_user_id  ON practice_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_score    ON practice_attempts(score DESC);
CREATE INDEX IF NOT EXISTS idx_practice_created  ON practice_attempts(created_at DESC);

CREATE TABLE IF NOT EXISTS company_tests (
  id           VARCHAR(36)  PRIMARY KEY,
  company_id   VARCHAR(36)  NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title        VARCHAR(255) NOT NULL,
  description  TEXT,
  config       JSONB        NOT NULL DEFAULT '{}',
  invite_code  VARCHAR(20)  NOT NULL UNIQUE,
  status       VARCHAR(20)  NOT NULL DEFAULT 'draft'
               CHECK (status IN ('draft','active','closed')),
  is_proctored BOOLEAN      NOT NULL DEFAULT false,
  starts_at    TIMESTAMPTZ,
  ends_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_company_tests_company ON company_tests(company_id);
CREATE INDEX IF NOT EXISTS idx_company_tests_invite  ON company_tests(invite_code);
CREATE INDEX IF NOT EXISTS idx_company_tests_status  ON company_tests(status);

CREATE TABLE IF NOT EXISTS test_sessions (
  id              VARCHAR(36) PRIMARY KEY,
  test_id         VARCHAR(36) NOT NULL REFERENCES company_tests(id) ON DELETE CASCADE,
  user_id         TEXT        NOT NULL,
  score           INTEGER     NOT NULL DEFAULT 0,
  total_questions INTEGER     NOT NULL DEFAULT 0,
  time_taken_ms   BIGINT      NOT NULL DEFAULT 0,
  question_log    JSONB,
  warnings_count  INTEGER     NOT NULL DEFAULT 0,
  is_disqualified BOOLEAN     NOT NULL DEFAULT false,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_test_sessions_test_id ON test_sessions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_user_id ON test_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_test_sessions_score   ON test_sessions(test_id, score DESC);

CREATE TABLE IF NOT EXISTS warning_logs (
  id           VARCHAR(36) PRIMARY KEY,
  session_id   VARCHAR(36),
  user_id      TEXT        NOT NULL,
  session_type VARCHAR(20) NOT NULL DEFAULT 'practice'
               CHECK (session_type IN ('practice','company')),
  reason       VARCHAR(50) NOT NULL,
  s3_image_url TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_warning_logs_session ON warning_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_warning_logs_user    ON warning_logs(user_id);

CREATE TABLE IF NOT EXISTS arena_questions (
  id         VARCHAR(36)  PRIMARY KEY,
  game_type  VARCHAR(50)  NOT NULL,
  difficulty VARCHAR(20)  NOT NULL CHECK (difficulty IN ('easy','medium','hard','expert')),
  question   JSONB        NOT NULL,
  answer     TEXT         NOT NULL,
  points     INTEGER      NOT NULL DEFAULT 10,
  is_active  BOOLEAN      NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_arena_questions_type ON arena_questions(game_type);

-- ── Triggers for updated_at ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_companies_updated_at') THEN
    CREATE TRIGGER trg_companies_updated_at
      BEFORE UPDATE ON companies
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_company_tests_updated_at') THEN
    CREATE TRIGGER trg_company_tests_updated_at
      BEFORE UPDATE ON company_tests
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ── Analytics view ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW test_analytics AS
SELECT
  ct.id                                                 AS test_id,
  ct.company_id,
  ct.title,
  COUNT(ts.id)                                          AS total_participants,
  COUNT(ts.completed_at)                                AS completed_count,
  COUNT(CASE WHEN ts.is_disqualified THEN 1 END)        AS disqualified_count,
  COALESCE(ROUND(AVG(ts.score)::NUMERIC, 2), 0)         AS avg_score,
  COALESCE(MAX(ts.score), 0)                            AS top_score,
  COALESCE(AVG(ts.time_taken_ms)::BIGINT, 0)            AS avg_time_ms
FROM company_tests ct
LEFT JOIN test_sessions ts ON ts.test_id = ct.id
GROUP BY ct.id, ct.company_id, ct.title;
`;
