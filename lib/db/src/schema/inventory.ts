import {
  pgTable,
  text,
  jsonb,
  timestamp,
  serial,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { authUser } from "./auth";

/**
 * Master catalogue of every purchasable / earnable item.
 * Add new rows here as the game expands — no schema changes required.
 *
 * itemType values:
 *   "cat-skin" | "hat" | "trail" | "paw" | "mouse-skin"
 *   | "coin-pack" | "level-pack" | "cosmetic-bundle"
 */
export const itemCatalog = pgTable("item_catalog", {
  /** Stable slug used throughout the game, e.g. "skin-orange", "hat-crown" */
  id: text("id").primaryKey(),
  itemType: text("item_type").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  /** In-game coin price.  0 = free / included. */
  coinPrice: integer("coin_price").notNull().default(0),
  /** Real-money price in the smallest currency unit (cents). 0 = not for sale yet. */
  realPrice: integer("real_price").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  /** Flexible bag for future fields (rarity, icon URL, seasonal tags, …) */
  metadata: jsonb("metadata"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Per-user inventory — one row per owned item.
 * Supports multiple acquisition paths so purchase history is auditable.
 *
 * acquiredVia values:
 *   "coin_purchase" | "real_purchase" | "achievement" | "streak_reward"
 *   | "migration" | "gift" | "seasonal_event"
 */
export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => authUser.id, { onDelete: "cascade" }),
  itemId: text("item_id")
    .notNull()
    .references(() => itemCatalog.id),
  acquiredAt: timestamp("acquired_at").notNull().defaultNow(),
  acquiredVia: text("acquired_via").notNull().default("coin_purchase"),
  /** Extra purchase metadata (transaction ID, Stripe payment intent, etc.) */
  metadata: jsonb("metadata"),
});

export type ItemCatalog = typeof itemCatalog.$inferSelect;
export type InventoryItem = typeof inventoryItems.$inferSelect;
