import { NextRequest, NextResponse } from 'next/server';
import { auroraPool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Get auth token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice(7);

    // Get body
    const { gameId, score } = await request.json();
    if (!gameId || typeof score !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Missing gameId or score' },
        { status: 400 }
      );
    }

    // Verify token and get user ID
    const sessionResult = await auroraPool.query(
      `SELECT "userId" FROM session WHERE token = $1 AND "expiresAt" > NOW()`,
      [token]
    );

    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Session expired or invalid' },
        { status: 401 }
      );
    }

    const userId = sessionResult.rows[0].userId;

    // Save the game score
    await auroraPool.query(
      `INSERT INTO game_score (id, "userId", "gameId", score, "createdAt")
       VALUES ($1, $2, $3, $4, NOW())`,
      [Math.random().toString(36).substring(2, 15), userId, gameId, score]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[v0] Failed to save score:', errorMessage);
    console.error('[v0] Full error:', error);
    return NextResponse.json(
      { success: false, error: `Failed to save score: ${errorMessage}` },
      { status: 500 }
    );
  }
}
