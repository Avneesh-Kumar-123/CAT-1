/**
 * Master avatar catalog — kept in sync with artifacts/api-server/src/lib/avatars.ts.
 * This is the frontend copy; it must match the server's list exactly.
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
  /** hex background colour */
  bg: string;
  unlock: AvatarUnlock;
};

export const AVATARS: AvatarDef[] = [
  // Free starters
  { id: "orange-cat",   name: "Orange Cat",   emoji: "🐱",  bg: "#FED7AA", unlock: { type: "free" } },
  { id: "mouse",        name: "Mouse",         emoji: "🐭",  bg: "#E5E7EB", unlock: { type: "free" } },
  { id: "cheese",       name: "Cheese",        emoji: "🧀",  bg: "#FEF3C7", unlock: { type: "free" } },
  // Level unlocks
  { id: "black-cat",    name: "Black Cat",    emoji: "🐈",  bg: "#374151", unlock: { type: "level", levelId: 5 } },
  { id: "white-cat",    name: "White Cat",    emoji: "😺",  bg: "#F9FAFB", unlock: { type: "level", levelId: 10 } },
  // Coin unlocks
  { id: "ghost-mouse",  name: "Ghost Mouse",  emoji: "👻",  bg: "#EDE9FE", unlock: { type: "achievement", achievementId: "mouse_hunter" } },
  { id: "king-cat",     name: "King Cat",     emoji: "👑",  bg: "#FDE68A", unlock: { type: "coins", amount: 500 } },
  { id: "pirate-mouse", name: "Pirate Mouse", emoji: "🏴‍☠️", bg: "#FEE2E2", unlock: { type: "coins", amount: 600 } },
  { id: "ninja-cat",    name: "Ninja Cat",    emoji: "🥷",  bg: "#1E293B", unlock: { type: "coins", amount: 800 } },
  { id: "robot-cat",    name: "Robot Cat",    emoji: "🤖",  bg: "#DBEAFE", unlock: { type: "coins", amount: 1000 } },
];

export const AVATAR_MAP = new Map(AVATARS.map((a) => [a.id, a]));

export function getAvatarDef(id: string): AvatarDef | undefined {
  return AVATAR_MAP.get(id);
}

/**
 * Resolves an avatar URL for display.
 *
 * Format "game:orange-cat" → game avatar (render with GameAvatarTile)
 * Any other string          → treat as image URL
 * null / undefined          → no image (show letter fallback)
 */
export function isGameAvatarUrl(url: string | null | undefined): boolean {
  return typeof url === "string" && url.startsWith("game:");
}

export function gameAvatarIdFromUrl(url: string): string {
  return url.slice("game:".length);
}
