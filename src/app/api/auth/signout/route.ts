import { signOutUser } from "@/lib/simple-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value;

    if (token) {
      await signOutUser(token);
    }

    const response = NextResponse.json({ success: true });
    response.cookies.delete("auth-token");

    return response;
  } catch (err) {
    console.error("[api/auth/signout] Error:", err);
    return NextResponse.json(
      { error: "Failed to sign out" },
      { status: 500 }
    );
  }
}
