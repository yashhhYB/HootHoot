import { signUpUser } from "@/lib/simple-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, userType, companyName } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await signUpUser(email, password, name, userType, companyName);

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    const response = NextResponse.json(
      { user: result.user, token: result.token },
      { status: 201 }
    );

    // Set token as HttpOnly cookie
    response.cookies.set("auth-token", result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (err) {
    console.error("[api/auth/signup] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
