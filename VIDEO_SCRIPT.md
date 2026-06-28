# Hoot-Hoot — Demo Video Script

**Duration**: 3-4 minutes  
**Format**: Screen recording + voiceover  
**Tone**: Casual, confident, technical (for hackathon judges)

---

## Scene 1: Hook & Introduction (0:00 - 0:20)

**[Screen: Landing page — logo + hero section]**

**Voiceover:**  
"Hey! This is Hoot-Hoot — a full-stack cognitive games platform built for Capgemini and Cognizant placement prep. It's got six cognitive challenges, eight classic brain games, a proctored practice arena, and a company portal for HR teams to create custom tests. Everything runs on AWS Aurora PostgreSQL and DynamoDB, deployed on Vercel, and it's completely open source. Let me show you what's under the hood."

**Action:**  
- Slowly scroll the landing page
- Highlight the feature cards (6 cognitive games, arena, leaderboard)
- Cursor hovers over "Play Now" button

---

## Scene 2: Core Features Overview (0:20 - 0:50)

**[Screen: Navigate to `/play/switch-challenge`]**

**Voiceover:**  
"Here's the Switch Challenge — one of the six cognitive games companies actually use in their placement tests. You're training pattern switching, working memory, and decision speed. Each game has a timer, tracks your score in real time, and logs everything to Aurora PostgreSQL."

**Action:**  
- Play a quick 10-second round of Switch Challenge
- Show the score submit animation
- Navigate to `/leaderboard` and show real-time rankings updating

**[Screen: Leaderboard page with live ranks]**

**Voiceover:**  
"The leaderboard pulls live from Aurora, ranks all users globally, and caches hot data in DynamoDB so it loads in under 100 milliseconds. SWR on the frontend keeps it fresh."

---

## Scene 3: Proctored Arena (0:50 - 1:30)

**[Screen: Navigate to `/arena`]**

**Voiceover:**  
"Now the big one — the practice arena. This is a proctored 10-question test environment. It enforces fullscreen, tracks webcam status, logs violations, and auto-ends the session if you break the rules three times. This is what real hiring platforms use."

**Action:**  
- Click "Start Test"
- Show the fullscreen enforcement modal
- Accept rules, start a question
- (Optional) Show a violation warning by minimizing fullscreen briefly
- Complete 1-2 questions quickly
- Submit the test

**[Screen: Arena results page]**

**Voiceover:**  
"Once you submit, you get a breakdown — score, time, violations, and your rank. Everything's stored in the `test_results` table in Aurora, and companies can pull these analytics from their HR dashboard."

---

## Scene 4: Company Portal & HR Dashboard (1:30 - 2:00)

**[Screen: Navigate to `/company` and show the company dashboard]**

**Voiceover:**  
"Companies get their own portal. HR accounts can create custom tests, set time limits, pick specific cognitive games, and share invite codes with candidates. All test results sync to their dashboard in real time."

**Action:**  
- Click "Create New Test"
- Show the test creation form (title, questions, time limit)
- Scroll down to show the results table with sample data
- Click on a result to show detailed analytics (score, violations, time taken)

**[Screen: Show test invite code page]**

**Voiceover:**  
"Invite codes are unique per test. Candidates use them to unlock the test on their end, and HR sees everything — who took it, when, their scores, and whether they violated proctoring rules."

---

## Scene 5: AWS Infrastructure & Database (2:00 - 2:40)

**[Screen: Navigate to `/aws` — AWS status dashboard]**

**Voiceover:**  
"Let's talk about the backend. Everything runs on AWS Aurora PostgreSQL — 16 tables, 42 indexes — and DynamoDB for key-value lookups like sessions and leaderboard cache."

**Action:**  
- Show the AWS status dashboard
- Highlight:
  - Aurora cluster health (green checkmark)
  - DynamoDB read/write units
  - API latency chart
  - Database table list (16 tables)

**[Screen: Open code editor or terminal — show a snippet of the Aurora connection code]**

