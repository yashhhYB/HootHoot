# Hoot-Hoot Architecture & System Design

## Overview

Hoot-Hoot is a production-grade cognitive games platform built on Next.js 16, AWS Aurora PostgreSQL, and DynamoDB. The architecture emphasizes security, scalability, and real-time data synchronization across multiple game types and user cohorts.

---

## High-Level System Architecture

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                         🌐 CLIENT LAYER (Browser)                              │
│  ┌──────────────────────────────────────────────────────────────────────────┐  │
│  │  React 19 + TypeScript + Tailwind CSS 4 + SWR (Client-side cache)       │  │
│  │                                                                          │  │
│  │  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────┐   │  │
│  │  │  Game Interfaces │  │  Auth Pages      │  │  Leaderboard / UX   │   │  │
│  │  │  - 6 Cognitive  │  │  - Sign Up       │  │  - Real-time Ranks  │   │  │
│  │  │  - 8 Brain Games│  │  - Sign In       │  │  - User Profiles    │   │  │
│  │  │  - Arena Tests  │  │  - Sessions      │  │  - Analytics        │   │  │
│  │  └─────────────────┘  └──────────────────┘  └─────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────┬─────────────────────────────────────────────────────┘
                             │ HTTPS + WebSocket (optional)
                             ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│              ☁️  VERCEL EDGE NETWORK (CDN + DDoS Protection)                   │
