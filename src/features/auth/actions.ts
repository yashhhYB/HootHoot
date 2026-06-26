"use server";

import { signOut as coreSignOut } from "@/lib/auth-core";

/**
 * Server-side sign out action.
 * Clears the session cookie and deletes the session row in Aurora.
 */
export async function signOut() {
    try {
        await coreSignOut();
        return { status: true };
    } catch (error) {
        console.error("[v0] signOut failed:", error);
        return { status: false, error: String(error) };
    }
}
