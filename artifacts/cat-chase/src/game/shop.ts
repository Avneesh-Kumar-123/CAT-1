export type CosmeticCategory = "hat" | "trail" | "paw";

export type ShopItem = {
  id: string;
  category: CosmeticCategory;
  name: string;
  emoji: string;
  price: number;
  color?: string;
};

export const SHOP_ITEMS: ShopItem[] = [
  // Hats
  { id: "none-hat",   category: "hat", name: "No Hat",     emoji: "🚫", price: 0 },
  { id: "party",      category: "hat", name: "Party Hat",  emoji: "🎉", price: 80 },
  { id: "top",        category: "hat", name: "Top Hat",    emoji: "🎩", price: 120 },
  { id: "crown",      category: "hat", name: "Crown",      emoji: "👑", price: 200 },
  { id: "wizard",     category: "hat", name: "Wizard Hat", emoji: "🧙", price: 150 },
  { id: "bow",        category: "hat", name: "Bow",        emoji: "🎀", price: 60 },

  // Trails
  { id: "none-trail", category: "trail", name: "No Trail",  emoji: "🚫", price: 0 },
  { id: "rainbow",    category: "trail", name: "Rainbow",   emoji: "🌈", price: 150, color: "rainbow" },
  { id: "stars",      category: "trail", name: "Stardust",  emoji: "✨", price: 100, color: "#fbbf24" },
  { id: "fire",       category: "trail", name: "Flame",     emoji: "🔥", price: 130, color: "#f97316" },
  { id: "bubbles",    category: "trail", name: "Bubbles",   emoji: "🫧", price: 90,  color: "#60a5fa" },

  // Paw print effects
  { id: "none-paw",   category: "paw", name: "Default Paw", emoji: "🐾", price: 0 },
  { id: "gold-paw",   category: "paw", name: "Gold Paw",    emoji: "🐾", price: 110, color: "#eab308" },
  { id: "heart-paw",  category: "paw", name: "Heart Paw",   emoji: "💗", price: 90,  color: "#fb7185" },
  { id: "sparkle-paw",category: "paw", name: "Sparkle Paw", emoji: "💫", price: 130, color: "#a78bfa" },
];

export const getShopItem = (id: string): ShopItem | undefined =>
  SHOP_ITEMS.find((i) => i.id === id);

export const itemsByCategory = (category: CosmeticCategory): ShopItem[] =>
  SHOP_ITEMS.filter((i) => i.category === category);

export const isOwned = (ownedCosmetics: string[], item: ShopItem): boolean =>
  item.price === 0 || ownedCosmetics.includes(item.id);

/** Daily login reward schedule (day 1..7, then repeats at day 7 amount) */
export const DAILY_REWARD_SCHEDULE = [20, 25, 30, 35, 40, 50, 75];

export const dailyRewardForStreak = (streak: number): number => {
  const idx = Math.min(Math.max(streak - 1, 0), DAILY_REWARD_SCHEDULE.length - 1);
  return DAILY_REWARD_SCHEDULE[idx]!;
};

export const LEVEL_COMPLETE_BASE_COINS = 10;
export const LEVEL_COMPLETE_PER_STAR_COINS = 5;

export const coinsForLevelClear = (stars: number): number =>
  LEVEL_COMPLETE_BASE_COINS + stars * LEVEL_COMPLETE_PER_STAR_COINS;
