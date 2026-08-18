import { Router } from "express";
import { eq, and, or, gt, count, desc, sql } from "drizzle-orm";
import { db, leaderboardGlobal, leaderboardWeekly, playerProfiles } from "@workspace/db";
import { requireAuth } from "../middleware/require-auth";
import { auth } from "../lib/auth";
import { fromNodeHeaders } from "better-auth/node";
import type { Request, Response, NextFunction } from "express";
import type { AuthUser } from "@workspace/db";

const router = Router();

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_LEVEL_ID = 30;
const MAX_STARS_PER_LEVEL = 3;
const MAX_TOTAL_STARS = MAX_LEVEL_ID * MAX_STARS_PER_LEVEL; // 90
const MAX_MICE_PER_LEVEL = 20;
const MAX_COINS_PER_LEVEL = 10_000;
const MAX_TIME_REMAINING = 300; // seconds — generous upper bound for any level

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 100;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Computes the ISO-8601 week key for a given date.
 * Format: "YYYY-WXX"  (Monday-based ISO weeks).
 */
function isoWeekKey(date: Date): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  // Thursday in current week determines the year
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    (((d.getTime() - yearStart.getTime()) / 86_400_000) + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

async function hydrateLeaderboardIdentity<
  T extends { userId: string; displayName: string; avatarUrl: string | null },
>(entries: T[]): Promise<T[]> {
  return Promise.all(
    entries.map(async (entry) => {
      const profile = await db.query.playerProfiles.findFirst({
        where: eq(playerProfiles.userId, entry.userId),
      });
      return {
        ...entry,
        // Never expose the Google display name as a leaderboard identity.
        displayName: profile?.username ?? "Player",
        avatarUrl:
          profile?.avatarType === "game" && profile.selectedAvatar
            ? `game:${profile.selectedAvatar}`
            : entry.avatarUrl,
      };
    }),
  );
}

/**
 * Optional-auth middleware — attaches req.authUser if a valid session exists,
 * but never returns 401 (unauthenticated requests are allowed through).
 */
const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
    if (session?.user) {
      req.authUser = session.user as AuthUser;
    }
  } catch {
    // ignore — not authenticated
  }
  next();
};

// ---------------------------------------------------------------------------
// GET /api/leaderboard/global
// ---------------------------------------------------------------------------

router.get("/global", optionalAuth, async (req, res) => {
  try {
    const page = Math.max(0, Number(req.query.page ?? 0));
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit ?? DEFAULT_LIMIT)));
    const offset = page * limit;

    // Fetch top entries ordered by the ranking criteria
    const entries = await db
      .select()
      .from(leaderboardGlobal)
      .orderBy(
        desc(leaderboardGlobal.totalStars),
        desc(leaderboardGlobal.levelsCompleted),
        desc(leaderboardGlobal.totalMiceCaught),
      )
      .limit(limit)
      .offset(offset);

    // Total player count (for pagination)
    const [{ total }] = await db
      .select({ total: count() })
      .from(leaderboardGlobal);

    // Assign ranks (1-based from offset)
    const ranked = await hydrateLeaderboardIdentity(
      entries.map((e, i) => ({ ...e, rank: offset + i + 1 })),
    );

    // Current user's entry + rank (if authenticated)
    let myEntry: (typeof ranked[0]) | null = null;
    if (req.authUser) {
      const userId = req.authUser.id;

      // Check if already visible in the current page
      const inPage = ranked.find((e) => e.userId === userId);
      if (inPage) {
        myEntry = inPage;
      } else {
        // Fetch their row and compute rank via COUNT of strictly-better rows
        const [myRow] = await db
          .select()
          .from(leaderboardGlobal)
          .where(eq(leaderboardGlobal.userId, userId))
          .limit(1);

        if (myRow) {
          const [{ betterCount }] = await db
            .select({ betterCount: count() })
            .from(leaderboardGlobal)
            .where(
              or(
                gt(leaderboardGlobal.totalStars, myRow.totalStars),
                and(
                  eq(leaderboardGlobal.totalStars, myRow.totalStars),
                  gt(leaderboardGlobal.levelsCompleted, myRow.levelsCompleted),
                ),
                and(
                  eq(leaderboardGlobal.totalStars, myRow.totalStars),
                  eq(leaderboardGlobal.levelsCompleted, myRow.levelsCompleted),
                  gt(leaderboardGlobal.totalMiceCaught, myRow.totalMiceCaught),
                ),
              ),
            );
          const [hydratedMyRow] = await hydrateLeaderboardIdentity([myRow]);
          myEntry = { ...hydratedMyRow, rank: Number(betterCount) + 1 };
        }
      }
    }

    res.json({ entries: ranked, myEntry, total: Number(total), page, limit });
  } catch (err) {
    console.error("leaderboard/global error", err);
    res.status(500).json({ error: "Failed to fetch global leaderboard" });
  }
});

