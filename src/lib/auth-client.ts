import { createAuthClient } from "better-auth/react";

// Using relative baseURL works in all environments (local dev, preview, prod)
// without needing BETTER_AUTH_URL to be set.
export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000",
});
