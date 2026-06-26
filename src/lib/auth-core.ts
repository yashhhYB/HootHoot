/**
 * auth-core.ts — THE single authentication system for HootHoot.
 *
 * Backend: AWS Aurora PostgreSQL (tables `app_users` + `user_sessions`).
 * Password hashing: Node crypto.scrypt with a per-user random salt.
 * Session: opaque random token stored in `user_sessions`, sent to the browser
 *          as an HttpOnly `hh_session` cookie (30-day sliding expiry).
 *
 * This replaces the old Better Auth, simple-auth, and arena-auth systems.
 * Every server guard / API route / action authenticates through here.
 */
import "server-only";
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { auroraQuery } from "./db-aurora";

export const SESSION_COOKIE = "hh_session";
const SESSION_TTL_DAYS = 30;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export type UserRole = "student" | "company";

/** The unified user object returned everywhere in the app. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar_url: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ── Password helpers ──────────────────────────────────────────
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(":");
  if (!salt || !key) return false;
  const derived = scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, "hex");
  if (keyBuf.length !== derived.length) return false;
  return timingSafeEqual(keyBuf, derived);
}

// ── Row → AuthUser mapping ────────────────────────────────────
type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  avatar_url: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

function rowToUser(row: UserRow): AuthUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name ?? row.email.split("@")[0],
    role: (row.role === "company" ? "company" : "student") as UserRole,
    avatar_url: row.avatar_url ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// ── Sign up ───────────────────────────────────────────────────
export interface SignUpInput {
  email: string;
  password: string;
  name: string;
  role?: UserRole;
  companyName?: string;
}

export async function signUp(input: SignUpInput): Promise<{ user: AuthUser; token: string }> {
  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const role: UserRole = input.role === "company" ? "company" : "student";

  if (!email || !email.includes("@")) throw new Error("A valid email is required.");
  if (!input.password || input.password.length < 6)
    throw new Error("Password must be at least 6 characters.");
  if (!name) throw new Error("Name is required.");

  // Reject duplicate email
  const existing = await auroraQuery(`SELECT id FROM app_users WHERE email = $1`, [email]);
  if (existing.rows.length > 0) throw new Error("An account with this email already exists.");

  const id = randomUUID();
  const passwordHash = hashPassword(input.password);

  const inserted = await auroraQuery(
    `INSERT INTO app_users (id, email, password_hash, name, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, name, role, avatar_url, created_at, updated_at`,
    [id, email, passwordHash, name, role]
  );

  // Companies get a linked company profile row
  if (role === "company") {
    const companyName = (input.companyName || name).trim();
    await auroraQuery(
      `INSERT INTO companies (id, user_id, name)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO NOTHING`,
      [randomUUID(), id, companyName]
    );
  }

  const user = rowToUser(inserted.rows[0] as UserRow);
  const token = await createSession(user.id);
  return { user, token };
}

// ── Sign in ───────────────────────────────────────────────────
export async function signIn(
  emailRaw: string,
  password: string
): Promise<{ user: AuthUser; token: string }> {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !password) throw new Error("Email and password are required.");

  const res = await auroraQuery(
    `SELECT id, email, name, role, avatar_url, password_hash, created_at, updated_at
     FROM app_users WHERE email = $1`,
    [email]
  );
  if (res.rows.length === 0) throw new Error("Invalid email or password.");

  const row = res.rows[0] as UserRow & { password_hash: string };
  if (!verifyPassword(password, row.password_hash)) {
    throw new Error("Invalid email or password.");
  }

  const user = rowToUser(row);
  const token = await createSession(user.id);
  return { user, token };
}

// ── Session management ────────────────────────────────────────
export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await auroraQuery(
    `INSERT INTO user_sessions (id, user_id, token, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [randomUUID(), userId, token, expiresAt.toISOString()]
  );
  return token;
}

export async function getUserByToken(token: string | undefined | null): Promise<AuthUser | null> {
  if (!token) return null;
  const res = await auroraQuery(
    `SELECT u.id, u.email, u.name, u.role, u.avatar_url, u.created_at, u.updated_at
     FROM user_sessions s
     JOIN app_users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [token]
  );
  if (res.rows.length === 0) return null;
  return rowToUser(res.rows[0] as UserRow);
}

export async function signOutByToken(token: string | undefined | null): Promise<void> {
  if (!token) return;
  await auroraQuery(`DELETE FROM user_sessions WHERE token = $1`, [token]);
}

// ── Cookie helpers (work inside Route Handlers & Server Actions) ──
export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

async function getSessionToken(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value;
}

/** Read the current authenticated user from the session cookie. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await getSessionToken();
  return getUserByToken(token);
}

/** Throw if not authenticated — for protected actions/routes. */
export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized: sign in required.");
  return user;
}

/**
 * Full sign out: deletes the current session row in Aurora AND clears the
 * cookie. Safe to call from Route Handlers and Server Actions.
 */
export async function signOut(): Promise<void> {
  const token = await getSessionToken();
  await signOutByToken(token);
  await clearSessionCookie();
}
