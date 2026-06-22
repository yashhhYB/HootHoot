import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { Signer } from "@aws-sdk/rds-signer";
import { fromWebToken } from "@aws-sdk/credential-providers";
import { awsCredentialsProvider } from "@vercel/functions/oidc";
import { sendWelcomeEmail } from "./mailer";

/**
 * Better Auth is configured with a dedicated pg Pool that authenticates
 * against Aurora PostgreSQL via IAM — no Supabase / DATABASE_URL needed.
 */

function getCredentials() {
  if (process.env.VERCEL_OIDC_TOKEN) {
    return fromWebToken({
      roleArn: process.env.AWS_ROLE_ARN!,
      webIdentityToken: process.env.VERCEL_OIDC_TOKEN,
      clientConfig: { region: process.env.AWS_REGION },
    });
  }
  return awsCredentialsProvider({
    roleArn: process.env.AWS_ROLE_ARN!,
    clientConfig: { region: process.env.AWS_REGION },
  });
}

const signer = new Signer({
  credentials: getCredentials(),
  region: process.env.AWS_REGION,
  hostname: process.env.PGHOST!,
  username: process.env.PGUSER ?? "postgres",
  port: 5432,
});

// Better Auth manages its own pool to avoid Drizzle-adapter complexity.
// The token is cached by the Signer for up to 15 min automatically.
const authPool = new Pool({
  host: process.env.PGHOST,
  database: process.env.PGDATABASE ?? "postgres",
  port: 5432,
  user: process.env.PGUSER ?? "postgres",
  password: () => signer.getAuthToken(),
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

export const auth = betterAuth({
  database: {
    // Better Auth's built-in pg adapter — works directly with node-postgres Pool
    type: "pg",
    pool: authPool,
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 6,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,       // 1 day
  },
  trustedOrigins: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
  ],
  rateLimit: {
    window: 60,
    max: 20,
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            await sendWelcomeEmail(user.email, user.name ?? "there");
          } catch (err) {
            console.error("[mailer] welcome email failed:", err);
          }
        },
      },
    },
  },
});
