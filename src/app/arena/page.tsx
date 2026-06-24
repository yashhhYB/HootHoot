import { getSessionUser } from "@/lib/get-session";
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
  const sessionUser = await getSessionUser();
  
  const user: ArenaUser | null = sessionUser
    ? {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.name,
        role: sessionUser.userType === "company" ? "company" : "student",
        avatar_url: null,
        created_at: sessionUser.createdAt,
      }
    : null;

  const leaderboard = await getPracticeLeaderboard(20).catch(() => []);

  return <ArenaLanding user={user} leaderboard={leaderboard} />;
}