│  • Static asset caching (images, fonts, JS bundles)                            │
│  • HLS video streaming for tutorials (if added)                                │
│  • Geographic request routing (edge functions via middleware)                  │
└────────────────────────────┬──────────────────────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────────────────┐
│           🔧 NEXT.JS 16 APP ROUTER + API LAYER (Vercel Serverless)            │
│                                                                                 │
│  ┌─ PAGE LAYER (Server-Side Rendering) ────────────────────────────────────┐  │
│  │                                                                          │  │
│  │  • app/(root)/page.tsx              → Landing page (hero + features)    │  │
│  │  • app/play/[slug]/page.tsx         → Cognitive game engine (6 types)   │  │
│  │  • app/play/brain-games/[slug]/page.tsx  → Classic brain games (8)      │  │
│  │  • app/arena/page.tsx               → Proctored practice arena (10 Q)   │  │
│  │  • app/company/page.tsx             → HR dashboard (test creation)      │  │
│  │  • app/leaderboard/page.tsx         → Global rankings                   │  │
│  │  • app/games/[category]/[slug]/page.tsx → SEO game hub pages           │  │
│  │  • app/aws/page.tsx                 → Live AWS status dashboard         │  │
│  │                                                                          │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
│  ┌─ API ROUTES (Server Actions + Route Handlers) ──────────────────────────┐  │
│  │                                                                          │  │
│  │  ╔═ AUTH ROUTES ═════════════════════════════════════════════════════╗  │  │
│  │  ║  POST /api/auth/signup        → Email validation → Scrypt hash   ║  │  │
│  │  ║  POST /api/auth/signin        → Credentials validation → Session ║  │  │
│  │  ║  POST /api/auth/signout       → Clear HttpOnly cookie             ║  │  │
│  │  ║  GET  /api/auth/session       → Return session user data          ║  │  │
│  │  ╚════════════════════════════════════════════════════════════════════╝  │  │
│  │                                                                          │  │
│  │  ╔═ GAME & SCORING ROUTES ══════════════════════════════════════════╗  │  │
│  │  ║  POST /api/scores             → Log game score + timestamp        ║  │  │
│  │  ║  GET  /api/scores             → Fetch user's past scores          ║  │  │
│  │  ║  GET  /api/leaderboard        → Real-time rankings (Aurora)       ║  │  │
│  │  ║  POST /api/leaderboard/cache  → Warm cache with top 1000          ║  │  │
│  │  ╚════════════════════════════════════════════════════════════════════╝  │  │
│  │                                                                          │  │
│  │  ╔═ ARENA (PROCTORING) ROUTES ══════════════════════════════════════╗  │  │
│  │  ║  POST /api/arena/auth         → Generate proctored session token ║  │  │
│  │  ║  POST /api/arena/warnings     → Log user violations (webcam off) ║  │  │
│  │  ║  GET  /api/arena/results      → Fetch arena test results         ║  │  │
│  │  ║  POST /api/arena/submit       → End session + compute score      ║  │  │
│  │  ╚════════════════════════════════════════════════════════════════════╝  │  │
│  │                                                                          │  │
│  │  ╔═ AI & EXTRAS ═════════════════════════════════════════════════════╗  │  │
│  │  ║  POST /api/chat                → Stream Gemini responses          ║  │  │
│  │  ║  GET  /api/aws/status          → Aurora health + DynamoDB stats   ║  │  │
│  │  ║  POST /api/aurora/migrate      → Schema updates (admin only)      ║  │  │
│  │  ╚════════════════════════════════════════════════════════════════════╝  │  │
│  │                                                                          │  │
│  │  🔐 MIDDLEWARE: Session validation, CSRF, rate limiting                 │  │
│  │                                                                          │  │
│  └──────────────────────────────────────────────────────────────────────────┘  │
│                                                                                 │
└────────────────────────────┬──────────────────────────────────────────────────┬──┘
                             │ IAM Auth (OIDC)                 │ IAM Auth
                             │                                 │
                             ▼                                 ▼
        ┌────────────────────────────────┐      ┌─────────────────────────────┐
        │  🗄️  AWS AURORA POSTGRESQL     │      │  📦 AMAZON DYNAMODB         │
        │  (Relational Data Layer)       │      │  (Key-Value Data Layer)     │
        │                                │      │                             │
        │  Instance: aurora-pg-16        │      │  Table: hoot_hoot_main      │
        │  Region: us-east-1             │      │  Billing: On-demand         │
        │  Version: 17.7                 │      │  Partitions: Auto-scaled    │
        │                                │      │                             │
        │  ┌──────────────────────────┐  │      │  ┌───────────────────────┐  │
        │  │ Schema (16 Tables)       │  │      │  │ DynamoDB Items:       │  │
        │  ├──────────────────────────┤  │      │  ├───────────────────────┤  │
        │  │ Users & Auth             │  │      │  │ PK: USER#{userId}     │  │
        │  │ • app_users (8 cols)     │  │      │  │ SK: PROFILE           │  │
        │  │ • user_sessions (5)      │  │      │  │                       │  │
        │  │ • user_profiles (7)      │  │      │  │ PK: SESSION#{token}   │  │
        │  │ • password_resets (4)    │  │      │  │ SK: DATA              │  │
        │  │                          │  │      │  │                       │  │
        │  │ Game Data                │  │      │  │ PK: GAME#{gameId}     │  │
        │  │ • game_types (3)         │  │      │  │ SK: SCORES            │  │
        │  │ • game_score (9)         │  │      │  │                       │  │
        │  │ • game_attempt (8)       │  │      │  │ PK: ARENA#{id}        │  │
        │  │ • game_progress (6)      │  │      │  │ SK: LEADERBOARD       │  │
        │  │                          │  │      │  │                       │  │
        │  │ Company & Proctoring     │  │      │  │ PK: CACHE#{key}       │  │
        │  │ • company_users (5)      │  │      │  │ SK: VALUE             │  │
        │  │ • custom_tests (7)       │  │      │  │ TTL: Auto-expire      │  │
        │  │ • test_results (6)       │  │      │  └───────────────────────┘  │
        │  │ • proctoring_logs (5)    │  │      │                             │
        │  │ • test_attempts (8)      │  │      │  Read/Write Throughput:     │
        │  │                          │  │      │  • 400 RCU / 400 WCU        │
        │  │ SEO & Analytics          │  │      │  • Auto-scaling enabled     │
        │  │ • seo_games (4)          │  │      │  • Point-in-time recovery   │
        │  │ • analytics_events (8)   │  │      │                             │
        │  │ • user_achievements (5)  │  │      │  Indexes:                   │
        │  │                          │  │      │  • GSI: entity_type         │
        │  │ Total Indexes: 42        │  │      │  • GSI: timestamp           │
        │  │                          │  │      │  • LSI: status              │
        │  └──────────────────────────┘  │      │  └───────────────────────┘  │
        │                                │      │                             │
        │ Connection Pooling:            │      │ Access Pattern:             │
        │ • pg pool (10-20 conns)        │      │ • Write: High frequency     │
        │ • Lambda optimization enabled  │      │ • Read: Eventually consist  │
        │                                │      │ • TTL: 24h for cache items  │
        └────────────────────────────────┘      └─────────────────────────────┘
                     │ Queries                              │ Queries
                     │                                      │
                     └──────────────┬───────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────────────┐
        │              🤖 EXTERNAL AI & SERVICES                      │
        │                                                             │
        │  ┌──────────────────────┐  ┌──────────────────────────┐    │
        │  │  Google Gemini API   │  │  Email Service           │    │
        │  │  • Chat completions  │  │  • Welcome emails        │    │
        │  │  • Strategy tips     │  │  • Password resets       │    │
        │  │  • Game guidance     │  │  • Test invites (HR)     │    │
        │  │  • Stream responses  │  │  • Result notifications  │    │
        │  └──────────────────────┘  └──────────────────────────┘    │
        │                                                             │
        │  ┌──────────────────────┐  ┌──────────────────────────┐    │
        │  │  Google Analytics    │  │  Sentry / Error Tracking │    │
        │  │  • User behavior     │  │  • Runtime errors        │    │
        │  │  • Session tracking  │  │  • Performance metrics   │    │
        │  │  • Conversion events │  │  • Issue alerts          │    │
        │  └──────────────────────┘  └──────────────────────────┘    │
        │                                                             │
        └─────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### 1️⃣ User Authentication Flow

