"use server";

import { getCurrentUser } from "@/lib/auth-core";
import { db } from "@/lib/db";
import { gameScores } from "@/lib/schema";
import { randomUUID } from "crypto";

/**
 * Save a game score for the authenticated user.
 */
export async function saveScore(gameId: string, score: number) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    await db.insert(gameScores).values({
      id: randomUUID(),
      userId: user.id,
      gameId,
      score,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to save score:", error);
    return { success: false, error: "Failed to save score" };
  }
}
