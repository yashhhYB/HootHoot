import { createAuthClient } from "better-auth/react";

// On the client: use the current origin (works for localhost, preview, prod).
// During SSR: fall back to NEXT_PUBLIC_APP_URL (set on Vercel) or localhost.
const baseURL =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const authClient = createAuthClient({ baseURL });
