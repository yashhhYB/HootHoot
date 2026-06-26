import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, signOutByToken, clearSessionCookie } from "@/lib/auth-core";

async function handleSignOut(request: NextRequest) {
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    await signOutByToken(token);
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[api/auth/signout] Error:", err);
    return NextResponse.json({ error: "Failed to sign out" }, { status: 500 });
  }
}

// Support both POST (programmatic) and GET (simple link navigation)
export async function POST(request: NextRequest) {
  return handleSignOut(request);
}

export async function GET(request: NextRequest) {
  return handleSignOut(request);
}
