import type { SaveData, GameSettings, LevelProgress } from "./types";
import { LEVELS } from "./levels";
import { coinsForLevelClear, dailyRewardForStreak } from "./shop";

const KEY = "cat-chase-save-v1";

const defaultSave = (): SaveData => {
  const levels: Record<number, LevelProgress> = {};
  for (const lvl of LEVELS) {
    levels[lvl.id] = {
      unlocked: lvl.id === 1,
      bestStars: 0,
      bestTimeRemaining: 0,
      bestScore: 0,
    };
  }
  return {
    highestUnlocked: 1,
    totalCaught: 0,
    levels,
    settings: {
      sound: true,
      difficulty: "normal",
      catSkin: "orange",
      controlMode: "tap",
      equippedHat: "none-hat",
      equippedTrail: "none-trail",
      equippedPaw: "none-paw",
    },
    earnedAchievements: [],
    timeAttackBest: 0,
    survivalBest: 0,
    coins: 0,
    ownedCosmetics: [],
    lastLoginDate: null,
    loginStreak: 0,
  };
};

export const loadSave = (): SaveData => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const parsed = JSON.parse(raw) as Partial<SaveData>;
    const base = defaultSave();
    return {
      highestUnlocked: parsed.highestUnlocked ?? base.highestUnlocked,
      totalCaught: parsed.totalCaught ?? base.totalCaught,
      levels: { ...base.levels, ...(parsed.levels ?? {}) },
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
      earnedAchievements: parsed.earnedAchievements ?? [],
      timeAttackBest: parsed.timeAttackBest ?? 0,
      survivalBest: parsed.survivalBest ?? 0,
      coins: parsed.coins ?? base.coins,
      ownedCosmetics: parsed.ownedCosmetics ?? base.ownedCosmetics,
      lastLoginDate: parsed.lastLoginDate ?? base.lastLoginDate,
      loginStreak: parsed.loginStreak ?? base.loginStreak,
    };
  } catch {
    return defaultSave();
  }
};

export const saveSave = (data: SaveData) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // ignore quota errors
  }
};

export const resetSave = () => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
};

export const recordLevelComplete = (
  data: SaveData,
  levelId: number,
  stars: number,
  timeRemaining: number,
  score = 0,
  miceCount = 1,
): SaveData => {
  const cur = data.levels[levelId] ?? { unlocked: true, bestStars: 0, bestTimeRemaining: 0, bestScore: 0 };
  const next: LevelProgress = {
    unlocked: true,
    bestStars: Math.max(cur.bestStars, stars),
    bestTimeRemaining: Math.max(cur.bestTimeRemaining, timeRemaining),
    bestScore: Math.max(cur.bestScore ?? 0, score),
  };
  const updatedLevels = { ...data.levels, [levelId]: next };
  const nextLevelProgress = data.levels[levelId + 1];
  if (nextLevelProgress && !nextLevelProgress.unlocked) {
    updatedLevels[levelId + 1] = { ...nextLevelProgress, unlocked: true };
  }
  const highestUnlocked = Math.min(
    Math.max(data.highestUnlocked, levelId + 1),
    LEVELS.length,
  );
  const coinsEarned = coinsForLevelClear(stars);
  const updated: SaveData = {
    ...data,
    levels: updatedLevels,
    highestUnlocked,
    totalCaught: data.totalCaught + Math.max(1, miceCount),
    coins: (data.coins ?? 0) + coinsEarned,
  };
  saveSave(updated);
  return updated;
};

export const updateSettings = (data: SaveData, patch: Partial<GameSettings>): SaveData => {
  const updated: SaveData = { ...data, settings: { ...data.settings, ...patch } };
  saveSave(updated);
  return updated;
};

export const addCoins = (data: SaveData, amount: number): SaveData => {
  const updated: SaveData = { ...data, coins: Math.max(0, (data.coins ?? 0) + amount) };
  saveSave(updated);
  return updated;
};

export const purchaseItem = (
  data: SaveData,
  itemId: string,
  price: number,
): { data: SaveData; success: boolean } => {
  const owned = data.ownedCosmetics ?? [];
  if (owned.includes(itemId) || price === 0) {
    return { data: { ...data, ownedCosmetics: owned }, success: true };
  }
  if ((data.coins ?? 0) < price) {
    return { data: { ...data, ownedCosmetics: owned }, success: false };
  }
  const updated: SaveData = {
    ...data,
    coins: (data.coins ?? 0) - price,
    ownedCosmetics: [...owned, itemId],
  };
  saveSave(updated);
  return { data: updated, success: true };
};

export const equipCosmetic = (
  data: SaveData,
  category: "hat" | "trail" | "paw",
  itemId: string,
): SaveData => {
  const key = category === "hat" ? "equippedHat" : category === "trail" ? "equippedTrail" : "equippedPaw";
  const updated: SaveData = { ...data, settings: { ...data.settings, [key]: itemId } };
  saveSave(updated);
  return updated;
};

/** Returns todays's date as YYYY-MM-DD in the local timezone. */
const todayKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Claims the daily login reward if it hasn't been claimed today.
 * Streak continues if the last claim was "yesterday", resets to 1 otherwise.
 * Returns null if already claimed today.
 */
export const claimDailyReward = (data: SaveData): { data: SaveData; reward: number; streak: number } | null => {
  const today = todayKey();
  if (data.lastLoginDate === today) return null;

  let streak = 1;
  if (data.lastLoginDate) {
    const prev = new Date(data.lastLoginDate);
    const diffDays = Math.round((new Date(today).getTime() - prev.getTime()) / 86400000);
    streak = diffDays === 1 ? (data.loginStreak ?? 0) + 1 : 1;
  }

  const reward = dailyRewardForStreak(streak);
  const updated: SaveData = {
    ...data,
    coins: (data.coins ?? 0) + reward,
    lastLoginDate: today,
    loginStreak: streak,
  };
  saveSave(updated);
  return { data: updated, reward, streak };
};
