import type { ReactNode } from "react";
import Header from "@/components/common/Header";
import { UserProvider } from "@/context/UserContext";

export default function ArenaLayout({ children }: { children: ReactNode }) {
  return (
    <UserProvider user={null} streak={{ currentStreak: 0, longestStreak: 0 }}>
      <Header />
      {children}
    </UserProvider>
  );
}