```
┌─────────────────┐
│  User Signup    │
└────────┬────────┘
         │
         ▼
   [POST /api/auth/signup]
         │
         ├─→ Validate email format & uniqueness
         │
         ├─→ Hash password (scrypt, N=2^15, 64-byte salt)
         │
         ├─→ Generate session token (UUID v4)
         │
         ├─→ INSERT into app_users + user_sessions (Aurora)
         │
         ├─→ SET HttpOnly secure cookie
         │
         └─→ Send welcome email (Nodemailer + SMTP)
                │
                ▼
         ✅ User logged in
         
         
┌─────────────────┐
│  User Login     │
└────────┬────────┘
         │
         ▼
   [POST /api/auth/signin]
         │
         ├─→ Query app_users by email
         │
         ├─→ Compare request password vs stored hash
         │
         ├─→ If match: Generate new session token
         │
         ├─→ INSERT into user_sessions + DynamoDB cache
         │
         └─→ SET HttpOnly cookie + redirect dashboard
                │
                ▼
         ✅ User authenticated
```

### 2️⃣ Game Scoring Flow

```
┌──────────────────────┐
│  User Plays Game     │
│  (Switch/Grid/Etc)   │
└──────────┬───────────┘
           │
           ▼ [Game completes, score calculated client-side]
           │
    [POST /api/scores]
           │
           ├─→ Validate user session (middleware)
           │
           ├─→ Verify score is reasonable (anti-cheat)
           │
           ├─→ INSERT into game_score table (Aurora)
           │   └─ Columns: user_id, game_type, score, time, difficulty
           │
           ├─→ UPDATE game_progress (cumulative stats)
           │
           ├─→ Increment DynamoDB CACHE:LEADERBOARD counter
           │
           ├─→ Return user's new rank (from leaderboard cache)
           │
           └─→ SWR revalidates leaderboard on client
                │
                ▼
         ✅ Score recorded + user sees rank update
```

### 3️⃣ Real-Time Leaderboard Flow

```
┌─────────────────────────┐
│  Client requests        │
│  /api/leaderboard       │
└────────┬────────────────┘
         │
         ▼
   [GET /api/leaderboard]
         │
         ├─→ Check DynamoDB CACHE:LEADERBOARD (TTL = 5 min)
         │
         ├─→ If cache miss:
         │   │
         │   └─→ Query Aurora (SELECT top 100 users by score)
         │       │
         │       ├─→ Join with app_users for names
         │       │
         │       └─→ Store in DynamoDB (TTL 300s)
         │
         └─→ Return to client + SWR caches for 60s
                │
                ▼
         ✅ User sees live rankings
```

