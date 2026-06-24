import { NextResponse } from "next/server";
import { getLeaderboard } from "@/features/leaderboard/actions";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get('gameId') || undefined;
    
    const data = await getLeaderboard(gameId);
    return NextResponse.json({
      data,
      total: data.length,
    });
  } catch (error) {
    console.error('[v0] Leaderboard API error:', error);
    return NextResponse.json({ error: "Failed to fetch leaderboard" }, { status: 500 });
  }
}
