import { NextResponse } from "next/server";
import {
  createArenaUser,
  signInArenaUser,
  createArenaSession,
  setArenaSessionCookie,
  clearArenaSession,
} from "@/lib/arena-auth";
import { auroraQuery } from "@/lib/db-aurora";
import { nanoid } from "nanoid";

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

      const { user, error } = await createArenaUser(email, password, name, role);
      if (error || !user) {
        return NextResponse.json({ error }, { status: 409 });
      }

      // If company role, also create the company record
      if (role === "company" && companyName) {
        await auroraQuery(
          `INSERT INTO companies (id, user_id, name, industry, website, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
          [nanoid(24), user.id, companyName, industry || null, website || null]
        );
      }

      const sessionId = await createArenaSession(user.id);
      await setArenaSessionCookie(sessionId);

      return NextResponse.json({ user });
    }

    if (action === "signin") {
      const { email, password } = body;
      if (!email || !password) {
        return NextResponse.json({ error: "Missing email or password." }, { status: 400 });
      }

      const { user, error } = await signInArenaUser(email, password);
      if (error || !user) {
        return NextResponse.json({ error }, { status: 401 });
      }

      const sessionId = await createArenaSession(user.id);
      await setArenaSessionCookie(sessionId);

      return NextResponse.json({ user });
    }

    if (action === "signout") {
      await clearArenaSession();
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    console.error("[Arena Auth API]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
