import { NextResponse } from "next/server";
import { signUp, signIn, setSessionCookie, signOutByToken, clearSessionCookie, SESSION_COOKIE } from "@/lib/auth-core";
import { auroraQuery } from "@/lib/db-aurora";
import type { ArenaUser } from "@/types/arena";

function toArenaUser(user: {
  id: string;
  email: string;
  name: string;
  role: "student" | "company";
  avatar_url: string | null;
  createdAt: Date;
}): ArenaUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    avatar_url: user.avatar_url,
    created_at: user.createdAt.toISOString(),
  };
}

// POST /api/arena/auth  — { action: 'signup' | 'signin' | 'signout', ...payload }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "signup") {
      const { email, password, name, role, companyName, industry, website } = body;

      if (!email || !password || !name || !role) {
        return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
      }
      if (password.length < 6) {
        return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
      }
      if (!["student", "company"].includes(role)) {
        return NextResponse.json({ error: "Invalid role." }, { status: 400 });
      }

      const { user, token } = await signUp({ email, password, name, role, companyName });

      // Enrich the company row with optional industry / website
      if (role === "company" && (industry || website)) {
        await auroraQuery(
          `UPDATE companies SET industry = COALESCE($2, industry),
                                website  = COALESCE($3, website),
                                updated_at = NOW()
           WHERE user_id = $1`,
          [user.id, industry || null, website || null]
        );
      }

      await setSessionCookie(token);
      return NextResponse.json({ user: toArenaUser(user) });
    }

    if (action === "signin") {
      const { email, password } = body;
      if (!email || !password) {
        return NextResponse.json({ error: "Missing email or password." }, { status: 400 });
      }

      const { user, token } = await signIn(email, password);
      await setSessionCookie(token);
      return NextResponse.json({ user: toArenaUser(user) });
    }

    if (action === "signout") {
      const token = req.headers.get("cookie")?.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`))?.[1];
      await signOutByToken(token);
      await clearSessionCookie();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    console.error("[Arena Auth API]", message);
    const isClientError =
      message.includes("already exists") ||
      message.includes("Invalid") ||
      message.includes("required") ||
      message.includes("at least");
    return NextResponse.json({ error: message }, { status: isClientError ? 409 : 500 });
  }
}
