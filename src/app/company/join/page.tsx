import { getCurrentUser } from "@/lib/auth-core";
import JoinTestClient from "./JoinTestClient";
import type { Metadata } from "next";
import type { ArenaUser } from "@/types/arena";

export const metadata: Metadata = {
  title: "Join Test — HootHoot",
  description: "Enter your invite code to take a company assessment test.",
};

export default async function JoinTestPage() {
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
  return <JoinTestClient user={user} />;
}
