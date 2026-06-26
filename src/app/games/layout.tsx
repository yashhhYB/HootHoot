import { getCurrentUser } from "@/lib/auth-core";
import { UserProvider } from "@/context/UserContext";
import Footer from "@/components/common/Footer";
import Header from "@/components/common/Header";
import type { User } from "@/types/user";

export default async function GamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const authUser = await getCurrentUser().catch(() => null);
  const user: User | null = authUser
    ? {
        id: authUser.id,
        name: authUser.name,
        email: authUser.email,
        emailVerified: true,
        image: authUser.avatar_url,
        createdAt: authUser.createdAt,
        updatedAt: authUser.updatedAt,
      }
    : null;

  return (
    <UserProvider user={user} streak={{ currentStreak: 0, longestStreak: 0 }}>
      <Header />
      <main>{children}</main>
      <Footer />
    </UserProvider>
  );
}
