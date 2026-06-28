# Hoot-Hoot Setup & Migration Guide

This guide walks you through setting up the Hoot-Hoot Competitive Arena Platform with AWS Aurora PostgreSQL and the Simple Auth system.

## Prerequisites

- AWS account with Aurora PostgreSQL cluster
- Vercel account connected to GitHub repository
- AWS IAM role configured for Vercel OIDC authentication
- Node.js 18+, pnpm or npm

## Architecture Overview

```
User Application (Next.js 16 on Vercel)
    ↓
Simple Auth API Routes (/api/auth/*)
    ↓
Session Context (Client-side state)
    ↓
AWS Aurora PostgreSQL (IAM auth)
    ↓
Database Schema (app_users, sessions, game_scores, etc.)
```

## Step 1: Environment Setup

The Vercel AWS Integration automatically injects these environment variables:

```env
AWS_REGION=us-east-1
AWS_ROLE_ARN=arn:aws:iam::ACCOUNT:role/ROLE_NAME
VERCEL_OIDC_TOKEN=<automatic>
PGHOST=your-cluster.cluster-xxxxx.region.rds.amazonaws.com
PGUSER=postgres
PGDATABASE=hoothoot
PGPORT=5432
```

**No manual configuration needed** – Vercel's AWS Integration handles this automatically.

## Step 2: Database Schema Setup

The database schema is defined in migration files in the `scripts/` directory:

| File | Purpose |
|------|---------|
| `005-simple-auth.sql` | Creates `app_users` and `sessions` tables |
| `006-game-scoring.sql` | Creates `game_scores` and related tables |
| `007-game-scores-table.sql` | Indexes and constraints for game_scores |
| `008-create-game-scores-indexes.sql` | Additional performance indexes |

### Run Migrations

You have two options:

#### Option A: Using Vercel Dashboard (Recommended)
1. Go to your Vercel project settings
2. Navigate to the "Database" or "SQL" section
3. Open a query editor
4. Copy and paste each migration file in order (005 → 008)
5. Execute each one

#### Option B: Using Command Line
If your AWS credentials are configured locally:

```bash
# Install AWS CLI and configure credentials
aws configure

# Run migrations using psql (if installed)
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f scripts/005-simple-auth.sql
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f scripts/006-game-scoring.sql
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f scripts/007-game-scores-table.sql
psql -h $PGHOST -U $PGUSER -d $PGDATABASE -f scripts/008-create-game-scores-indexes.sql
```

#### Option C: Using the Migration Node Script
```bash
# Ensure AWS credentials are in environment, then run:
node scripts/migrate.js
```

## Step 3: Verify Schema

After running migrations, verify the schema was created:

```sql
-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Should show:
-- app_users
-- sessions
-- game_scores
-- practice_attempts
-- company_tests
-- test_sessions
-- etc.
```

## Step 4: Application Setup

### Install Dependencies
```bash
pnpm install
```

### Build & Test
```bash
# Build the application
pnpm build

# Run type-check (should show 0 errors)
pnpm exec tsc --noEmit

# Start development server
pnpm dev
```

### Verify API Endpoints
```bash
# Test signup endpoint
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@hoothoot.dev","password":"Test123!","name":"Test User","userType":"student"}'

# Response should include user.id and token

# Test session endpoint
# (use token from signup response)
curl -X GET http://localhost:3000/api/auth/session \
  -H "Authorization: Bearer <TOKEN>"

# Should return the user object
```

## System Features

### Authentication (/api/auth/)
- `POST /api/auth/signup` – Create new account
- `POST /api/auth/signin` – Authenticate user
- `POST /api/auth/signout` – Logout user
- `GET /api/auth/session` – Get current session

### Scoring (/api/score/)
- `POST /api/score/save` – Save game score
- `GET /api/scores` – Get user's score history

### Leaderboard (/api/leaderboard/)
- `GET /api/leaderboard` – Get global leaderboard
- `GET /api/leaderboard?gameId=GAME_ID` – Game-specific leaderboard

## Database Schema

### app_users
```sql
id UUID PRIMARY KEY
email VARCHAR(255) UNIQUE
password_hash TEXT
name VARCHAR(255)
user_type VARCHAR(50) -- 'student' or 'company'
created_at TIMESTAMP
```

### sessions
```sql
id UUID PRIMARY KEY
user_id UUID (FK app_users)
token VARCHAR(255) UNIQUE
expires_at TIMESTAMP
created_at TIMESTAMP
```

### game_scores
```sql
id UUID PRIMARY KEY
user_id UUID (FK app_users)
game_id VARCHAR(255)
score INTEGER CHECK (score >= 0)
created_at TIMESTAMP
```

### Additional Tables
- `practice_attempts` – Arena game attempts
- `company_tests` – Custom assessment tests
- `test_sessions` – Candidate test results

## Troubleshooting

### Error: "relation X does not exist"
**Solution:** Run all migration scripts in order. The application expects specific tables to exist.

### Error: "Connection terminated due to timeout"
**Solution:** The OIDC token expired. Restart the dev server or redeploy to get a fresh token.

### Error: "Unauthorized" on API calls
**Solution:** Ensure the auth token in the header is valid and hasn't expired. The token expires when the session expires.

### Database Connection Issues
**Solution:** Verify AWS credentials are correctly configured:
```bash
echo $AWS_REGION $AWS_ROLE_ARN $PGHOST
```

## Deployment to Vercel

1. **Push to GitHub:**
   ```bash
   git push origin your-branch
   ```

2. **Create Pull Request or Merge to Main:**
   Vercel will automatically deploy preview/production builds.

3. **Run Migrations on Production:**
   The migration scripts must still be run manually on the production Aurora instance using the Vercel dashboard SQL editor.

4. **Verify Production:**
   ```bash
   curl https://your-vercel-domain.com/api/auth/session
   ```

## Features Ready to Use

- ✅ User Authentication (email/password)
- ✅ Game Scoring System
- ✅ Real-time Leaderboards
- ✅ Practice Arena
- ✅ Brain Games (Sudoku, IQ Tests)
- ✅ Cognitive Challenges
- ✅ Company Dashboard
- ✅ Session Management

## Next Steps

1. Run all migration scripts (Step 2)
2. Verify schema creation (Step 3)
3. Test the application locally (Step 4)
4. Deploy to Vercel production
5. Run migrations on production database

## Support

For issues or questions:
- Check the troubleshooting section above
- Review AWS Aurora documentation
- Check Vercel deployment logs
- Visit the GitHub issues page

---

**Last Updated:** June 28, 2026  
**Version:** 1.0.0  
**Stack:** Next.js 16 + AWS Aurora + Simple Auth
