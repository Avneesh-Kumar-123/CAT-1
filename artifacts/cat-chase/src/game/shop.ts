export type CosmeticCategory = "hat" | "trail" | "paw";

export type ShopItem = {
  id: string;
  category: CosmeticCategory;
  name: string;
  emoji: string;
  price: number;
  color?: string;
  exclusive?: boolean;
};

/**
 * Price tiers (Phase 3 rebalance):
 *   Cheap:     100-200
 *   Medium:    300-500
 *   Rare:      600-900
 *   Legendary: 1000-1500
 * First unlockable cosmetic should be reachable within ~5-8 completed levels.
 */
export const SHOP_ITEMS: ShopItem[] = [
  // Hats
  { id: "none-hat",   category: "hat", name: "No Hat",       emoji: "🚫", price: 0 },
  { id: "bow",        category: "hat", name: "Bow",          emoji: "🎀", price: 100 },
  { id: "party",      category: "hat", name: "Party Hat",    emoji: "🎉", price: 150 },
  { id: "wizard",     category: "hat", name: "Wizard Hat",   emoji: "🧙", price: 350 },
  { id: "top",        category: "hat", name: "Top Hat",      emoji: "🎩", price: 450 },
  { id: "crown",      category: "hat", name: "Crown",        emoji: "👑", price: 700 },
  { id: "halo",       category: "hat", name: "Golden Halo",  emoji: "😇", price: 1200 },
  { id: "day7-halo",        category: "hat",   name: "Day 7 Halo",       emoji: "🌟", price: 0, exclusive: true },
  { id: "streak3-clover",   category: "hat",   name: "Lucky Clover",     emoji: "🍀", price: 0, exclusive: true },
  { id: "streak14-lightning", category: "trail", name: "Lightning Trail", emoji: "⚡", price: 0, exclusive: true, color: "#fbbf24" },
  { id: "streak30-champion",  category: "hat",   name: "Champion Crown",  emoji: "🏆", price: 0, exclusive: true },

  // Trails
  { id: "none-trail", category: "trail", name: "No Trail",   emoji: "🚫", price: 0 },
  { id: "bubbles",    category: "trail", name: "Bubbles",    emoji: "🫧", price: 120, color: "#60a5fa" },
  { id: "stars",      category: "trail", name: "Stardust",   emoji: "✨", price: 180, color: "#fbbf24" },
  { id: "fire",       category: "trail", name: "Flame",      emoji: "🔥", price: 400, color: "#f97316" },
  { id: "rainbow",    category: "trail", name: "Rainbow",    emoji: "🌈", price: 800, color: "rainbow" },
  { id: "cosmic",     category: "trail", name: "Cosmic",     emoji: "🌌", price: 1300, color: "#7c3aed" },

  // Paw print effects
  { id: "none-paw",    category: "paw", name: "Default Paw", emoji: "🐾", price: 0 },
  { id: "heart-paw",   category: "paw", name: "Heart Paw",   emoji: "💗", price: 110, color: "#fb7185" },
  { id: "gold-paw",    category: "paw", name: "Gold Paw",    emoji: "🐾", price: 320, color: "#eab308" },
  { id: "sparkle-paw", category: "paw", name: "Sparkle Paw", emoji: "💫", price: 650, color: "#a78bfa" },
  { id: "diamond-paw", category: "paw", name: "Diamond Paw", emoji: "💎", price: 1000, color: "#38bdf8" },
];

export const getShopItem = (id: string): ShopItem | undefined =>
  SHOP_ITEMS.find((i) => i.id === id);

export const itemsByCategory = (category: CosmeticCategory): ShopItem[] =>
  SHOP_ITEMS.filter((i) => i.category === category && !i.exclusive);

export const isOwned = (ownedCosmetics: string[], item: ShopItem): boolean =>
  item.price === 0 && !item.exclusive ? true : ownedCosmetics.includes(item.id);
