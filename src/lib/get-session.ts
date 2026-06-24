import { cookies } from "next/headers";
import { auroraPool } from "./db";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  userType: "student" | "company";
  createdAt: string;
}

/**
 * Get the current session user from the auth-token cookie.
 * Returns null if not authenticated or session expired.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) return null;

    const result = await auroraPool.query(
      `SELECT au.id, au.email, au.name, au.user_type, au.created_at
       FROM app_users au
       JOIN sessions s ON au.id = s.user_id
       WHERE s.token = $1 AND s.expires_at > NOW()
       LIMIT 1`,
      [token]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      name: row.name ?? "Player",
      userType: row.user_type === "company" ? "company" : "student",
      createdAt: new Date(row.created_at).toISOString(),
    };
  } catch (err) {
    console.error("[v0] Failed to get session user:", err);
    return null;
  }
}
