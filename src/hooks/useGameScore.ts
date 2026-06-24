import { useCallback } from 'react';

/**
 * Hook for saving game scores with proper authentication.
 * Retrieves the auth token from cookies and includes it in the server action.
 */
export function useGameScore() {
  const saveScore = useCallback(async (gameId: string, score: number) => {
    try {
      // Get the token from cookies
      const cookies = document.cookie.split('; ');
      const authCookie = cookies.find(c => c.startsWith('auth-token='));
      const token = authCookie?.split('=')[1];

      if (!token) {
        console.error('[v0] No auth token found');
        return { success: false, error: 'Not authenticated' };
      }

      // Call the server action with the token in headers
      const response = await fetch('/api/score/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ gameId, score }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[v0] Failed to save score:', error);
      return { success: false, error: 'Failed to save score' };
    }
  }, []);

  return { saveScore };
}
