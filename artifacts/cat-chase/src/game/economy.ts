/**
 * Central coin-economy engine for Cat Chase: Mouse Hunt.
 * Every coin reward in the game (level clears, mouse catches, achievements,
 * star milestones, world bonuses, daily login, daily challenges) is computed
 * here so future worlds/levels/cosmetics/achievements/mouse types can be
 * added without touching the reward math anywhere else.
 */
import type { LevelDef, MouseType, SaveData } from "./types";
import { LEVELS } from "./levels";

// ─────────────────────────────────────────────────────────────────────────
// 1. Level clear rewards (cumulative table — only the delta is ever paid)
// ─────────────────────────────────────────────────────────────────────────

/** Cumulative coins owed once a level has reached this star rating. */
export const LEVEL_STAR_COINS: Record<number, number> = { 0: 0, 1: 20, 2: 35, 3: 50 };

/** Flat coins paid when a level is replayed without beating its best stars. */
export const REPLAY_COINS = 5;

export const SPEED_BONUS_COINS = 10;
export const SPEED_BONUS_THRESHOLD = 0.5; // >=50% time remaining

export const NO_DAMAGE_BONUS_COINS = 10;

export type LevelRewardLine = { label: string; amount: number };

export type LevelRewardBreakdown = {
  lines: LevelRewardLine[];
  total: number;
  isReplay: boolean;
  isNewBest: boolean;
};

/**
 * Computes the full reward breakdown for finishing a level.
 * Only pays the *delta* in star-tier coins when the player beats their
 * previous best; otherwise pays a small flat replay reward.
 */
export const calculateLevelCompleteReward = (opts: {
  stars: number;
  prevBestStars: number;
  timeRemaining: number;
  totalTime: number;
  tookDamage: boolean;
}): LevelRewardBreakdown => {
  const { stars, prevBestStars, timeRemaining, totalTime, tookDamage } = opts;
  const isNewBest = stars > prevBestStars;
  const lines: LevelRewardLine[] = [];

  if (isNewBest) {
    const prevTable = LEVEL_STAR_COINS[prevBestStars] ?? 0;
    const nextTable = LEVEL_STAR_COINS[stars] ?? LEVEL_STAR_COINS[3]!;
    const base = LEVEL_STAR_COINS[1]!; // base reward is the 1-star tier
    if (prevBestStars === 0) {
      lines.push({ label: "Base Reward", amount: base });
      const starBonus = nextTable - base;
      if (starBonus > 0) lines.push({ label: `${stars}-Star Bonus`, amount: starBonus });
    } else {
      lines.push({ label: `${stars}-Star Bonus`, amount: nextTable - prevTable });
    }

    const pct = totalTime > 0 ? timeRemaining / totalTime : 0;
    if (pct >= SPEED_BONUS_THRESHOLD) lines.push({ label: "Speed Bonus", amount: SPEED_BONUS_COINS });
    if (!tookDamage) lines.push({ label: "No Damage Bonus", amount: NO_DAMAGE_BONUS_COINS });
  } else {
    lines.push({ label: "Replay Bonus", amount: REPLAY_COINS });
  }

  const total = lines.reduce((sum, l) => sum + l.amount, 0);
  return { lines, total, isReplay: !isNewBest, isNewBest };
};

// ─────────────────────────────────────────────────────────────────────────
// 2. Per-mouse catch rewards
// ─────────────────────────────────────────────────────────────────────────

export const MOUSE_COIN_VALUES: Record<MouseType, number> = {
  normal: 5,
  sleepy: 7,
  dash: 8,
  teleport: 10,
  zigzag: 9,
  stubborn: 11,
};

export const NINJA_MOUSE_COINS = 12; // smart/darty AI mice
export const KING_MOUSE_COINS = 30; // golden crown mouse
export const BOSS_MOUSE_COINS = 50; // boss-AI levels

export const coinsForMouseCatch = (level: LevelDef, isGolden: boolean): number => {
  if (level.mouseAI === "boss") return BOSS_MOUSE_COINS;
  if (isGolden) return KING_MOUSE_COINS;
  if (level.mouseAI === "smart" || level.mouseAI === "darty") return NINJA_MOUSE_COINS;
  return MOUSE_COIN_VALUES[level.mouseType ?? "normal"] ?? MOUSE_COIN_VALUES.normal;
};

// ─────────────────────────────────────────────────────────────────────────
// 3. Daily login rewards (7-day cycle, day 7 grants an exclusive cosmetic)
// ─────────────────────────────────────────────────────────────────────────

export const DAILY_REWARD_SCHEDULE = [50, 75, 100, 125, 150, 200, 300];
export const DAY7_EXCLUSIVE_COSMETIC_ID = "day7-halo";

