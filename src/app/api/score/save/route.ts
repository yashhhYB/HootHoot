import { NextRequest, NextResponse } from 'next/server';
import { auroraPool } from '@/lib/db';
import { randomUUID } from 'crypto';

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
      `SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );

    if (sessionResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Session expired or invalid' },
        { status: 401 }
      );
    }

    const userId = sessionResult.rows[0].user_id;

    // Save the game score
    await auroraPool.query(
      `INSERT INTO game_scores (id, user_id, game_id, score, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [randomUUID(), userId, gameId, score]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[v0] Failed to save score:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save score' },
      { status: 500 }
    );
  }
}
