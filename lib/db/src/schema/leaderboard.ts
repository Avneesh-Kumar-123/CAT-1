import {
  pgTable,
  text,
  integer,
  real,
  timestamp,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { authUser } from "./auth";

/**
 * Global all-time leaderboard — one row per user.
 * Stats are monotonically non-decreasing: the server always takes
 * MAX(incoming, stored) so scores can never go backwards.
 */
export const leaderboardGlobal = pgTable(
  "leaderboard_global",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => authUser.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),
    /** Sum of best-stars across every level the player has completed. */
    totalStars: integer("total_stars").notNull().default(0),
    /** Number of distinct levels completed (bestStars > 0). */
    levelsCompleted: integer("levels_completed").notNull().default(0),
    /** Cumulative mice caught across the player's whole career. */
    totalMiceCaught: integer("total_mice_caught").notNull().default(0),
    /** Cumulative coins earned across the player's whole career. */
    totalCoinsEarned: integer("total_coins_earned").notNull().default(0),
    /** Best single-level time remaining in seconds (higher = faster clear). */
    bestTimeRemaining: real("best_time_remaining"),
    lastActiveAt: timestamp("last_active_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    // Composite index covering the sort order used by the global ranking query.
    index("idx_lb_global_ranking").on(
      t.totalStars,
      t.levelsCompleted,
      t.totalMiceCaught,
    ),
  ],
);

/**
 * Weekly leaderboard — one row per (user, ISO-week).
 *
 * weekKey format: "YYYY-WXX"  e.g. "2026-W29"
 *
 * "Automatic weekly reset" is implemented by the weekKey: each new ISO week
 * produces a new set of rows while the previous week's rows are simply not
 * included in weekly queries.  No cron job or manual truncation is needed.
 */
export const leaderboardWeekly = pgTable(
  "leaderboard_weekly",
  {
    userId: text("user_id")
      .notNull()
      .references(() => authUser.id, { onDelete: "cascade" }),
    weekKey: text("week_key").notNull(),
    displayName: text("display_name").notNull(),
    avatarUrl: text("avatar_url"),
    /** Stars earned from level completions during this week. */
    weekStars: integer("week_stars").notNull().default(0),
    /** Coins earned from level completions during this week. */
    weekCoins: integer("week_coins").notNull().default(0),
    /** Mice caught during this week. */
    weekMiceCaught: integer("week_mice_caught").notNull().default(0),
    /** Best single-level time remaining achieved during this week. */
    weekBestTimeRemaining: real("week_best_time_remaining"),
    lastActiveAt: timestamp("last_active_at").notNull().defaultNow(),
  },
  (t) => [
    unique("uq_lb_weekly_user_week").on(t.userId, t.weekKey),
    index("idx_lb_weekly_ranking").on(t.weekKey, t.weekStars, t.weekMiceCaught),
  ],
);

export type LeaderboardGlobal = typeof leaderboardGlobal.$inferSelect;
export type LeaderboardWeekly = typeof leaderboardWeekly.$inferSelect;