export const dailyRewardForStreak = (streak: number): number => {
  const idx = ((streak - 1) % DAILY_REWARD_SCHEDULE.length + DAILY_REWARD_SCHEDULE.length) % DAILY_REWARD_SCHEDULE.length;
  return DAILY_REWARD_SCHEDULE[idx]!;
};

export const isDay7Streak = (streak: number): boolean =>
  streak % DAILY_REWARD_SCHEDULE.length === 0;

// ─────────────────────────────────────────────────────────────────────────
// 4. Achievement coin rewards
// ─────────────────────────────────────────────────────────────────────────

export const ACHIEVEMENT_COIN_REWARDS: Record<string, number> = {
  first_catch: 20,
  quick_paws: 30,
  mouse_hunter: 50,
  double_digits: 75,
  apex_predator: 100,
  mouse_mania: 100, // "Catch 100 mice" milestone
  legendary_hunter: 200,
  star_collector: 30,
  star_storm: 75,
  perfect_hunter: 300,
  two_star_first: 20,
  two_star_all: 150,
  speed_demon: 40,
  photo_finish: 40,
  level_3_unlock: 20,
  level_5_unlock: 30,
  level_10: 100,
  champion: 500,
  power_player: 20,
  hat_trick: 40,
  hot_streak: 60,
  time_attack_debut: 20,
  time_attack_pro: 60,
  time_attack_legend: 120,
};

export const coinsForAchievements = (ids: string[]): number =>
  ids.reduce((sum, id) => sum + (ACHIEVEMENT_COIN_REWARDS[id] ?? 0), 0);

// ─────────────────────────────────────────────────────────────────────────
// 5. Star milestones (claim-once, based on total stars across all levels)
// ─────────────────────────────────────────────────────────────────────────

export const STAR_MILESTONES: { threshold: number; reward: number }[] = [
  { threshold: 10, reward: 100 },
  { threshold: 20, reward: 150 },
  { threshold: 40, reward: 250 },
  { threshold: 60, reward: 350 },
  { threshold: 90, reward: 1000 },
];

export const totalStars = (save: SaveData): number =>
  Object.values(save.levels).reduce((sum, l) => sum + (l.bestStars ?? 0), 0);

// ─────────────────────────────────────────────────────────────────────────
// 6. World completion bonuses (claim-once per world)
// ─────────────────────────────────────────────────────────────────────────

export type WorldDef = { id: number; name: string; from: number; to: number; reward: number };

export const WORLDS: WorldDef[] = [
  { id: 1, name: "Sunny Fields", from: 1, to: 10, reward: 200 },
  { id: 2, name: "Mystic Forest", from: 11, to: 20, reward: 300 },
  { id: 3, name: "Sky Kingdom", from: 21, to: 30, reward: 500 },
];

export const worldForLevel = (levelId: number): WorldDef | undefined =>
  WORLDS.find((w) => levelId >= w.from && levelId <= w.to);

/** A world is complete once every level in its range has bestStars >= 1. */
export const isWorldComplete = (save: SaveData, world: WorldDef): boolean => {
  for (let id = world.from; id <= world.to; id++) {
    if (!LEVELS.some((l) => l.id === id)) continue;
    if ((save.levels[id]?.bestStars ?? 0) < 1) return false;
  }
  return true;
};

// ─────────────────────────────────────────────────────────────────────────
// 7. Daily challenges
// ─────────────────────────────────────────────────────────────────────────

export type DailyChallengeType = "catch_mice" | "finish_levels" | "collect_cheese" | "no_damage_clear";

export type DailyChallengeDef = {
  type: DailyChallengeType;
  label: (target: number) => string;
  target: number;
  reward: number;
};

const DAILY_CHALLENGE_POOL: DailyChallengeDef[] = [
  { type: "catch_mice", label: (t) => `Catch ${t} mice`, target: 20, reward: 150 },
  { type: "finish_levels", label: (t) => `Finish ${t} levels`, target: 5, reward: 150 },
  { type: "collect_cheese", label: (t) => `Use cheese bait ${t} times`, target: 10, reward: 100 },
  { type: "no_damage_clear", label: (t) => `Clear ${t} level${t > 1 ? "s" : ""} without damage`, target: 1, reward: 200 },
];

/** Deterministic date key so all players get the same challenge on the same day. */
const dateKey = (d = new Date()): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const hashString = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

export const pickDailyChallenge = (date = dateKey()): DailyChallengeDef => {
  const idx = hashString(date) % DAILY_CHALLENGE_POOL.length;
  return DAILY_CHALLENGE_POOL[idx]!;
};

export const currentDateKey = dateKey;
