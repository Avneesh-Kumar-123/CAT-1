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

export type CheeseBait = {
  x: number;
  y: number;
  placedAt: number;
  duration: number;
};

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

export type MouseType = "normal" | "dash" | "teleport" | "sleepy";

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
  /** override cat spawn position (needed when border walls fully enclose the arena) */
  catSpawn?: Vec2;
  /** special mouse behaviour type applied to all mice on this level */
  mouseType?: MouseType;
  theme: LevelTheme;
  hint: string;
};

export type Difficulty = "easy" | "normal" | "hard";

export type ControlMode = "tap" | "joystick";

export type GameSettings = {
  sound: boolean;
  difficulty: Difficulty;
  catSkin: string;
  controlMode: ControlMode;
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
  earnedAchievements: string[];
  timeAttackBest: number;
  survivalBest: number;
};
