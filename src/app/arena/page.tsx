import { auth } from "@/lib/auth";
import { headers } from "next/headers";
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
  const session = await auth.api.getSession({ headers: await headers() }).catch(() => null);

  const user: ArenaUser | null = session?.user
    ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name ?? "Player",
        role: "student",
        avatar_url: session.user.image ?? null,
        created_at: session.user.createdAt?.toISOString() ?? new Date().toISOString(),
      }
    : null;

  const leaderboard = await getPracticeLeaderboard(20).catch(() => []);

  return <ArenaLanding user={user} leaderboard={leaderboard} />;
}
