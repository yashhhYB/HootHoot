"use client";

import { useSession } from "@/context/SessionContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

interface ProtectedGameWrapperProps {
  children: React.ReactNode;
}

/**
 * Wraps game components to ensure user is authenticated.
 * If not logged in, redirects to auth page.
 * If loading, shows a spinner.
 */
export function ProtectedGameWrapper({ children }: ProtectedGameWrapperProps) {
  const { user, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      // Not authenticated - redirect to login
      router.push("/arena/auth?redirect=" + window.location.pathname);
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect above
  }

  return <>{children}</>;
}
