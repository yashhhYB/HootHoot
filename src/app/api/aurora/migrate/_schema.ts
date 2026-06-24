/**
 * _schema.ts — idempotent DDL run automatically on Vercel startup
 * (via src/instrumentation.ts) and by the /api/aurora/migrate route.
 *
 * Scope: Better Auth tables + feature tables ONLY.
 * The arena/company tables are owned by scripts/001-arena-schema.sql and are
 * intentionally NOT redefined here — redefining them caused column drift and a
 * "column user_id does not exist" failure. Every statement is IF NOT EXISTS so
 * this is safe to run on every cold start.
 */
export const FULL_SCHEMA_SQL = `
-- ── Better Auth core tables ───────────────────────────────────
CREATE TABLE IF NOT EXISTS "user" (
  id              TEXT PRIMARY KEY,
  name            TEXT,
  email           TEXT NOT NULL UNIQUE,
  "emailVerified" BOOLEAN NOT NULL DEFAULT false,
  image           TEXT,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS session (
  id          TEXT PRIMARY KEY,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  token       TEXT NOT NULL UNIQUE,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "userId"    TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
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
  id          TEXT PRIMARY KEY,
  identifier  TEXT NOT NULL,
  value       TEXT NOT NULL,
  "expiresAt" TIMESTAMPTZ NOT NULL,
  "createdAt" TIMESTAMPTZ DEFAULT NOW(),
  "updatedAt" TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_session_user_id ON session("userId");
CREATE INDEX IF NOT EXISTS idx_session_token   ON session(token);
CREATE INDEX IF NOT EXISTS idx_account_user_id ON account("userId");
CREATE INDEX IF NOT EXISTS idx_user_email      ON "user"(email);

-- ── Feature tables (leaderboard / streak / polls / broadcast) ──
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
`;
