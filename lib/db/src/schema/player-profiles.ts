import {
  pgTable,
  text,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { authUser } from "./auth";

/**
 * Player profile — one row per authenticated user.
 *
 * Created lazily on first profile API call; username is optional until the
 * player explicitly sets one (shown by a "Choose Username" prompt).
 */
export const playerProfiles = pgTable(
  "player_profiles",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => authUser.id, { onDelete: "cascade" }),

    /** Unique in-game name. null until the player sets one. */
    username: text("username").unique(),

    /**
     * Which image to show as avatar.
     * "google"  → use the Google profile picture
     * "game"    → use the selectedAvatar slug (rendered as emoji)
     */
    avatarType: text("avatar_type").notNull().default("google"),

    /** Selected game avatar slug, e.g. "orange-cat".  null when avatarType=google. */
    selectedAvatar: text("selected_avatar"),

    /** Array of avatar slugs the player has unlocked. Defaults to free starters. */
    unlockedAvatars: jsonb("unlocked_avatars")
      .$type<string[]>()
      .notNull()
      .default(["orange-cat", "mouse", "cheese"]),

    /** Tracks the 30-day cooldown for username changes. null = never set. */
    usernameLastChanged: timestamp("username_last_changed"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("idx_profiles_username").on(t.username),
  ],
);

export type PlayerProfile = typeof playerProfiles.$inferSelect;