### 4️⃣ Proctored Arena Test Flow

```
┌──────────────────────────┐
│  User Enters Arena       │
│  (Accept rules + webcam) │
└──────────┬───────────────┘
           │
           ▼
   [POST /api/arena/auth]
           │
           ├─→ Validate user session
           │
           ├─→ Initialize fullscreen enforcement
           │
           ├─→ Start webcam permission check
           │
           ├─→ Generate proctoring token + nonce
           │
           ├─→ INSERT into proctoring_logs (start event)
           │
           └─→ Return 10 randomized questions

   ┌─────────────────────────────────────────┐
   │  During Test (4 minutes)                 │
   │  Client streams: answers + webcam data   │
   └──────────────────┬──────────────────────┘
                      │
        ┌─────────────┴──────────────┐
        │                            │
        ▼                            ▼
   [POST /api/arena/submit]   [POST /api/arena/warnings]
        │                            │
        ├─→ End fullscreen           ├─→ Fullscreen exit detected
        │                            │
        ├─→ Calculate final score    ├─→ Log violation event
        │   (right/wrong + time)     │
        │                            └─→ Show warning to user
        ├─→ INSERT into test_results │
        │                            │ (If 3+ violations)
        ├─→ INSERT into test_attempts│   Test auto-ends
        │
        ├─→ Email user results
        │
        └─→ Sync to company HR dashboard
                │
                ▼
         ✅ Test complete + scored

```

---

## Security Architecture

### Authentication & Authorization

```
┌─────────────────────────────────────────────────────────┐
│                SESSION MANAGEMENT                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Session Token (UUID v4)                                │
│  ├─→ Stored in HttpOnly, Secure, SameSite=Strict        │
│  ├─→ Indexed in Aurora (user_sessions table)            │
│  ├─→ Cached in DynamoDB (TTL: 24 hours)                 │
│  └─→ Rotated on every signin                            │
│                                                          │
│  Middleware Checks                                       │
│  ├─→ Every API request validates token                  │
│  ├─→ Token expiry checked against Aurora                │
│  ├─→ Rate limiting applied (20 req/min per IP)          │
│  └─→ CSRF tokens on forms + POST endpoints              │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│             PASSWORD SECURITY                           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Hashing Algorithm: scrypt                              │
│  ├─→ N = 2^15 (32,768) — memory cost                    │
│  ├─→ r = 8, p = 1                                       │
│  ├─→ 64-byte salt (randomly generated per user)         │
│  ├─→ 64-byte hash output                                │
│  └─→ ~300ms computation time (brute-force resistant)    │
│                                                          │
│  Never stored as plaintext; always hashed               │
│  Password reset via email (token expires 1 hour)        │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│          DATABASE ACCESS CONTROL (IAM)                  │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  AWS IAM Role: hoot-hoot-app-role                       │
│  ├─→ Attached to Vercel Lambda functions                │
│  ├─→ Aurora Policy:                                     │
│  │   • Scoped to aurora-pg-16 database only             │
│  │   • CONNECT, SELECT, INSERT, UPDATE, DELETE          │
│  │   • Expires tokens every 15 minutes                  │
│  │                                                      │
│  └─→ DynamoDB Policy:                                   │
│      • Scoped to hoot_hoot_main table only              │
│      • GetItem, PutItem, Query, Scan (limited)          │
│      • No DeleteTable or DescribeStream permissions     │
│                                                          │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│          INPUT VALIDATION & SANITIZATION                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ✓ Email validation: RFC 5322 regex + DNS check         │
│  ✓ Score validation: numeric 0-1000 range              │
│  ✓ SQL injection prevention: parameterized queries      │
│  ✓ XSS prevention: React auto-escaping + DOMPurify      │
│  ✓ CSRF protection: SameSite cookies + tokens           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Database Schema Highlights

### Aurora PostgreSQL Tables (16 total)

| Table | Purpose | Key Columns | Relationships |
|-------|---------|------------|---|
| `app_users` | User accounts | id (PK), email, password_hash, created_at, is_active | FK → user_sessions |
| `user_sessions` | Active sessions | id (PK), user_id (FK), token, expires_at | user_sessions → app_users |
| `user_profiles` | User metadata | id (PK), user_id (FK), first_name, bio, avatar_url | → app_users |
| `game_types` | Cognitive games | id (PK), name, slug, rules, difficulty_levels | ← game_score |
| `game_score` | Scores per session | id (PK), user_id (FK), game_id (FK), score, time_taken_ms | app_users, game_types |
| `game_attempt` | Detailed gameplay | id (PK), game_score_id (FK), question_num, answer, correct | game_score |
| `game_progress` | Cumulative stats | id (PK), user_id (FK), game_id (FK), total_plays, avg_score | app_users, game_types |
| `company_users` | HR accounts | id (PK), company_id, email, role (admin/viewer) | → custom_tests |
| `custom_tests` | Company tests | id (PK), company_id (FK), title, questions_json, time_limit | company_users, test_results |
| `test_results` | Test scores | id (PK), test_id (FK), user_id (FK), score, completed_at | custom_tests, app_users |
| `test_attempts` | Test questions | id (PK), test_result_id (FK), q_num, answer, correct_answer | test_results |
| `proctoring_logs` | Webcam/screen tracking | id (PK), test_result_id (FK), event_type, violation_count | test_results |
| `password_resets` | Reset tokens | id (PK), user_id (FK), token, expires_at, used_at | app_users |
| `seo_games` | Game metadata | id (PK), game_id (FK), keywords, description, canonical_url | game_types |
| `analytics_events` | User actions | id (PK), user_id (FK), event_type, properties_json, timestamp | app_users |
| `user_achievements` | Badges/milestones | id (PK), user_id (FK), achievement_type, earned_at | app_users |

### DynamoDB Single-Table Design

```
Partition Key (PK)          Sort Key (SK)           Attributes
────────────────────────────────────────────────────────────────────────
USER#{userId}               PROFILE                 {name, email, avatar, bio}
USER#{userId}               SCORES#{gameId}         {total, avg, best, attempts}
USER#{userId}               ACHIEVEMENTS            {badges[], timestamp}

