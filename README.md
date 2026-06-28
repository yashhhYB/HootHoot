<div align="center">
  <img src="public/logo.png" alt="Hoot-Hoot Logo" width="180" />
  <h1>Hoot-Hoot — Cognitive Games Platform</h1>
  <p>
    <strong>Brain training games that actually prepare you for real placement tests (Capgemini, Cognizant, and more). Play free. No cap.</strong>
  </p>

  <p>
    <a href="https://hoot-hoot.com">Live Site</a> ·
    <a href="https://hoot-hoot.com/arena">Practice Arena</a> ·
    <a href="https://hoot-hoot.com/aws">AWS Status Dashboard</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js 16" />
    <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS 4" />
    <img src="https://img.shields.io/badge/AWS_Aurora_PostgreSQL-17.7-FF9900?style=for-the-badge&logo=amazon-aws&logoColor=white" alt="AWS Aurora" />
    <img src="https://img.shields.io/badge/DynamoDB-Single--Table-4053D6?style=for-the-badge&logo=amazon-dynamodb&logoColor=white" alt="DynamoDB" />
    <img src="https://img.shields.io/badge/Vercel-Deployed-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
  </p>
</div>

---

## What is this?

Hoot-Hoot is a full-stack cognitive games platform that lets students practice the exact kinds of brain puzzles companies like Capgemini and Cognizant throw at you during placement. We're talking Switch Challenge, Grid Challenge, Digit Challenge, Motion Challenge, Deductive, Inductive — plus a whole bunch of classic brain games (Sudoku, Minesweeper, Snake, etc.).

On top of that, companies can create proctored tests, share invite codes with candidates, and get a full analytics dashboard of results. Think of it as the Duolingo of placement prep, but with real proctoring and real AWS infrastructure behind it.

---

## Features at a Glance

| What | Details |
|---|---|
| **6 Cognitive Challenges** | Switch, Grid, Digit, Motion, Inductive, Deductive — placement-accurate |
| **8+ Brain Games** | Sudoku, Minesweeper, Snake, 15-Puzzle, Tic-Tac-Toe, Memory Match, Ant Smasher, Dice Roller |
| **Practice Arena** | 10 progressive questions, timed, with real-time leaderboard |
| **Company Portal** | HR accounts can create custom tests, set rules, share invite codes |
| **Proctor Engine** | Fullscreen enforcement, warning system, session tracking, anti-cheat logs |
| **Global Leaderboard** | Per-game rankings pulled live from Aurora |
| **AI Chat** | Google Gemini powered assistant for game strategy help |
| **Auth System** | Custom email/password auth with scrypt hashing + HttpOnly sessions |
| **AWS Status Page** | Live dashboard showing Aurora cluster health, tables, indexes, latency |
| **PWA Ready** | Service worker + manifest — installable on mobile |
| **SEO Optimized** | Sitemap, robots.txt, OG images, canonical URLs, structured data |

---

## Architecture Diagram

Here's how everything connects end-to-end:

