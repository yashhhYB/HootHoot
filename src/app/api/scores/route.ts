import { auroraPool } from "@/lib/db";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const GET = async (req: Request) => {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);

    // Get user from session
    const sessionResult = await auroraPool.query(
      `SELECT "userId" FROM session WHERE token = $1 AND "expiresAt" > NOW()`,
      [token]
    );

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = sessionResult.rows[0].userId;

    // Get user's scores
    const scores = await auroraPool.query(
      `SELECT * FROM game_score WHERE "userId" = $1 ORDER BY score DESC LIMIT 10`,
      [userId]
    );

    return NextResponse.json(scores.rows);
  } catch (error) {
    console.error("[v0] Error fetching scores:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
};

export const POST = async (req: Request) => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth-token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user from session
    const sessionResult = await auroraPool.query(
      `SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );

    if (sessionResult.rows.length === 0) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = sessionResult.rows[0].user_id;
    const body = await req.json();
    const { gameId, score } = body;

    if (!gameId || typeof score !== "number") {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    const newScore = await auroraPool.query(
      `INSERT INTO game_score (id, user_id, game_id, score, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [randomUUID(), userId, gameId, score]
    );

    return NextResponse.json(newScore.rows[0]);
  } catch (error) {
    console.error("[v0] Error saving score:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
};
