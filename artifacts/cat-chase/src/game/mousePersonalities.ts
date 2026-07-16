import type { MouseKind } from "./types";

/**
 * Static reference data for the Mouse Almanac — one entry per catchable
 * "kind" (the 8 mouseType personalities plus the two cross-cutting special
 * mice, Golden and Boss/King). Purely descriptive; gameplay behavior for
 * each personality lives in ai.ts / GameCanvas.tsx, coin values in economy.ts.
 */
export type MousePersonality = {
  id: MouseKind;
  title: string;
  description: string;
  icon: string;
};

export const MOUSE_PERSONALITIES: MousePersonality[] = [
  {
    id: "normal",
    title: "Common Mouse",
    description: "No tricks up its sleeve — just runs when it sees you.",
    icon: "🐭",
  },
  {
    id: "dash",
    title: "Dash Mouse",
    description: "Bursts into a sudden sprint to put distance between you two.",
    icon: "⚡",
  },
  {
    id: "teleport",
    title: "Teleport Mouse",
    description: "Blinks to a random spot on the map every few seconds.",
    icon: "🔮",
  },
  {
    id: "sleepy",
    title: "Sleepy Mouse",
    description: "Nods off mid-run — free catches, if you're quick enough.",
    icon: "😴",
  },
  {
    id: "zigzag",
    title: "Zigzag Mouse",
    description: "Never runs in a straight line — impossible to predict.",
    icon: "〜",
  },
  {
    id: "stubborn",
    title: "Stubborn Mouse",
    description: "Wanders on its own agenda, barely reacting to the chase.",
    icon: "😤",
  },
  {
    id: "greedy",
    title: "Greedy Mouse",
    description: "Can't resist cheese bait — beelines for it and stops to eat.",
    icon: "🧀",
  },
  {
    id: "trickster",
    title: "Trickster Mouse",
    description: "Conjures fake copies of itself to confuse the chase.",
    icon: "🎭",
  },
  {
    id: "golden",
    title: "Golden Mouse",
    description: "A rare crowned mouse — catching it grants a big time bonus.",
    icon: "👑",
  },
  {
    id: "boss",
    title: "King Mouse",
    description: "Rules the Boss Lair levels — the biggest coin payout in the game.",
    icon: "🐹",
  },
];
