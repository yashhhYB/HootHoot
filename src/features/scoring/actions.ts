"use server";

import { headers } from "next/headers";
import { auroraPool } from "@/lib/db";
import { randomUUID } from "crypto";

/**
 * Save a game score for the authenticated user.
 * The user ID is obtained from the session token in the Authorization header.
 */
export async function saveScore(gameId: string, score: number) {
  try {
    const headerList = await headers();
    const authHeader = headerList.get("authorization");
    
    if (!authHeader?.startsWith("Bearer ")) {
      return { success: false, error: "Unauthorized" };
    }

    const token = authHeader.slice(7);

    // Verify token and get user ID from database
    const sessionResult = await auroraPool.query(
      `SELECT user_id FROM app_sessions WHERE token = $1 AND expires_at > NOW()`,
      [token]
    );

    if (sessionResult.rows.length === 0) {
      return { success: false, error: "Session expired or invalid" };
    }

    const userId = sessionResult.rows[0].user_id;

    // Save the game score
    await auroraPool.query(
      `INSERT INTO game_score (id, user_id, game_id, score, created_at) 
       VALUES ($1, $2, $3, $4, NOW())`,
      [randomUUID(), userId, gameId, score]
    );

    return { success: true };
  } catch (error) {
    console.error("Failed to save score:", error);
    return { success: false, error: "Failed to save score" };
  }
}