**Voiceover:**  
"The app connects to Aurora using IAM authentication with OIDC tokens. No hardcoded passwords — Vercel injects AWS credentials at runtime. The connection pool uses `pg` with Lambda optimization enabled. Queries are parameterized to prevent SQL injection, and sensitive data like passwords use scrypt hashing with a cost factor of 2^15."

**Action:**  
- Show `src/lib/db.ts` or similar file with connection logic
- Briefly show the scrypt hashing code in `src/app/api/auth/signup/route.ts`

**[Screen: Show ARCHITECTURE.md diagram or draw it live]**

**Voiceover:**  
"Here's the full architecture. Browser talks to Vercel Edge, which routes to Next.js 16 App Router. The App Router hits Aurora and DynamoDB for data, streams AI responses from Google Gemini, and sends transactional emails via SMTP. All of this is IAM-authenticated, rate-limited, and encrypted at rest."

---

## Scene 6: Tech Stack Highlight (2:40 - 3:00)

**[Screen: Show README.md or a slide with tech stack badges]**

**Voiceover:**  
"Tech stack: Next.js 16, React 19, TypeScript, Tailwind CSS 4, AWS Aurora PostgreSQL 17.7, DynamoDB, Drizzle ORM, Google Gemini for AI chat, and Vercel for deployment. The entire codebase is open source on GitHub."

**Action:**  
- Show the repo on GitHub (`github.com/yashbodade/HootHoot`)
- Highlight the `README.md` badges
- Scroll through the file structure quickly

---

## Scene 7: Live Demo Recap (3:00 - 3:20)

**[Screen: Navigate back to the home page]**

**Voiceover:**  
"So, to recap: six cognitive games, practice arena with proctoring, company portal for HR, real-time leaderboards, AI chat assistant, and AWS-powered infrastructure. It's built for scale, secure by design, and ready for production."

**Action:**  
- Quick montage of:
  - Playing a game
  - Leaderboard updating
  - Arena test running
  - Company dashboard showing results

---

## Scene 8: Call to Action & Closing (3:20 - 3:40)

**[Screen: GitHub repo page or deployment link]**

**Voiceover:**  
"The whole project is live at hoot-hoot.com. Check out the GitHub repo for the source code, architecture docs, and setup instructions. If you're a recruiter or hiring manager, you can create a company account and try the test creation flow. Thanks for watching!"

**Action:**  
- Show the live URL: `https://hoot-hoot.com`
- Show GitHub repo: `https://github.com/yashbodade/HootHoot`
- Show contact info: `@yashbodade` on Twitter/X

**[End screen: Logo + tagline]**  
**Text overlay:**  
"Hoot-Hoot — Brain training for real placements"  
"Built by Yash Bodade · github.com/yashbodade"

---

## Production Notes

### Recording Setup

1. **Screen Resolution**: 1920×1080 (Full HD)
2. **Browser**: Chrome or Edge (full-width, no dev tools visible)
3. **Recording Tool**: OBS Studio, Loom, or ScreenFlow
4. **Cursor Highlighting**: Enable cursor click animations
5. **Audio**: Use a decent microphone (avoid background noise)
6. **Editing**: Cut dead air, speed up slow transitions, add captions

### Visual Tips

- **Clean Browser**: Close all tabs except the demo site
- **Smooth Scrolling**: Slow scroll speed for readability
- **Highlight Important Sections**: Use a screen highlighter or zoom in
- **Consistent Pacing**: Don't rush — judges need time to process
- **Show Real Data**: Populate the database with realistic test data (not Lorem Ipsum)

### Script Delivery

- **Tone**: Confident but not cocky — explain technical decisions without over-explaining
- **Pace**: 130-150 words/minute (slightly slower than conversational speech)
- **Emphasis**: Stress key points: "IAM authentication", "parameterized queries", "real-time leaderboard", "proctoring engine"
- **Avoid**: Filler words ("um", "like", "basically"), apologizing, self-deprecation

### Hackathon-Specific Tweaks

If this is for a specific AWS hackathon or submission:

- **Add AWS Badge Mentions**: "We use AWS RDS Aurora with IAM authentication — no hardcoded credentials"
- **Highlight Cost Optimization**: "DynamoDB on-demand billing scales to zero when idle"
- **Show Monitoring**: "CloudWatch logs every query, Sentry tracks client-side errors"
- **Mention Security**: "All data encrypted at rest with AES-256, scrypt password hashing, HttpOnly cookies"

