/**
 * Master avatar catalog — shared between frontend and API for validation.
 *
 * unlock types:
 *   "free"   — everyone starts with this
 *   "level"  — player must have completed ≥ levelId levels
 *   "coins"  — costs coins (frontend deducts; server records unlock)
 */

export type AvatarUnlock =
  | { type: "free" }
  | { type: "level"; levelId: number }
  | { type: "achievement"; achievementId: string }
  | { type: "coins"; amount: number };

export type AvatarDef = {
  id: string;
  name: string;
  emoji: string;
  /** hex background colour for the avatar tile */
  bg: string;
  unlock: AvatarUnlock;
};

export const AVATARS: AvatarDef[] = [
  // ── Free starters ───────────────────────────────────────────────────────
  { id: "orange-cat",   name: "Orange Cat",   emoji: "🐱",  bg: "#FED7AA", unlock: { type: "free" } },
  { id: "mouse",        name: "Mouse",         emoji: "🐭",  bg: "#E5E7EB", unlock: { type: "free" } },
  { id: "cheese",       name: "Cheese",        emoji: "🧀",  bg: "#FEF3C7", unlock: { type: "free" } },
  // ── Level unlocks ───────────────────────────────────────────────────────
  { id: "black-cat",    name: "Black Cat",    emoji: "🐈",  bg: "#374151", unlock: { type: "level", levelId: 5 } },
  { id: "white-cat",    name: "White Cat",    emoji: "😺",  bg: "#F9FAFB", unlock: { type: "level", levelId: 10 } },
  // ── Coin unlocks ────────────────────────────────────────────────────────
  { id: "ghost-mouse",  name: "Ghost Mouse",  emoji: "👻",  bg: "#EDE9FE", unlock: { type: "achievement", achievementId: "mouse_hunter" } },
  { id: "king-cat",     name: "King Cat",     emoji: "👑",  bg: "#FDE68A", unlock: { type: "coins", amount: 500 } },
  { id: "pirate-mouse", name: "Pirate Mouse", emoji: "🏴‍☠️", bg: "#FEE2E2", unlock: { type: "coins", amount: 600 } },
  { id: "ninja-cat",    name: "Ninja Cat",    emoji: "🥷",  bg: "#1E293B", unlock: { type: "coins", amount: 800 } },
  { id: "robot-cat",    name: "Robot Cat",    emoji: "🤖",  bg: "#DBEAFE", unlock: { type: "coins", amount: 1000 } },
];

/** Set of all valid avatar IDs for O(1) lookup */
export const AVATAR_ID_SET = new Set(AVATARS.map((a) => a.id));

/** IDs of the three free starter avatars (always pre-unlocked on profile creation) */
export const FREE_AVATAR_IDS = AVATARS
  .filter((a) => a.unlock.type === "free")
  .map((a) => a.id);
