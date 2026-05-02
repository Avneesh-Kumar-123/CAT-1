export type CatSkin = {
  id: string;
  name: string;
  emoji: string;
  body: string;
  belly: string;
  stroke: string;
  whiskers: string;
  unlockStars: number;
};

export const CAT_SKINS: CatSkin[] = [
  { id: "orange",  name: "Classic",   emoji: "🟠", body: "#f97316", belly: "#fff7ed", stroke: "#7c2d12", whiskers: "#7c2d12", unlockStars: 0  },
  { id: "blue",    name: "Ocean",     emoji: "🔵", body: "#3b82f6", belly: "#eff6ff", stroke: "#1e3a8a", whiskers: "#1e3a8a", unlockStars: 3  },
  { id: "purple",  name: "Royal",     emoji: "🟣", body: "#8b5cf6", belly: "#f5f3ff", stroke: "#4c1d95", whiskers: "#4c1d95", unlockStars: 6  },
  { id: "green",   name: "Forest",    emoji: "🟢", body: "#22c55e", belly: "#f0fdf4", stroke: "#14532d", whiskers: "#14532d", unlockStars: 9  },
  { id: "pink",    name: "Sakura",    emoji: "🩷", body: "#ec4899", belly: "#fdf2f8", stroke: "#9d174d", whiskers: "#9d174d", unlockStars: 12 },
  { id: "gold",    name: "Champion",  emoji: "🏆", body: "#eab308", belly: "#fefce8", stroke: "#713f12", whiskers: "#713f12", unlockStars: 18 },
];

export const getSkin = (id: string): CatSkin =>
  CAT_SKINS.find((s) => s.id === id) ?? CAT_SKINS[0]!;

export const getUnlockedSkins = (totalStars: number): CatSkin[] =>
  CAT_SKINS.filter((s) => s.unlockStars <= totalStars);

export const nextLockedSkin = (totalStars: number): CatSkin | null =>
  CAT_SKINS.find((s) => s.unlockStars > totalStars) ?? null;
