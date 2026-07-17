import type { SaveData } from "@/game/types";

/**
 * Merges a local save and a cloud save into the best possible combined state.
 *
 * Rules:
 *  - Numeric progression fields  → take the max (player earned the higher value)
 *  - Array "earned" fields        → union (never lose anything earned)
 *  - Settings                    → prefer local (device-specific preferences)
 *  - Daily / weekly challenges   → prefer whichever has more progress today
 *  - Coins                       → take the max (conservative; real purchases
 *                                   are reconciled via the inventory table)
 */
export function mergeSaves(local: SaveData, cloud: SaveData): SaveData {
  // Merge level maps — per level take the best stars/time/score
  const allLevelIds = new Set([
    ...Object.keys(local.levels).map(Number),
    ...Object.keys(cloud.levels).map(Number),
  ]);
  const mergedLevels: SaveData["levels"] = {};
  for (const id of allLevelIds) {
    const l = local.levels[id];
    const c = cloud.levels[id];
    if (!l) { mergedLevels[id] = c!; continue; }
    if (!c) { mergedLevels[id] = l;  continue; }
    mergedLevels[id] = {
      unlocked: l.unlocked || c.unlocked,
      bestStars: Math.max(l.bestStars, c.bestStars),
      bestTimeRemaining: Math.max(l.bestTimeRemaining, c.bestTimeRemaining),
      bestScore: Math.max(l.bestScore ?? 0, c.bestScore ?? 0),
    };
  }

  // For daily/weekly challenges prefer whichever has more progress (or is claimed)
  const pickBestChallenge = (
    a: SaveData["dailyChallenge"],
    b: SaveData["dailyChallenge"],
  ) => {
    if (!a) return b;
    if (!b) return a;
    if (a.date !== b.date) {
      // Different dates — use the more recent one
      return a.date > b.date ? a : b;
    }
    // Same date — prefer claimed, then higher progress
    if (a.claimed && !b.claimed) return a;
    if (!a.claimed && b.claimed) return b;
    return a.progress >= b.progress ? a : b;
  };

  return {
    highestUnlocked: Math.max(local.highestUnlocked, cloud.highestUnlocked),
    totalCaught: Math.max(local.totalCaught, cloud.totalCaught),
    timeAttackBest: Math.max(local.timeAttackBest, cloud.timeAttackBest),
    survivalBest: Math.max(local.survivalBest, cloud.survivalBest),
    cheeseUsedTotal: Math.max(local.cheeseUsedTotal, cloud.cheeseUsedTotal),
    coins: Math.max(local.coins ?? 0, cloud.coins ?? 0),
    loginStreak: Math.max(local.loginStreak, cloud.loginStreak),

    levels: mergedLevels,

    // Union all earned/collected arrays
    earnedAchievements: union(local.earnedAchievements, cloud.earnedAchievements),
    ownedCosmetics: union(local.ownedCosmetics, cloud.ownedCosmetics),
    claimedStarMilestones: union(
      local.claimedStarMilestones,
      cloud.claimedStarMilestones,
    ),
    claimedWorldBonuses: union(
      local.claimedWorldBonuses,
      cloud.claimedWorldBonuses,
    ),
    caughtMouseKinds: union(local.caughtMouseKinds, cloud.caughtMouseKinds),

    // Device-specific — prefer local
    settings: local.settings,
    lastLoginDate: local.lastLoginDate ?? cloud.lastLoginDate,

    dailyChallenge: pickBestChallenge(local.dailyChallenge, cloud.dailyChallenge),
    weeklyChallenge: pickBestChallenge(local.weeklyChallenge, cloud.weeklyChallenge),
  };
}

function union<T>(a: T[], b: T[]): T[] {
  return Array.from(new Set([...(a ?? []), ...(b ?? [])])) as T[];
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

export async function fetchCloudSave(): Promise<SaveData | null> {
  try {
    const data = await apiFetch("/api/save");
    return (data.save as SaveData) ?? null;
  } catch {
    return null;
  }
}

export async function pushCloudSave(save: SaveData): Promise<boolean> {
  try {
    await apiFetch("/api/save", {
      method: "PUT",
      body: JSON.stringify({ save }),
    });
    return true;
  } catch {
    return false;
  }
}