// ---------------------------------------------------------------------------
// GET /api/leaderboard/weekly
// ---------------------------------------------------------------------------

router.get("/weekly", optionalAuth, async (req, res) => {
  try {
    const page = Math.max(0, Number(req.query.page ?? 0));
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(req.query.limit ?? DEFAULT_LIMIT)));
    const offset = page * limit;
    const weekKey = isoWeekKey(new Date());

    const entries = await db
      .select()
      .from(leaderboardWeekly)
      .where(eq(leaderboardWeekly.weekKey, weekKey))
      .orderBy(
        desc(leaderboardWeekly.weekStars),
        desc(leaderboardWeekly.weekMiceCaught),
        desc(leaderboardWeekly.weekCoins),
      )
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: count() })
      .from(leaderboardWeekly)
      .where(eq(leaderboardWeekly.weekKey, weekKey));

    const ranked = await hydrateLeaderboardIdentity(
      entries.map((e, i) => ({ ...e, rank: offset + i + 1 })),
    );

    let myEntry: (typeof ranked[0]) | null = null;
    if (req.authUser) {
      const userId = req.authUser.id;

      const inPage = ranked.find((e) => e.userId === userId);
      if (inPage) {
        myEntry = inPage;
      } else {
        const [myRow] = await db
          .select()
          .from(leaderboardWeekly)
          .where(
            and(
              eq(leaderboardWeekly.userId, userId),
              eq(leaderboardWeekly.weekKey, weekKey),
            ),
          )
          .limit(1);

        if (myRow) {
          const [{ betterCount }] = await db
            .select({ betterCount: count() })
            .from(leaderboardWeekly)
            .where(
              and(
                eq(leaderboardWeekly.weekKey, weekKey),
                or(
                  gt(leaderboardWeekly.weekStars, myRow.weekStars),
                  and(
                    eq(leaderboardWeekly.weekStars, myRow.weekStars),
                    gt(leaderboardWeekly.weekMiceCaught, myRow.weekMiceCaught),
                  ),
                ),
              ),
            );
          const [hydratedMyRow] = await hydrateLeaderboardIdentity([myRow]);
          myEntry = { ...hydratedMyRow, rank: Number(betterCount) + 1 };
        }
      }
    }

    res.json({ entries: ranked, myEntry, total: Number(total), page, limit, weekKey });
  } catch (err) {
    console.error("leaderboard/weekly error", err);
    res.status(500).json({ error: "Failed to fetch weekly leaderboard" });
  }
});

// ---------------------------------------------------------------------------
// POST /api/leaderboard/update  (auth required)
// ---------------------------------------------------------------------------

/**
 * Called by the frontend after every level completion.
 *
 * Body shape:
 * {
 *   levelId:     number,   // 1–30
 *   stars:       number,   // 1–3
 *   timeRemaining: number, // ≥ 0
 *   miceCaught:  number,   // ≥ 1 (all mice must be caught to win)
 *   coinsEarned: number,   // ≥ 0
 *   snapshot: {
 *     totalStars:      number, // current sum of best stars across all levels (server takes MAX)
 *     levelsCompleted: number, // current count of completed levels
 *     totalMiceCaught: number, // career total from save
 *     totalCoinsEarned: number,// career total from save
 *   }
 * }
 */
