'use client';

import { createContext, useContext, useEffect, useState } from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  userType: 'student' | 'company';
  createdAt: string;
}

interface SessionContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch('/api/auth/session', { method: 'GET' });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        }
      } catch (error) {
        console.error('[v0] Session check failed:', error);
      } finally {
        setLoading(false);
      }
    }

    checkSession();
  }, []);

  async function signOut() {
    await fetch('/api/auth/signout', { method: 'POST' });
    setUser(null);
    window.location.href = '/arena/auth';
  }

  return (
    <SessionContext.Provider value={{ user, loading, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within SessionProvider');
  }
  return context;
}
