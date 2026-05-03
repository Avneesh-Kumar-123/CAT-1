import type { SaveData, GameSettings, LevelProgress } from "./types";
import { LEVELS } from "./levels";

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
    settings: { sound: true, difficulty: "normal", catSkin: "orange", controlMode: "tap" },
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
      settings: { catSkin: "orange", ...base.settings, ...(parsed.settings ?? {}) },
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
): SaveData => {
  const cur = data.levels[levelId] ?? { unlocked: true, bestStars: 0, bestTimeRemaining: 0, bestScore: 0 };
  const next: LevelProgress = {
    unlocked: true,
    bestStars: Math.max(cur.bestStars, stars),
    bestTimeRemaining: Math.max(cur.bestTimeRemaining, timeRemaining),
    bestScore: Math.max(cur.bestScore ?? 0, score),
  };
  const updatedLevels = { ...data.levels, [levelId]: next };
  const nextLevel = data.levels[levelId + 1];
  if (nextLevel && !nextLevel.unlocked) {
    updatedLevels[levelId + 1] = { ...nextLevel, unlocked: true };
  }
  const highestUnlocked = Math.max(data.highestUnlocked, levelId + 1);
  const updated: SaveData = {
    ...data,
    levels: updatedLevels,
    highestUnlocked,
    totalCaught: data.totalCaught + 1,
  };
  saveSave(updated);
  return updated;
};

export const updateSettings = (data: SaveData, patch: Partial<GameSettings>): SaveData => {
  const updated: SaveData = { ...data, settings: { ...data.settings, ...patch } };
  saveSave(updated);
  return updated;
};