router.post("/update", requireAuth, async (req, res) => {
  try {
    const body = req.body ?? {};
    const {
      levelId,
      stars,
      timeRemaining,
      miceCaught,
      coinsEarned,
      snapshot,
    } = body;

    // ── Validation ──────────────────────────────────────────────────────────
    const errors: string[] = [];

    if (!Number.isInteger(levelId) || levelId < 1 || levelId > MAX_LEVEL_ID)
      errors.push(`levelId must be an integer 1–${MAX_LEVEL_ID}`);

    if (!Number.isInteger(stars) || stars < 1 || stars > MAX_STARS_PER_LEVEL)
      errors.push("stars must be 1, 2, or 3");

    if (typeof timeRemaining !== "number" || timeRemaining < 0 || timeRemaining > MAX_TIME_REMAINING)
      errors.push(`timeRemaining must be a number 0–${MAX_TIME_REMAINING}`);

    if (!Number.isInteger(miceCaught) || miceCaught < 1 || miceCaught > MAX_MICE_PER_LEVEL)
      errors.push(`miceCaught must be an integer 1–${MAX_MICE_PER_LEVEL}`);

    if (!Number.isInteger(coinsEarned) || coinsEarned < 0 || coinsEarned > MAX_COINS_PER_LEVEL)
      errors.push(`coinsEarned must be an integer 0–${MAX_COINS_PER_LEVEL}`);

    if (!snapshot || typeof snapshot !== "object") {
      errors.push("snapshot is required");
    } else {
      const { totalStars, levelsCompleted, totalMiceCaught, totalCoinsEarned } = snapshot;
      if (!Number.isInteger(totalStars) || totalStars < 0 || totalStars > MAX_TOTAL_STARS)
        errors.push(`snapshot.totalStars must be 0–${MAX_TOTAL_STARS}`);
      if (!Number.isInteger(levelsCompleted) || levelsCompleted < 0 || levelsCompleted > MAX_LEVEL_ID)
        errors.push(`snapshot.levelsCompleted must be 0–${MAX_LEVEL_ID}`);
      if (!Number.isInteger(totalMiceCaught) || totalMiceCaught < 0)
        errors.push("snapshot.totalMiceCaught must be a non-negative integer");
      if (!Number.isInteger(totalCoinsEarned) || totalCoinsEarned < 0)
        errors.push("snapshot.totalCoinsEarned must be a non-negative integer");
    }

    if (errors.length > 0) {
      res.status(400).json({ error: "Validation failed", details: errors });
      return;
    }

    const { totalStars, levelsCompleted, totalMiceCaught, totalCoinsEarned } = snapshot;
    const user = req.authUser!;
    // Prefer custom username + selected game avatar over Google identity
    const profileRow = await db.query.playerProfiles.findFirst({
      where: eq(playerProfiles.userId, user.id),
    });
    const displayName = profileRow?.username ?? "Player";
    const avatarUrl =
      profileRow?.avatarType === "game" && profileRow.selectedAvatar
        ? `game:${profileRow.selectedAvatar}`
        : ((user as { image?: string }).image ?? null);
    const now = new Date();
    const weekKey = isoWeekKey(now);

    // ── Upsert global leaderboard ──────────────────────────────────────────
    // Takes MAX of each stat field so scores never go backwards.
    await db
      .insert(leaderboardGlobal)
      .values({
        userId: user.id,
        displayName,
        avatarUrl,
        totalStars,
        levelsCompleted,
        totalMiceCaught,
        totalCoinsEarned,
        bestTimeRemaining: timeRemaining,
        lastActiveAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: leaderboardGlobal.userId,
        set: {
          displayName,
          avatarUrl,
          totalStars: sql`GREATEST(leaderboard_global.total_stars, EXCLUDED.total_stars)`,
          levelsCompleted: sql`GREATEST(leaderboard_global.levels_completed, EXCLUDED.levels_completed)`,
          totalMiceCaught: sql`GREATEST(leaderboard_global.total_mice_caught, EXCLUDED.total_mice_caught)`,
          totalCoinsEarned: sql`GREATEST(leaderboard_global.total_coins_earned, EXCLUDED.total_coins_earned)`,
          bestTimeRemaining: sql`GREATEST(COALESCE(leaderboard_global.best_time_remaining, 0), EXCLUDED.best_time_remaining)`,
          lastActiveAt: now,
          updatedAt: now,
        },
      });

    // ── Upsert weekly leaderboard ──────────────────────────────────────────
    // Increments cumulative weekly stats by this level's contribution.
    await db
      .insert(leaderboardWeekly)
      .values({
        userId: user.id,
        weekKey,
        displayName,
        avatarUrl,
        weekStars: stars,
        weekCoins: coinsEarned,
        weekMiceCaught: miceCaught,
        weekBestTimeRemaining: timeRemaining,
        lastActiveAt: now,
      })
      .onConflictDoUpdate({
        target: [leaderboardWeekly.userId, leaderboardWeekly.weekKey],
        set: {
          displayName,
          avatarUrl,
          weekStars: sql`leaderboard_weekly.week_stars + EXCLUDED.week_stars`,
          weekCoins: sql`leaderboard_weekly.week_coins + EXCLUDED.week_coins`,
          weekMiceCaught: sql`leaderboard_weekly.week_mice_caught + EXCLUDED.week_mice_caught`,
          weekBestTimeRemaining: sql`GREATEST(COALESCE(leaderboard_weekly.week_best_time_remaining, 0), EXCLUDED.week_best_time_remaining)`,
          lastActiveAt: now,
        },
      });

    res.json({ ok: true });
  } catch (err) {
    console.error("leaderboard/update error", err);
    res.status(500).json({ error: "Failed to update leaderboard" });
  }
});

export default router;
