"use server";

import { auroraPool } from "@/lib/db";

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  name: string | null;
  userType: string;
  totalScore: number;
  gamesPlayed: number;
  avgScore: number;
};

export async function getLeaderboard(gameId?: string): Promise<LeaderboardEntry[]> {
  try {
    let query = `
      SELECT 
        ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(gs.score), 0) DESC) as rank,
        u.id as "userId",
        u.name,
        u.user_type as "userType",
        COALESCE(SUM(gs.score), 0)::integer as "totalScore",
        COUNT(DISTINCT gs.game_id)::integer as "gamesPlayed",
        ROUND(COALESCE(AVG(gs.score), 0)::numeric, 2)::float as "avgScore"
      FROM app_users u
      LEFT JOIN game_scores gs ON u.id = gs.user_id
    `;

    const params: unknown[] = [];

    if (gameId) {
      // Best score per user for a specific game
      query = `
        SELECT 
          ROW_NUMBER() OVER (ORDER BY MAX(gs.score) DESC) as rank,
          u.id as "userId",
          u.name,
          u.user_type as "userType",
          MAX(gs.score)::integer as "totalScore",
          COUNT(DISTINCT gs.game_id)::integer as "gamesPlayed",
          ROUND(AVG(gs.score)::numeric, 2)::float as "avgScore"
        FROM app_users u
        LEFT JOIN game_scores gs ON u.id = gs.user_id AND gs.game_id = $1
        GROUP BY u.id, u.name, u.user_type
        ORDER BY "totalScore" DESC NULLS LAST
        LIMIT 50
      `;
      params.push(gameId);
    } else {
      // Overall: sum of all scores per user
      query += `
        GROUP BY u.id, u.name, u.user_type
        ORDER BY "totalScore" DESC NULLS LAST
        LIMIT 50
      `;
    }

    const result = await auroraPool.query(query, params);
    return result.rows as LeaderboardEntry[];
  } catch (error) {
    console.error("[v0] Error fetching leaderboard:", error);
    return [];
  }
}