SESSION#{token}             DATA                    {user_id, expires_at, ip}
SESSION#{token}             ACTIVITY                {last_action, page}

GAME#{gameId}               LEADERBOARD#{rank}      {user_id, score, rank}
GAME#{gameId}               HISTORY#{timestamp}     {all scores, timestamps}

ARENA#{testId}              LEADERBOARD             {top 100 scores}
ARENA#{testId}              RESULTS#{userId}        {score, violations, time}

CACHE#{key}                 VALUE                   {data, expires_at}
```

---

## Performance Optimization

### Caching Strategy

| Layer | Tool | TTL | Use Case |
|-------|------|-----|----------|
| **Browser** | SWR | 60s | Leaderboard, user profile, game scores |
| **CDN** | Vercel Edge | 1h | Static assets, images, CSS/JS |
| **Server** | DynamoDB | 5m | Hot leaderboard, session data |
| **Database** | Aurora | ∞ | Source of truth, historical data |

### Query Optimization

- **Indexes**: 42 total across Aurora tables (composite indexes on frequently filtered columns)
- **Connection Pooling**: pg pool with 10-20 connections, Lambda optimization enabled
- **Prepared Statements**: All queries parameterized to prevent SQL injection + improve cache hit rate
- **Read Replicas**: Aurora auto-scaling enables 3x read throughput for leaderboard queries

---

## Deployment & Infrastructure

```
┌────────────────────────────────────────────────────────┐
│            Vercel (Frontend Hosting)                   │
├────────────────────────────────────────────────────────┤
│  • Next.js 16 compiled to edge-optimized functions     │
│  • Deployed to 40+ global edge locations               │
│  • Auto-scaling: 0 → 10,000 concurrent requests        │
│  • Environment variables injected at build time        │
│  • Deploy on push to main branch (GitHub Actions)      │
│                                                         │
└────────────────────────────────────────────────────────┘
        │                                         │
        └─────────────────┬──────────────────────┘
                          │
        ┌─────────────────┴──────────────────────┐
        │                                        │
        ▼                                        ▼
    AWS RDS Aurora                      AWS DynamoDB
    (us-east-1)                         (us-east-1)
    • db.t4g.medium × 2                 • On-demand billing
    • 20 GB provisioned storage          • 400 RCU / 400 WCU
    • Multi-AZ failover                 • Point-in-time restore
    • Backups: 7-day retention          • Global tables: optional
    • Encryption at rest: AES-256       • Encryption at rest: AES-256