```
                         ┌─────────────────────────────────────┐
                         │           User's Browser             │
                         │  Next.js App (React 19, Tailwind 4)  │
                         └──────────────┬──────────────────────┘
                                        │ HTTPS
                                        ▼
                         ┌─────────────────────────────────────┐
                         │          Vercel Edge Network         │
                         │   CDN · Static Assets · HLS Video    │
                         └──────────────┬──────────────────────┘
                                        │
                         ┌──────────────▼──────────────────────┐
                         │      Next.js 16 App Router (SSR)     │
                         │                                      │
                         │  Pages / Layouts (RSC)               │
                         │  ├── / (Home + Hero)                 │
                         │  ├── /play/* (6 Cognitive Games)     │
                         │  ├── /play/brain-games/* (8 games)   │
                         │  ├── /arena (Practice Arena)         │
                         │  ├── /company (HR Dashboard)         │
                         │  ├── /leaderboard (Global Ranks)     │
                         │  ├── /games/* (SEO Game Hub)         │
                         │  └── /aws (Live AWS Status Page)     │
                         │                                      │
                         │  API Routes                          │
                         │  ├── /api/auth/* (signup/in/out)     │
                         │  ├── /api/scores (game scoring)      │
                         │  ├── /api/leaderboard                │
                         │  ├── /api/arena/* (proctoring)       │
                         │  ├── /api/chat (Gemini AI)           │
                         │  └── /api/aws/status (health check)  │
                         └──────┬───────────────────┬──────────┘
                                │ IAM (OIDC)         │ IAM (OIDC)
                                ▼                    ▼
          ┌──────────────────────────┐   ┌─────────────────────────┐
          │   AWS Aurora PostgreSQL  │   │   Amazon DynamoDB        │
          │   (Primary Database)     │   │   (Single-Table Design)  │
          │                          │   │                          │
          │   16 Tables, 42 Indexes  │   │   Key-Value Lookups:     │
          │   ────────────────────   │   │   ────────────────────   │
          │   app_users              │   │   USER#email → profile   │
          │   user_sessions          │   │   SESSION#token → data   │
          │   game_score             │   │   GAME#id → scores       │
          │   game_attempt           │   │   ARENA#LEADERBOARD      │
          │   user_streak            │   │   USER#id → attempts     │
          │   companies              │   │                          │
          │   company_tests          │   │   Zero connection pools  │
          │   test_sessions          │   │   Serverless-native      │
          │   warning_logs           │   │   ~1ms point reads       │
          │   arena_questions        │   └─────────────────────────┘
          │   broadcast / polls      │
          │   + test_analytics VIEW  │
          │                          │
          │   Auth: AWS RDS Signer   │
          │   (15-min rotating IAM   │
          │   tokens via OIDC)       │
          │   No passwords in env    │
          │   VPC-restricted access  │
          └──────────────────────────┘
                         │
                         ▼
          ┌──────────────────────────┐
          │   External Services      │
          │   ─────────────────────  │
          │   Google Gemini (AI)     │
          │   Nodemailer (Email)     │
          │   Vercel Analytics       │
          └──────────────────────────┘
```

### Why Two AWS Databases?

**Aurora PostgreSQL** handles everything relational: user accounts, sessions, game scores, company tests, leaderboards, proctoring logs, and analytics. It's the backbone.

**DynamoDB** handles the key-value stuff where serverless cold-starts would otherwise kill a `pg` connection pool. It's stateless HTTPS — no pools to exhaust. Single-table design co-locates all access patterns in one partition for sub-millisecond reads. Specifically: user email lookups, session token validation, per-game score caching, and arena leaderboard.

Both databases use **AWS IAM authentication via Vercel OIDC federation** — no passwords anywhere in environment variables.

---

## Tech Stack

| Category | Tech | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | RSC, SSR, file-based routing |
| Language | TypeScript 5 | End-to-end type safety |
| Styling | Tailwind CSS 4 + shadcn/ui | Fast iteration, accessible components |
| Animation | Framer Motion + React Three Fiber | Fluid UI, 3D game elements |
| Primary DB | AWS Aurora PostgreSQL 17.7 | Relational data, complex queries |
| Secondary DB | Amazon DynamoDB | Key-value, serverless-safe |
| ORM/Query | Drizzle ORM + raw `pg` Pool | Schema migrations + fine-grained SQL |
| Auth | Custom (scrypt + HttpOnly sessions) | No third-party auth dependency |
| AI | Google Gemini (`@google/generative-ai`) | Game hints, strategy chat |
| Deployment | Vercel | Edge CDN, OIDC, serverless functions |
| Fonts | Space Grotesk, Hanken Grotesk, Press Start 2P | Custom feel |
| PWA | Service Worker + Web Manifest | Mobile installable |

---

## Database Schema (16 Tables)

