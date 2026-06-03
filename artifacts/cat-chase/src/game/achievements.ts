import type { SaveData } from "./types";
import { LEVELS } from "./levels";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
  secret?: boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_catch",
    title: "First Catch",
    description: "Complete your very first level.",
    icon: "🐱",
  },
  {
    id: "mouse_hunter",
    title: "Mouse Hunter",
    description: "Catch 10 mice in total.",
    icon: "🐭",
  },
  {
    id: "apex_predator",
    title: "Apex Predator",
    description: "Catch 50 mice in total.",
    icon: "🦁",
  },
  {
    id: "star_collector",
    title: "Star Collector",
    description: "Earn your first 3-star rating.",
    icon: "⭐",
  },
  {
    id: "star_storm",
    title: "Star Storm",
    description: "Get 3 stars on 5 different levels.",
    icon: "🌟",
  },
  {
    id: "perfect_hunter",
    title: "Perfect Hunter",
    description: "Get 3 stars on every level.",
    icon: "🏆",
  },
  {
    id: "speed_demon",
    title: "Speed Demon",
    description: "Complete a level with 80% or more time remaining.",
    icon: "⚡",
  },
  {
    id: "photo_finish",
    title: "Photo Finish",
    description: "Win a level with 3 seconds or less remaining.",
    icon: "😅",
  },
  {
    id: "level_10",
    title: "Mid-Game",
    description: "Unlock Level 10.",
    icon: "🎮",
  },
  {
    id: "champion",
    title: "Champion",
    description: "Complete all levels.",
    icon: "👑",
  },
  {
    id: "power_player",
    title: "Power Player",
    description: "Use a power-up for the first time.",
    icon: "🧲",
  },
  {
    id: "hat_trick",
    title: "Hat Trick",
    description: "Complete 3 levels in a single session.",
    icon: "🎩",
  },
  {
    id: "quick_paws",
    title: "Quick Paws",
    description: "Catch 5 mice in total.",
    icon: "🐾",
  },
  {
    id: "double_digits",
    title: "Double Digits",
    description: "Catch 25 mice in total.",
    icon: "🎯",
  },
  {
    id: "mouse_mania",
    title: "Mouse Mania",
    description: "Catch 100 mice in total.",
    icon: "🌪️",
  },
  {
    id: "legendary_hunter",
    title: "Legendary Hunter",
    description: "Catch 200 mice in total.",
    icon: "🦅",
  },
  {
    id: "level_3_unlock",
    title: "Getting Started",
    description: "Unlock Level 3.",
    icon: "🚀",
  },
  {
    id: "level_5_unlock",
    title: "Halfway There",
    description: "Reach Level 5.",
    icon: "🌈",
  },
  {
    id: "two_star_first",
    title: "Rising Star",
    description: "Earn your first 2-star rating.",
    icon: "🌠",
  },
  {
    id: "two_star_all",
    title: "Silver Paws",
    description: "Get at least 2 stars on every level.",
    icon: "🌙",
  },
  {
    id: "time_attack_debut",
    title: "Against the Clock",
    description: "Play Time Attack for the first time.",
    icon: "⏰",
  },
  {
    id: "time_attack_pro",
    title: "Time Attack Pro",
    description: "Score 15 or more mice in Time Attack.",
    icon: "🔥",
  },
  {
    id: "time_attack_legend",
    title: "Time Attack Legend",
    description: "Score 30 or more mice in Time Attack.",
    icon: "💥",
  },
  {
    id: "hot_streak",
    title: "Hot Streak",
    description: "Complete 5 levels in a single session.",
    icon: "🎰",
  },
];

export const checkAchievements = (
  prev: SaveData,
  next: SaveData,
  extras: { timeRemaining: number; totalTime: number; sessionWins: number; usedPowerUp: boolean },
): string[] => {
  const already = new Set(prev.earnedAchievements ?? []);
  const newlyEarned: string[] = [];

  const earn = (id: string) => {
    if (!already.has(id)) newlyEarned.push(id);
  };

  if (next.totalCaught >= 1) earn("first_catch");
  if (next.totalCaught >= 5) earn("quick_paws");
  if (next.totalCaught >= 10) earn("mouse_hunter");
  if (next.totalCaught >= 25) earn("double_digits");
  if (next.totalCaught >= 50) earn("apex_predator");
  if (next.totalCaught >= 100) earn("mouse_mania");
  if (next.totalCaught >= 200) earn("legendary_hunter");

  const threeStarCount = Object.values(next.levels).filter((l) => l.bestStars >= 3).length;
  const twoStarCount = Object.values(next.levels).filter((l) => l.bestStars >= 2).length;
  if (twoStarCount >= 1) earn("two_star_first");
  if (twoStarCount >= LEVELS.length) earn("two_star_all");
  if (threeStarCount >= 1) earn("star_collector");
  if (threeStarCount >= 5) earn("star_storm");
  if (threeStarCount >= LEVELS.length) earn("perfect_hunter");

  const pct = extras.totalTime > 0 ? extras.timeRemaining / extras.totalTime : 0;
  if (pct >= 0.8) earn("speed_demon");
  if (extras.timeRemaining <= 3 && extras.timeRemaining > 0) earn("photo_finish");

  if (next.highestUnlocked >= 3) earn("level_3_unlock");
  if (next.highestUnlocked >= 5) earn("level_5_unlock");
  if (next.highestUnlocked >= 10) earn("level_10");
  if (next.highestUnlocked > LEVELS.length) earn("champion");

  if (extras.usedPowerUp) earn("power_player");

  if (extras.sessionWins >= 3) earn("hat_trick");
  if (extras.sessionWins >= 5) earn("hot_streak");

  if ((next.timeAttackBest ?? 0) > 0) earn("time_attack_debut");
  if ((next.timeAttackBest ?? 0) >= 15) earn("time_attack_pro");
  if ((next.timeAttackBest ?? 0) >= 30) earn("time_attack_legend");

  return newlyEarned;
};