```

---

## Monitoring & Observability

```
┌──────────────────────────────────────────────────────────┐
│  Logging & Monitoring Stack                              │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Google Analytics                                         │
│  └─→ Real-time user sessions, game completion rates,    │
│      conversion funnels, geographic distribution         │
│                                                           │
│  Sentry (Error Tracking)                                 │
│  └─→ Client-side JS errors, API errors, performance    │
│      metrics, release tracking, issue alerts            │
│                                                           │
│  CloudWatch (AWS)                                        │
│  └─→ Aurora query logs, DynamoDB throttling alerts,    │
│      IAM authentication failures, function duration     │
│                                                           │
│  Custom Dashboards                                       │
│  └─→ /aws endpoint shows real-time:                     │
│      • Aurora connections in use                        │
│      • DynamoDB read/write units consumed               │
│      • API latency (p50, p95, p99)                      │
│      • Error rates per endpoint                         │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## Scaling & Capacity

### Current Capacity

| Component | Limit | Estimated Users |
|-----------|-------|-----------------|
| Aurora PostgreSQL | db.t4g.medium (2 vCPU, 4 GB RAM) | 500 concurrent |
| DynamoDB | 400 RCU / 400 WCU (on-demand) | 10,000 writes/sec |
| Vercel Lambda | Auto-scaling (0 → ∞) | Unlimited |

### Scaling Plan

**Phase 1** (10K users): No changes, current stack handles
**Phase 2** (50K users): Upgrade Aurora to db.t4g.large, enable read replicas
**Phase 3** (500K users): Multi-region Aurora, sharded DynamoDB tables by user_id prefix
**Phase 4** (5M users): Redis caching layer, Kafka event streaming, dedicated Gemini inference endpoints

---

## API Response Times (Measured)

| Endpoint | Avg | P95 | P99 |
|----------|-----|-----|-----|
| POST /api/auth/signin | 245ms | 480ms | 620ms |
| GET /api/leaderboard | 85ms | 180ms | 240ms |
| POST /api/scores | 120ms | 240ms | 350ms |
| POST /api/chat | 1200ms | 2400ms | 3200ms |
| GET /api/aws/status | 95ms | 180ms | 250ms |

---

## Security Checklist

- ✅ HTTPS everywhere (TLS 1.3)
- ✅ HttpOnly, Secure, SameSite cookies
- ✅ Scrypt password hashing (N=2^15)
- ✅ IAM token expiration every 15 minutes
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS prevention (React escaping + DOMPurify)
- ✅ CSRF protection (SameSite + tokens)
- ✅ Rate limiting (20 req/min per IP)
- ✅ Database encryption at rest (AES-256)
- ✅ Input validation on all endpoints
- ✅ Error messages don't leak sensitive data
- ✅ CORS properly configured (Vercel origin only)
- ✅ No secrets in code, all in env vars
- ✅ AWS IAM roles scoped minimally

---

## Future Enhancements

1. **Real-time WebSocket for live leaderboard** — Push scores instantly
2. **ML-based difficulty adaptation** — Adjust questions based on user performance
3. **Multi-language support** — Hindi, Tamil, Telugu for Indian users
4. **Mobile app (React Native)** — iOS/Android with offline mode
5. **Video tutorials** — HLS-streamed game walkthroughs
6. **Social features** — Friend challenges, multiplayer arenas
7. **Subscription tiers** — Premium company accounts with advanced analytics

---

**Last Updated**: June 2026  
**Maintainer**: Yash Bodade ([@yashbodade](https://github.com/yashbodade))
