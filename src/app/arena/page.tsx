import { getCurrentUser } from "@/lib/auth-core";
import { getPracticeLeaderboard } from "@/features/arena/actions";
import ArenaLanding from "./ArenaLanding";
import type { Metadata } from "next";
import type { ArenaUser } from "@/types/arena";

export const metadata: Metadata = {
  title: "Practice Arena — Competitive Real-Time Challenges | Hoot-Hoot",
  description:
    "Test your skills against the clock. 10 progressive questions from our game bank. Real-time leaderboard — see how you stack up.",
};

export default async function ArenaPage() {
  const authUser = await getCurrentUser().catch(() => null);

  const user: ArenaUser | null = authUser
    ? {
        id: authUser.id,
        email: authUser.email,
        name: authUser.name,
        role: authUser.role,
        avatar_url: authUser.avatar_url,
        created_at: authUser.createdAt.toISOString(),
      }
    : null;

  const leaderboard = await getPracticeLeaderboard(20).catch(() => []);

  return <ArenaLanding user={user} leaderboard={leaderboard} />;
}
