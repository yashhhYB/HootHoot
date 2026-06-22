import { NextResponse } from "next/server";
import { auroraQuery } from "@/lib/db-aurora";

export async function POST(req: Request) {
  try {
    const { sessionId, sessionType, reason, warningNumber, metadata } = await req.json();

    if (!sessionId || !sessionType || !reason || !warningNumber) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await auroraQuery(
      `INSERT INTO warning_logs (session_id, session_type, reason, warning_number, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [sessionId, sessionType, reason, warningNumber, JSON.stringify(metadata ?? {})]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
