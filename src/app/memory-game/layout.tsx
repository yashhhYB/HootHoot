import { getSessionUser } from "@/lib/get-session";
import { UserProvider } from "@/context/UserContext";
import Header from "@/components/common/Header";

export default async function DashboardLayout({
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
    <UserProvider user={user ?? null}>
      <Header />
      <main className="flex-1 p-6">{children}</main>
    </UserProvider>
  );
}