### Auth Layer
- `app_users` — All user accounts (students + company HR). Roles: `student` | `company`. Passwords scrypt-hashed.
- `user_sessions` — HttpOnly session tokens with expiry. Indexed by token + user_id.

### Game Engine
- `game_score` — Every game attempt with score + timestamp per user per game.
- `game_attempt` — Daily attempt count per user per game slug (streak tracking).
- `user_streak` — Current streak + longest streak per user.
- `poll` / `poll_option` — Community polls with vote counts.

### Company & Arena
- `companies` — HR company accounts, linked to `app_users`.
- `company_tests` — Test configs: question sets, time limits, proctoring rules, invite codes.
- `test_sessions` — Candidate attempts: score, timing, question log, proctor log, status.
- `warning_logs` — Per-session anti-cheat events (tab switch, fullscreen exit, etc.).
- `arena_questions` — Question bank for the Practice Arena.
- `practice_attempts` — Standalone practice runs (not attached to company tests).

### Broadcast
- `broadcast` / `broadcast_recipient` — Email blast tracking, delivery status.

### Analytics View
- `test_analytics` — PostgreSQL VIEW giving companies live aggregated stats per test: avg score, pass rate, top score, avg time.

---

## Project Structure

```
hoot-hoot/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/                 # Login + Register pages
│   │   ├── (root)/                 # Home page
│   │   ├── api/                    # API route handlers
│   │   │   ├── auth/               # Signup, signin, signout, session
│   │   │   ├── scores/             # Game score submission
│   │   │   ├── leaderboard/        # Global leaderboard
│   │   │   ├── arena/              # Practice arena auth + warnings
│   │   │   ├── chat/               # Gemini AI chat
│   │   │   ├── aurora/migrate/     # DB schema auto-migration
│   │   │   └── aws/status/         # Live Aurora health check
│   │   ├── arena/                  # Practice Arena (competitive mode)
│   │   ├── company/                # Company HR portal + test creation
│   │   ├── play/                   # All playable games
│   │   │   ├── switch-challenge/
│   │   │   ├── grid-challenge/
│   │   │   ├── digit-challenge/
│   │   │   ├── motion-challenge/
│   │   │   ├── inductive-challenge/
│   │   │   ├── deductive-challenge/
│   │   │   └── brain-games/        # Sudoku, Snake, Minesweeper, etc.
│   │   ├── games/                  # SEO landing pages per game
│   │   ├── leaderboard/            # Global leaderboard page
│   │   ├── memory-game/            # Memory + Recall challenges
│   │   ├── rules/                  # How-to-play pages per challenge
│   │   └── aws/                    # AWS infrastructure status page
│   ├── components/
│   │   ├── Landing/                # Hero section
│   │   ├── arena/                  # ProctorEngine component
│   │   ├── common/                 # Header, Footer, ChatBubble, etc.
│   │   └── ui/                     # shadcn/ui primitives
│   ├── features/                   # Domain logic (Server Actions)
│   │   ├── auth/                   # Auth actions
│   │   ├── arena/                  # Arena question engine + actions
│   │   ├── company/                # Test creation, results
│   │   ├── scoring/                # Score submission
│   │   ├── leaderboard/            # Leaderboard queries
│   │   ├── streak/                 # Streak tracking
│   │   └── [game]/gameLogic.ts     # Per-game logic files
│   ├── lib/
│   │   ├── db.ts                   # Aurora connection (IAM + fallback)
│   │   ├── db-aurora.ts            # Aurora-specific helpers
│   │   ├── dynamo.ts               # DynamoDB single-table client
│   │   ├── auth-core.ts            # Password hashing, session management
│   │   └── schema.ts               # Drizzle ORM schema
│   ├── config/
│   │   ├── site.ts                 # URLs, SEO, game configs
│   │   └── navigation.ts           # Nav structure
│   ├── context/                    # React context (session, user)
│   ├── data/                       # Static game data
│   └── types/                      # Global TypeScript types
├── scripts/                        # DB migration + setup scripts
├── drizzle/                        # Drizzle migration files
├── public/                         # Static assets, fonts, PWA files
└── AWS_IMPLEMENTATION.md           # Detailed AWS infrastructure docs
```

