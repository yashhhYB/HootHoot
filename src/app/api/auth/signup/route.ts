import { NextRequest, NextResponse } from "next/server";
import { signUp, setSessionCookie } from "@/lib/auth-core";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, userType, companyName } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const role = userType === "company" ? "company" : "student";
    const { user, token } = await signUp({ email, password, name, role, companyName });
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
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    console.error("[api/auth/signup] Error:", message);
    // Known validation errors → 400; everything else → 500
    const isValidation =
      message.includes("already exists") ||
      message.includes("required") ||
      message.includes("at least");
    return NextResponse.json({ error: message }, { status: isValidation ? 400 : 500 });
  }
}
