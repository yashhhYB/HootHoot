import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { UserProvider } from "@/context/UserContext";
import Footer from "@/components/common/Footer";
import Header from "@/components/common/Header";

export default async function GamesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user: any = null;

  try {
    const session = await auth.api.getSession({ headers: await headers() });
    user = session?.user ?? null;
  } catch (error) {
    if (error instanceof Error && ((error as any).digest === "DYNAMIC_SERVER_USAGE" || error.message?.includes("Dynamic server usage"))) {
      throw error;
    }
    // DB unreachable — render as guest
  }

  return (
    <UserProvider user={user} streak={{ currentStreak: 0, longestStreak: 0 }}>
      <Header />
      <main>{children}</main>
      <Footer />
    </UserProvider>
  );
}