---

## Getting Started Locally

### Prerequisites
- Node.js 20+
- pnpm 10+
- An Aurora PostgreSQL cluster **or** a Neon database (for local dev)

### 1. Clone

```bash
git clone https://github.com/yashbodade/HootHoot.git
cd HootHoot
```

### 2. Install

```bash
pnpm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

Fill in the values:

```env
# For local dev — use Neon as fallback (Aurora is VPC-restricted)
DATABASE_URL=postgresql://user:password@host/db

# Auth
BETTER_AUTH_SECRET=generate-with-openssl-rand-base64-32

# AI
GOOGLE_GENERATIVE_AI_API_KEY=your-gemini-key

# Email (optional for local)
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_USER=you@example.com
EMAIL_PASS=your-password

# AWS (injected automatically on Vercel by the integration)
# AWS_APG_PGHOST, AWS_APG_AWS_REGION, AWS_APG_AWS_ROLE_ARN, etc.
```

> **On Vercel**: Aurora and DynamoDB env vars are injected automatically by the Vercel AWS integration. You don't touch them.

### 4. Run migrations

The schema auto-runs on first Vercel cold start via `src/instrumentation.ts`. Locally, run:

```bash
pnpm db:push
```

### 5. Start dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## AWS Infrastructure

### Aurora PostgreSQL (Primary)

| Property | Value |
|---|---|
| Engine | PostgreSQL 17.7 |
| Region | us-east-1 |
| Auth | AWS IAM + RDS Signer (no passwords) |
| Network | VPC-restricted (Vercel prod network only) |
| Tables | 16 |
| Indexes | 42 |

**How auth works:**
1. Vercel function reads `VERCEL_OIDC_TOKEN` at runtime
2. Exchanges for short-lived AWS credentials via `awsCredentialsProvider()`
3. AWS RDS Signer generates a 15-minute IAM token
4. Token passed as `pg.Pool` password — auto-refreshed per connection
5. Aurora cluster validates the IAM token — no password ever hits env vars

### DynamoDB (Secondary — serverless-safe)

Single-table design with composite keys (`PK` + `SK`). Entity prefixes:

| Prefix | What It Stores |
|---|---|
| `USER#email` | User profiles |
| `SESSION#token` | Active sessions |
| `GAME#gameId` | Game leaderboard scores |
| `ARENA#LEADERBOARD` | Practice arena rankings |
| `USER#userId` + `ATTEMPT#...` | User attempt history |

No connection pools. Stateless HTTPS. Survives serverless cold starts.

### Auto-Migration

On every Vercel cold start, `src/instrumentation.ts` runs the full `FULL_SCHEMA_SQL` from `src/app/api/aurora/migrate/_schema.ts`. Every statement is `IF NOT EXISTS` — safe to run repeatedly. First deploy provisions all 16 tables + 42 indexes automatically.

---

## Proctoring System

The `ProctorEngine` (`src/components/arena/ProctorEngine.tsx`) enforces test integrity:

- **Fullscreen lock** — exits = warning
- **Tab switch detection** — `visibilitychange` event
- **Window blur detection** — focus loss = warning
- **Configurable max warnings** — company sets the limit; exceeding it = auto-disqualify
- **Warning logs** — every event stored in `warning_logs` table with metadata
- **Session status** — `in_progress` → `completed` / `disqualified` / `abandoned`

---

## API Routes

