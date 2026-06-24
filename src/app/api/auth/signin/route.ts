import { NextRequest, NextResponse } from "next/server";
import { signIn, setSessionCookie } from "@/lib/auth-core";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }

    const { user, token } = await signIn(email, password);
    await setSessionCookie(token);

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          userType: user.role,
          avatar_url: user.avatar_url,
          createdAt: user.createdAt,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[api/auth/signin] Error:", message);
    const isAuthError = message.includes("Invalid") || message.includes("required");
    return NextResponse.json({ error: message }, { status: isAuthError ? 401 : 500 });
  }
}
