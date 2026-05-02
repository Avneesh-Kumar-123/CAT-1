export type Vec2 = { x: number; y: number };

export type Obstacle = {
  x: number;
  y: number;
  w: number;
  h: number;
  kind: "wall" | "soft" | "moving" | "trap" | "water";
  color?: string;
  vx?: number;
  vy?: number;
  range?: number;
  origin?: Vec2;
};

export type PowerUpKind = "speed" | "freeze" | "magnet" | "extra";

export type PowerUp = {
  id: number;
  x: number;
  y: number;
  kind: PowerUpKind;
  spawnedAt: number;
};

export type LevelTheme = {
  bg: string;
  bgGradient: [string, string];
  floorTile: string;
  accent: string;
  particles?: "dust" | "leaves" | "snow" | "neon" | "spark";
};

export type LevelDef = {
  id: number;
  name: string;
  subtitle: string;
  time: number;
  mouseSpeed: number;
  mouseAI: "scared" | "smart" | "darty" | "boss";
  /** how many mice must be caught to clear the level (defaults to 1) */
  mouseCount?: number;
  obstacles: Obstacle[];
  /** uncatchable distractors (boss levels only) */
  decoyMice?: number;
  theme: LevelTheme;
  hint: string;
};

export type Difficulty = "easy" | "normal" | "hard";

export type GameSettings = {
  sound: boolean;
  difficulty: Difficulty;
  catSkin: string;
};

export type LevelProgress = {
  unlocked: boolean;
  bestStars: number;
  bestTimeRemaining: number;
  bestScore: number;
};

export type SaveData = {
  highestUnlocked: number;
  totalCaught: number;
  levels: Record<number, LevelProgress>;
  settings: GameSettings;
};