| Method | Route | What it does |
|---|---|---|
| POST | `/api/auth/signup` | Register user, hash password, create session |
| POST | `/api/auth/signin` | Verify password, create session |
| POST | `/api/auth/signout` | Delete session row + clear cookie |
| GET | `/api/auth/session` | Return current session user |
| POST | `/api/scores` | Submit game score |
| GET | `/api/leaderboard` | Top scores per game |
| POST | `/api/arena/auth` | Arena-specific session validation |
| POST | `/api/arena/warnings` | Log proctoring warnings |
| POST | `/api/chat` | Gemini AI chat completion |
| GET | `/api/aws/status` | Live Aurora cluster health |
| POST | `/api/aurora/migrate` | Trigger manual schema migration |

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Dev only | Neon fallback connection string |
| `BETTER_AUTH_SECRET` | Yes | Session signing secret |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Yes | Gemini AI key |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASS` | Optional | SMTP for email broadcasts |
| `NEXT_PUBLIC_GA_ID` | Optional | Google Analytics 4 ID |
| `AWS_APG_PGHOST` | Prod (auto) | Aurora cluster endpoint |
| `AWS_APG_AWS_REGION` | Prod (auto) | AWS region |
| `AWS_APG_AWS_ROLE_ARN` | Prod (auto) | IAM role ARN |
| `AWS_APG_PGUSER` | Prod (auto) | DB user |
| `AWS_APG_PGDATABASE` | Prod (auto) | Database name |
| `AWS_DYNAMODB_DYNAMODB_TABLE_NAME` | Prod (auto) | DynamoDB table name |
| `AWS_DYNAMODB_AWS_REGION` | Prod (auto) | DynamoDB region |
| `AWS_DYNAMODB_AWS_ROLE_ARN` | Prod (auto) | DynamoDB IAM role |
| `VERCEL_OIDC_TOKEN` | Prod (auto) | Vercel-injected OIDC token for AWS credential exchange |

> All `AWS_*` vars are injected automatically by the Vercel Aurora + DynamoDB integrations. No manual setup needed on Vercel.

---

## Demo Video

> Watch the full 3-minute walkthrough: **[YouTube — Hoot-Hoot Demo](#)**
>
> The video covers:
> - Playing Switch Challenge and Grid Challenge
> - Signing up and tracking scores on the leaderboard
> - The Practice Arena competitive mode
> - The Company Portal test creation + proctoring flow
> - The `/aws` live status dashboard proving Aurora + DynamoDB connectivity
> - Architecture walkthrough explaining why we chose each AWS service

---

## Hackathon Submission Checklist

| Item | Status |
|---|---|
| Live Vercel deployment | `https://hoot-hoot.com` |
| AWS Aurora PostgreSQL usage | `src/lib/db.ts` + `/aws` dashboard |
| AWS DynamoDB usage | `src/lib/dynamo.ts` + single-table design |
| Architecture diagram | Above in this README |
| IAM authentication proof | `awsCredentialsProvider()` + RDS Signer |
| Schema proof | 16 tables, 42 indexes — `/api/aws/status` live |
| Demo video | Under 3 minutes on YouTube |
| Database screenshot | `/aws` page showing live cluster stats |

---

## Security

| Layer | Mechanism |
|---|---|
| Passwords | Scrypt (64 iterations, 161-char output) — never stored plaintext |
| Sessions | HttpOnly, Secure, SameSite=Strict cookies |
| AWS Auth | IAM tokens via OIDC — no passwords in environment variables |
| Network | Aurora VPC-restricted (Vercel prod network only) |
| SQL Injection | Parameterized queries everywhere (`pg` Pool + Drizzle ORM) |
| Secrets | Zero secrets in env vars — IAM tokens only for AWS |
| Audit | CloudTrail logs every IAM access |
| TLS | Enforced on all Aurora connections |

---

## Contributing

Built by [Yash Bodade](https://github.com/yashbodade). Contributions are welcome — bug reports, feature ideas, or pull requests. Open an issue first for big changes so we can chat about it before you write a ton of code.

---

## License

MIT — see [LICENSE](LICENSE) for details.


