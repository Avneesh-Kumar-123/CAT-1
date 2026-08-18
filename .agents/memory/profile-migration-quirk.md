---
name: Profile schema migration quirk
description: Drizzle push can pause on interactive rename/constraint prompts for new profile tables in this workspace.
---

When adding a new profile table, Drizzle may identify the new table or an existing unique constraint as a possible rename and wait for an interactive answer. In non-interactive Replit shell runs, verify the live schema first and use the database service for safe, static DDL when the desired table/constraint is unambiguous.

**Why:** The normal push command repeatedly stopped at prompts even though the intended table and constraint were safe to create and existing leaderboard rows had no duplicates.

**How to apply:** Never truncate existing leaderboard/profile data to satisfy the prompt; inspect `information_schema`/`pg_constraint`, then apply only the missing non-destructive DDL and let later pushes reconcile.