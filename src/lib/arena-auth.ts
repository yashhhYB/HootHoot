/**
 * Arena authentication helpers — uses Aurora PostgreSQL for storage.
 * Separate from the Better Auth system used by the main app.
 */
import { auroraQuery } from "./db-aurora";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import type { ArenaUser } from "@/types/arena";

const SESSION_COOKIE = "arena_session";
const SESSION_DURATION_DAYS = 30;

// ── Password hashing (Web Crypto API — no bcrypt needed) ──────
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(hash).toString("hex");
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const hashed = await hashPassword(password);
  return hashed === hash;
}

// ── Session management ────────────────────────────────────────
export async function createArenaSession(userId: string): Promise<string> {
  const sessionId = nanoid(48);
  const expiresAt = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await auroraQuery(
    `INSERT INTO arena_sessions (id, user_id, expires_at) VALUES ($1, $2, $3)`,
    [sessionId, userId, expiresAt.toISOString()]
  );

  return sessionId;
}

export async function setArenaSessionCookie(sessionId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

export async function getArenaSession(): Promise<ArenaUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
    if (!sessionId) return null;

    const result = await auroraQuery(
      `SELECT u.id, u.email, u.name, u.role, u.avatar_url, u.created_at
       FROM arena_sessions s
       JOIN arena_users u ON u.id = s.user_id
       WHERE s.id = $1 AND s.expires_at > NOW()`,
      [sessionId]
    );

    if (result.rows.length === 0) return null;
    return result.rows[0] as ArenaUser;
  } catch {
    return null;
  }
}

export async function clearArenaSession(): Promise<void> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await auroraQuery(`DELETE FROM arena_sessions WHERE id = $1`, [sessionId]).catch(() => {});
  }
  cookieStore.delete(SESSION_COOKIE);
}

// ── User creation ─────────────────────────────────────────────
export async function createArenaUser(
  email: string,
  password: string,
  name: string,
  role: "student" | "company"
): Promise<{ user: ArenaUser | null; error: string | null }> {
  // Check if email already exists
  const existing = await auroraQuery(
    `SELECT id FROM arena_users WHERE email = $1`,
    [email.toLowerCase().trim()]
  );

  if (existing.rows.length > 0) {
    return { user: null, error: "An account with this email already exists." };
  }

  const id = nanoid(24);
  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  const result = await auroraQuery(
    `INSERT INTO arena_users (id, email, name, password_hash, role, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, email, name, role, avatar_url, created_at`,
    [id, email.toLowerCase().trim(), name, passwordHash, role, now, now]
  );

  return { user: result.rows[0] as ArenaUser, error: null };
}

// ── Sign in ───────────────────────────────────────────────────
export async function signInArenaUser(
  email: string,
  password: string
): Promise<{ user: ArenaUser | null; error: string | null }> {
  const result = await auroraQuery(
    `SELECT id, email, name, role, avatar_url, created_at, password_hash
     FROM arena_users WHERE email = $1`,
    [email.toLowerCase().trim()]
  );

  if (result.rows.length === 0) {
    return { user: null, error: "Invalid email or password." };
  }

  const row = result.rows[0];
  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) {
    return { user: null, error: "Invalid email or password." };
  }

  const user: ArenaUser = {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    avatar_url: row.avatar_url,
    created_at: row.created_at,
  };

  return { user, error: null };
}
