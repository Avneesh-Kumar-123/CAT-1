import type { SaveData, GameSettings, LevelProgress, DailyChallengeState, MouseKind } from "./types";
import { LEVELS } from "./levels";
import {
  calculateLevelCompleteReward,
  dailyRewardForStreak,
  isDay7Streak,
  DAY7_EXCLUSIVE_COSMETIC_ID,
  coinsForAchievements,
  coinsForMouseDiscoveries,
  STAR_MILESTONES,
  totalStars,
  worldForLevel,
  isWorldComplete,
  pickDailyChallenge,
  currentDateKey,
  type LevelRewardBreakdown,
} from "./economy";

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
    claimedStarMilestones: [],
    claimedWorldBonuses: [],
    dailyChallenge: null,
    cheeseUsedTotal: 0,
    caughtMouseKinds: [],
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
      claimedStarMilestones: parsed.claimedStarMilestones ?? [],
      claimedWorldBonuses: parsed.claimedWorldBonuses ?? [],
      dailyChallenge: parsed.dailyChallenge ?? null,
      cheeseUsedTotal: parsed.cheeseUsedTotal ?? 0,
      caughtMouseKinds: parsed.caughtMouseKinds ?? [],
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

/**
 * Records a level clear, computing the itemized coin reward via the economy
 * engine (new-best star delta + speed/no-damage bonuses, or a flat replay
 * reward if the player didn't beat their previous best). Per-mouse catch
 * coins are awarded separately in real time via `addCoins` as mice are caught.
 */
export const recordLevelComplete = (
  data: SaveData,
  levelId: number,
  stars: number,
  timeRemaining: number,
  score = 0,
  miceCount = 1,
  tookDamage = false,
): { data: SaveData; breakdown: LevelRewardBreakdown } => {
  const level = LEVELS.find((l) => l.id === levelId);
  const cur = data.levels[levelId] ?? { unlocked: true, bestStars: 0, bestTimeRemaining: 0, bestScore: 0 };
  const prevBestStars = cur.bestStars;
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

  const breakdown = calculateLevelCompleteReward({
    stars,
    prevBestStars,
    timeRemaining,
    totalTime: level?.time ?? (timeRemaining || 1),
    tookDamage,
  });

  let updated: SaveData = {
    ...data,
    levels: updatedLevels,
    highestUnlocked,
    totalCaught: data.totalCaught + Math.max(1, miceCount),
    coins: (data.coins ?? 0) + breakdown.total,
  };

  // Claim-once star milestones (based on total stars across all levels)
  const stars_ = totalStars(updated);
  const claimedMilestones = new Set(updated.claimedStarMilestones ?? []);
  let milestoneCoins = 0;
  for (const m of STAR_MILESTONES) {
    if (stars_ >= m.threshold && !claimedMilestones.has(m.threshold)) {
      claimedMilestones.add(m.threshold);
      milestoneCoins += m.reward;
    }
  }
  if (milestoneCoins > 0) {
    updated = {
      ...updated,
      coins: updated.coins + milestoneCoins,
      claimedStarMilestones: Array.from(claimedMilestones),
    };
  }

  // Claim-once world completion bonus
  const world = worldForLevel(levelId);
  if (world && !(updated.claimedWorldBonuses ?? []).includes(world.id) && isWorldComplete(updated, world)) {
    updated = {
      ...updated,
      coins: updated.coins + world.reward,
      claimedWorldBonuses: [...(updated.claimedWorldBonuses ?? []), world.id],
    };
  }

  saveSave(updated);
  return { data: updated, breakdown };
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

/** Adds coins earned from newly-unlocked achievements (id -> reward lookup lives in economy.ts). */
export const addAchievementCoins = (data: SaveData, newAchievementIds: string[]): SaveData => {
  const amount = coinsForAchievements(newAchievementIds);
  if (amount <= 0) return data;
  return addCoins(data, amount);
};

/**
 * Records freshly-caught mouse kinds for the Mouse Almanac, paying a small
 * one-time discovery bonus for any kind never seen before. Returns the kinds
 * that were newly discovered (empty if all had already been caught) so the
 * caller can show a "New mouse discovered!" toast.
 */
export const recordMouseKindsCaught = (
  data: SaveData,
  kinds: MouseKind[],
): { data: SaveData; newKinds: MouseKind[] } => {
  const known = new Set(data.caughtMouseKinds ?? []);
  const newKinds = kinds.filter((k) => !known.has(k));
  if (newKinds.length === 0) return { data, newKinds: [] };
  const updated: SaveData = {
    ...data,
    caughtMouseKinds: [...known, ...newKinds],
    coins: (data.coins ?? 0) + coinsForMouseDiscoveries(newKinds.length),
  };
  saveSave(updated);
  return { data: updated, newKinds };
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
 * Every 7th day awards a bonus + an exclusive cosmetic, then the cycle repeats.
 * Returns null if already claimed today.
 */
export const claimDailyReward = (
  data: SaveData,
): { data: SaveData; reward: number; streak: number; gotExclusiveCosmetic: boolean } | null => {
  const today = todayKey();
  if (data.lastLoginDate === today) return null;

  let streak = 1;
  if (data.lastLoginDate) {
    const prev = new Date(data.lastLoginDate);
    const diffDays = Math.round((new Date(today).getTime() - prev.getTime()) / 86400000);
    streak = diffDays === 1 ? (data.loginStreak ?? 0) + 1 : 1;
  }

  const reward = dailyRewardForStreak(streak);
  const gotExclusiveCosmetic = isDay7Streak(streak);
  const owned = data.ownedCosmetics ?? [];
  const updated: SaveData = {
    ...data,
    coins: (data.coins ?? 0) + reward,
    lastLoginDate: today,
    loginStreak: streak,
    ownedCosmetics: gotExclusiveCosmetic && !owned.includes(DAY7_EXCLUSIVE_COSMETIC_ID)
      ? [...owned, DAY7_EXCLUSIVE_COSMETIC_ID]
      : owned,
  };
  saveSave(updated);
  return { data: updated, reward, streak, gotExclusiveCosmetic };
};

/** Gets today's daily challenge, generating and storing a fresh one if needed. */
export const getOrCreateDailyChallenge = (data: SaveData): SaveData => {
  const today = currentDateKey();
  if (data.dailyChallenge && data.dailyChallenge.date === today) return data;
  const def = pickDailyChallenge(today);
  const challenge: DailyChallengeState = {
    date: today,
    type: def.type,
    target: def.target,
    progress: 0,
    reward: def.reward,
    claimed: false,
  };
  const updated: SaveData = { ...data, dailyChallenge: challenge };
  saveSave(updated);
  return updated;
};

/** Increments progress on today's daily challenge if its type matches, auto-claiming coins on completion. */
export const progressDailyChallenge = (
  data: SaveData,
  type: string,
  amount: number,
): SaveData => {
  const dc = data.dailyChallenge;
  if (!dc || dc.date !== currentDateKey() || dc.claimed || dc.type !== type) return data;
  const progress = Math.min(dc.target, dc.progress + amount);
  const justCompleted = progress >= dc.target && !dc.claimed;
  const updated: SaveData = {
    ...data,
    dailyChallenge: { ...dc, progress, claimed: justCompleted ? true : dc.claimed },
    coins: justCompleted ? (data.coins ?? 0) + dc.reward : data.coins ?? 0,
  };
  saveSave(updated);
  return updated;
};
