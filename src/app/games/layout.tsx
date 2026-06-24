import { getSessionUser } from "@/lib/get-session";
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
    const sessionUser = await getSessionUser();
    if (sessionUser) {
      user = {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.name,
      };
    }
  } catch (error) {
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
