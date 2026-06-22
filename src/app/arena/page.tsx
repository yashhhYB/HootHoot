import { getArenaSession } from "@/lib/arena-auth";
import { getPracticeLeaderboard } from "@/features/arena/actions";
import ArenaLanding from "./ArenaLanding";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Practice Arena — Competitive Real-Time Challenges | Hoot-Hoot",
  description:
    "Test your skills against the clock. 10 progressive questions from our game bank. Real-time leaderboard — see how you stack up.",
};

export default async function ArenaPage() {
  const user = await getArenaSession();
  const leaderboard = await getPracticeLeaderboard(20).catch(() => []);

  return <ArenaLanding user={user} leaderboard={leaderboard} />;
}
