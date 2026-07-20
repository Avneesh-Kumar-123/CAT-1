---
name: Leaderboard system
description: Global + weekly leaderboard implementation — tables, API routes, frontend page, Play.tsx integration.
---

## Schema
- `leaderboard_global` — PK userId; global stats take MAX on upsert (never go backwards)
- `leaderboard_weekly` — unique(userId, weekKey); weekly stats INCREMENT each completion
- weekKey format: "YYYY-WXX" (ISO week, Monday-based). No cron needed — old weeks are simply excluded from queries.
- Indexes on: global ranking triple, weekly (weekKey + weekStars + weekMiceCaught)

## API
- `GET /api/leaderboard/global` — optionalAuth; top 100 + myEntry with rank; rank computed via COUNT of strictly-better rows
- `GET /api/leaderboard/weekly` — same pattern, filtered to current weekKey
- `POST /api/leaderboard/update` — requireAuth; server-validates all fields; upserts both tables atomically

## Upsert strategy
- Global: `GREATEST(existing, EXCLUDED)` for all numeric fields — snapshot-based
- Weekly: `existing + EXCLUDED` for stars/coins/mice — delta-based (client sends per-completion delta)

## TS type errors
`tsc --noEmit` on api-server shows implicit-any errors in leaderboard.ts callbacks.
**Why:** lib/db dist is not built (pre-existing across all routes). esbuild builds the server fine; these errors exist in inventory.ts, save.ts, etc. too.

## Play.tsx integration
After every level win (handleCatch), if user is logged in, fire-and-forget call to updateLeaderboard.
Snapshot values computed from `updated.levels` (Drizzle-style reduction).
`user` added to handleCatch dependency array.

## Frontend
- `/leaderboard` route in App.tsx; 🏆 Leaderboard button in Splash.tsx (orange style, below Mouse Almanac)
- Page: MenuShell + Global/Weekly tabs + rank table + sticky "Your rank" footer if outside top 100
- optionalAuth pattern: GET endpoints public, myEntry null if not signed in
