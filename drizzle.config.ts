import { defineConfig } from "drizzle-kit";

// Aurora PostgreSQL — connection string built from env vars pulled via
// `vercel env pull` or injected at Vercel runtime.
// Password is handled by IAM at query time; here we use a dummy value
// because drizzle-kit only needs the host/db/user to generate SQL.
const host = process.env.PGHOST ?? "localhost";
const db   = process.env.PGDATABASE ?? "postgres";
const user = process.env.PGUSER ?? "postgres";

export default defineConfig({
  schema: "./src/lib/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // drizzle-kit push/generate uses this URL. The IAM token is supplied
    // at push time via the run-drizzle-push.mjs script that sets the password.
    url: `postgresql://${user}@${host}:5432/${db}?sslmode=require`,
  },
});
