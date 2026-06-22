/**
 * db-aurora.ts — thin query helpers that reuse the single Aurora pool from db.ts.
 * All arena / company server actions import from here; Drizzle ORM uses db.ts.
 * Having one pool avoids duplicate connections and double IAM token refreshes.
 */
import type { ClientBase } from "pg";
import { auroraPool } from "./db";

/** Execute a single parameterised query. */
export async function auroraQuery(text: string, params?: unknown[]) {
  return auroraPool.query(text, params as unknown[]);
}

/** Check out a client for multi-statement / transactional work. */
export async function withAuroraConnection<T>(
  fn: (client: ClientBase) => Promise<T>
): Promise<T> {
  const client = await auroraPool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}
