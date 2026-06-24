import { cookies } from 'next/headers';
import { auroraPool } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    // Check for token in cookies first (for browser requests)
    let token = cookieStore.get('auth-token')?.value;

    // If not in cookies, check Authorization header (for API requests)
    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      return new Response(JSON.stringify({ user: null }), { status: 401 });
    }

    // Verify token in database and get user
    const result = await auroraPool.query(
      `SELECT 
        u.id, u.email, u.name, u.user_type as "userType", u.created_at as "createdAt"
       FROM app_users u
       INNER JOIN sessions s ON u.id = s.user_id
       WHERE s.token = $1 AND s.expires_at > NOW()`,
      [token]
    );

    if (result.rows.length === 0) {
      return new Response(JSON.stringify({ user: null }), { status: 401 });
    }

    const user = result.rows[0];
    return new Response(JSON.stringify({ user }), { status: 200 });
  } catch (error) {
    console.error('[v0] Session endpoint error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
