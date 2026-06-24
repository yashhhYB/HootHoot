import { NextResponse } from "next/server";
import { SESSION_COOKIE, getUserByToken } from "@/lib/auth-core";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    let token = cookieStore.get(SESSION_COOKIE)?.value;

    // Fall back to Authorization header for non-browser callers
    if (!token) {
      const authHeader = request.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) token = authHeader.slice(7);
    }

    const user = await getUserByToken(token);
    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 });
    }

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
  } catch (error) {
    console.error("[api/auth/session] Error:", error);
    return NextResponse.json({ user: null }, { status: 200 });
  }
}
