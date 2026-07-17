import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { authUser } from "./auth";

/**
 * One row per user — stores the full SaveData JSON blob.
 * The shape mirrors the client-side SaveData type exactly so the game code
 * never needs to transform between local and cloud formats.
 */
export const cloudSaves = pgTable("cloud_saves", {
  userId: text("user_id")
    .primaryKey()
    .references(() => authUser.id, { onDelete: "cascade" }),
  saveData: jsonb("save_data").notNull(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type CloudSave = typeof cloudSaves.$inferSelect;
