import { auroraPool as pool } from "./db";
import crypto from "crypto";

/**
 * Simple, clean authentication utilities for Hoot-Hoot
 * Uses PostgreSQL directly with proper password hashing
 */

// Hash password using PBKDF2
function hashPassword(password: string): string {
  return crypto
    .pbkdf2Sync(password, "hoot-hoot-salt", 100000, 64, "sha512")
    .toString("hex");
}

// Verify password
function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Generate a secure random token
function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export interface User {
  id: string;
  email: string;
  name: string;
  user_type: "student" | "company";
  company_name?: string;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
}

/**
 * Sign up a new user
 */
export async function signUpUser(
  email: string,
  password: string,
  name: string,
  userType: "student" | "company" = "student",
  companyName?: string
): Promise<{ user: User; token: string } | { error: string }> {
  try {
    // Check if email already exists
    const existing = await pool.query(
      "SELECT id FROM app_users WHERE email = $1",
      [email]
    );
    if (existing.rows.length > 0) {
      return { error: "Email already exists" };
    }

    // Create user
    const passwordHash = hashPassword(password);
    const result = await pool.query(
      `INSERT INTO app_users (email, password_hash, name, user_type, company_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, user_type, company_name, created_at`,
      [email, passwordHash, name, userType, companyName || null]
    );

    const user: User = result.rows[0];

    // Create session
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    await pool.query(
      `INSERT INTO sessions (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );

    return { user, token };
  } catch (err) {
    console.error("[auth] Sign up error:", err);
    return { error: "Failed to create account" };
  }
}

/**
 * Sign in with email and password
 */
export async function signInUser(
  email: string,
  password: string
): Promise<{ user: User; token: string } | { error: string }> {
  try {
    // Find user
    const result = await pool.query(
      "SELECT id, email, name, user_type, company_name, created_at, password_hash FROM app_users WHERE email = $1",
      [email]
    );

    if (result.rows.length === 0) {
      return { error: "Invalid email or password" };
    }

    const userRow = result.rows[0];

    // Verify password
    if (!verifyPassword(password, userRow.password_hash)) {
      return { error: "Invalid email or password" };
    }

    const user: User = {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name,
      user_type: userRow.user_type,
      company_name: userRow.company_name,
      created_at: userRow.created_at,
    };

    // Create session
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO sessions (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );

    return { user, token };
  } catch (err) {
    console.error("[auth] Sign in error:", err);
    return { error: "Failed to sign in" };
  }
}

/**
 * Verify token and get user
 */
export async function verifyToken(
  token: string
): Promise<User | null> {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.user_type, u.company_name, u.created_at
       FROM sessions s
       JOIN app_users u ON s.user_id = u.id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as User;
  } catch (err) {
    console.error("[auth] Verify token error:", err);
    return null;
  }
}

/**
 * Sign out / delete session
 */
export async function signOutUser(token: string): Promise<void> {
  try {
    await pool.query("DELETE FROM sessions WHERE token = $1", [token]);
  } catch (err) {
    console.error("[auth] Sign out error:", err);
  }
}