### Post-Recording Checklist

- [ ] Trim intro/outro to fit the 3-4 minute window
- [ ] Add captions (auto-generate with YouTube or Rev.com)
- [ ] Export at 1080p, 30fps, H.264 codec
- [ ] Upload to YouTube (unlisted if required by hackathon rules)
- [ ] Add video description with:
  - Live demo link: `https://hoot-hoot.com`
  - GitHub repo: `https://github.com/yashbodade/HootHoot`
  - Architecture doc: Link to ARCHITECTURE.md on GitHub
  - Contact: `@yashbodade` on Twitter/X

---

## Sample Video Description (YouTube)

```
Hoot-Hoot — Full-Stack Cognitive Games Platform with AWS Aurora PostgreSQL

🎯 Live Demo: https://hoot-hoot.com
📂 GitHub Repo: https://github.com/yashbodade/HootHoot
📄 Architecture Docs: https://github.com/yashbodade/HootHoot/blob/main/ARCHITECTURE.md

Hoot-Hoot is a production-grade brain training platform built for Capgemini and Cognizant placement prep. It features:

✅ 6 Cognitive Challenges (Switch, Grid, Digit, Motion, Inductive, Deductive)
✅ 8 Classic Brain Games (Sudoku, Minesweeper, Snake, etc.)
✅ Proctored Practice Arena (fullscreen enforcement, webcam tracking, anti-cheat)
✅ Company Portal (HR dashboard for custom test creation + analytics)
✅ Real-time Global Leaderboard (Aurora + DynamoDB cache)
✅ AI Chat Assistant (Google Gemini)
✅ AWS Aurora PostgreSQL (16 tables, 42 indexes, IAM auth)
✅ Amazon DynamoDB (single-table design, on-demand billing)
✅ Next.js 16 + React 19 + Tailwind CSS 4
✅ Deployed on Vercel Edge

Tech Stack:
- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS 4, SWR
- Backend: AWS Aurora PostgreSQL 17.7, DynamoDB, Drizzle ORM
- AI: Google Gemini (chat completions)
- Auth: Custom session-based auth (scrypt hashing, HttpOnly cookies)
- Deployment: Vercel (40+ edge locations)
- Monitoring: Google Analytics, Sentry, CloudWatch

Security Highlights:
- IAM authentication with OIDC tokens (no hardcoded credentials)
- Scrypt password hashing (N=2^15, 64-byte salt)
- Parameterized SQL queries (SQL injection prevention)
- HttpOnly, Secure, SameSite cookies
- Rate limiting (20 req/min per IP)
- Encryption at rest (AES-256)

Built by Yash Bodade (@yashbodade)
Open source under MIT License

Timestamps:
0:00 - Introduction
0:20 - Cognitive Games Demo
0:50 - Proctored Arena
1:30 - Company Portal & HR Dashboard
2:00 - AWS Infrastructure & Database
2:40 - Tech Stack Highlight
3:00 - Live Demo Recap
3:20 - Call to Action
```

---

## Additional Video Ideas (Optional)

If you have time, create these bonus videos:

1. **Architecture Deep Dive** (5-7 min)  
   - Walk through ARCHITECTURE.md
   - Explain the database schema in detail
   - Show IAM policy configuration
   - Demonstrate query performance optimization

2. **Code Walkthrough** (10-15 min)  
   - Show key files: `src/lib/db.ts`, `src/app/api/scores/route.ts`, `src/components/game/switch-challenge.tsx`
   - Explain the proctoring logic
   - Demonstrate SWR caching strategy
   - Show error handling patterns

3. **Deployment Tutorial** (8-10 min)  
   - Clone the repo
   - Set up AWS Aurora and DynamoDB
   - Configure environment variables
   - Deploy to Vercel
   - Run the migration script

---

**Last Updated**: June 2026  
**Author**: Yash Bodade ([@yashbodade](https://github.com/yashbodade))
