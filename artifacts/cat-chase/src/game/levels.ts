import type { LevelDef, Obstacle } from "./types";

const W = 1000;
const H = 700;

const wall = (x: number, y: number, w: number, h: number, color = "#8b5e3c"): Obstacle => ({
  x, y, w, h, kind: "wall", color,
});
const soft = (x: number, y: number, w: number, h: number, color = "#a78bfa"): Obstacle => ({
  x, y, w, h, kind: "soft", color,
});
const trap = (x: number, y: number, w: number, h: number): Obstacle => ({
  x, y, w, h, kind: "trap", color: "#f87171",
});
const water = (x: number, y: number, w: number, h: number): Obstacle => ({
  x, y, w, h, kind: "water", color: "#60a5fa",
});
const moving = (x: number, y: number, w: number, h: number, vx: number, vy: number, range: number, color = "#facc15"): Obstacle => ({
  x, y, w, h, kind: "moving", color, vx, vy, range, origin: { x, y },
});

export const ARENA = { w: W, h: H };

export const LEVELS: LevelDef[] = [
  // ── WORLD 1: SUNNY FIELDS ─────────────────────────────────────────────────
  {
    id: 1,
    name: "Cozy Kitchen",
    subtitle: "Where it all begins",
    time: 60,
    mouseSpeed: 105,
    mouseAI: "scared",
    mouseCount: 1,
    hint: "Use arrow keys or WASD to chase the mouse!",
    obstacles: [
      // Kitchen counters — L-shaped in corners
      wall(80, 80, 200, 40, "#b45309"),    // Top counter
      wall(80, 80, 40, 180, "#b45309"),    // Left counter side
      wall(720, 80, 200, 40, "#b45309"),   // Top-right counter
      wall(880, 80, 40, 180, "#b45309"),   // Right counter side
      // Kitchen island in center
      wall(380, 310, 240, 80, "#92400e"),  // Island
      // Bottom stove + fridge
      wall(80, 570, 120, 50, "#b45309"),   // Stove
      wall(800, 570, 120, 50, "#b45309"),  // Fridge
    ],
    theme: {
      bg: "#fef3c7",
      bgGradient: ["#fef3c7", "#fde68a"],
      floorTile: "#fcd34d",
      accent: "#b45309",
      particles: "dust",
    },
  },
  {
    id: 2,
    name: "Living Room",
    subtitle: "Mind the sofa",
    time: 60,
    mouseSpeed: 118,
    mouseAI: "scared",
    mouseCount: 2,
    hint: "The sofa cuts the room in two — chase through the gap.",
    obstacles: [
      // Long sofa cuts the room horizontally with a center doorway
      soft(80, 310, 340, 80, "#a78bfa"),    // Left sofa section
      soft(580, 310, 340, 80, "#a78bfa"),   // Right sofa section (gap 420–580 = 160px)
      // Central bookcase column creates H-shape
      wall(460, 80, 80, 180, "#7c2d12"),    // Bookcase top
      wall(460, 440, 80, 180, "#7c2d12"),   // Bookcase bottom
      // Side tables in all four quadrants
      soft(150, 130, 100, 60, "#c4b5fd"),
      soft(750, 130, 100, 60, "#c4b5fd"),
      soft(150, 510, 100, 60, "#c4b5fd"),
      soft(750, 510, 100, 60, "#c4b5fd"),
    ],
    theme: {
      bg: "#fce7f3",
      bgGradient: ["#fce7f3", "#fbcfe8"],
      floorTile: "#f9a8d4",
      accent: "#9d174d",
      particles: "dust",
    },
  },
  {
    id: 3,
    name: "Garden Patio",
    subtitle: "Catch them in the bushes",
    time: 60,
    mouseSpeed: 122,
    mouseAI: "scared",
    mouseCount: 2,
    hint: "Chase mice around the garden beds — corner them against the bushes!",
    obstacles: [
      // Four corner bushes — big open center to chase freely
      wall(60, 60, 130, 80, "#16a34a"),
      wall(810, 60, 130, 80, "#16a34a"),
      wall(60, 560, 130, 80, "#16a34a"),
      wall(810, 560, 130, 80, "#16a34a"),
      // One central flower bed — easy to go around either side
      soft(390, 295, 220, 70, "#86efac"),
    ],
    theme: {
      bg: "#dcfce7",
      bgGradient: ["#bbf7d0", "#86efac"],
      floorTile: "#86efac",
      accent: "#15803d",
      particles: "leaves",
    },
  },
  {
    id: 4,
    name: "The Library",
    subtitle: "Quiet… too quiet",
    time: 55,
    mouseSpeed: 130,
    mouseAI: "scared",
    mouseCount: 2,
    hint: "Two bookshelves divide the room — chase mice through the wide gaps!",
    obstacles: [
      // Two bookshelves, wide gaps on both ends — easy to navigate
      wall(320, 80, 40, 280, "#7c2d12"),   // Left shelf — gap below (360–700)
      wall(640, 340, 40, 280, "#7c2d12"),  // Right shelf — gap above (60–340)
      // Reading desk in center
      soft(430, 295, 140, 60, "#fbbf24"),
    ],
    theme: {
      bg: "#fef3c7",
      bgGradient: ["#fcd34d", "#f59e0b"],
      floorTile: "#fbbf24",
      accent: "#7c2d12",
      particles: "dust",
    },
  },
  {
    id: 5,
    name: "Spooky Attic",
    subtitle: "Watch your step",
    time: 55,
    mouseSpeed: 138,
    mouseAI: "darty",
    mouseCount: 2,
    hint: "Avoid the mousetraps in the corners — the center is safe to chase!",
    obstacles: [
      // Four corner traps — center arena is wide open and safe
      trap(90, 90, 55, 55),
      trap(855, 90, 55, 55),
      trap(90, 555, 55, 55),
      trap(855, 555, 55, 55),
      // Crate walls along edges (not blocking center)
      wall(80, 80, 120, 55, "#44403c"),
      wall(800, 80, 120, 55, "#44403c"),
      wall(80, 565, 120, 55, "#3f3f46"),
      wall(800, 565, 120, 55, "#44403c"),
    ],
    theme: {
      bg: "#1f2937",
      bgGradient: ["#374151", "#1f2937"],
      floorTile: "#4b5563",
      accent: "#fbbf24",
      particles: "spark",
    },
  },
  {
    id: 6,
    name: "Cheese Factory",
    subtitle: "The wheels are turning",
    time: 60,
    mouseSpeed: 148,
    mouseAI: "smart",
    mouseCount: 3,
    hint: "Conveyor belts shift — time your moves!",
    obstacles: [
      moving(160, 200, 160, 55, 90, 0, 300, "#fbbf24"),
      moving(680, 340, 160, 55, -90, 0, 300, "#fbbf24"),
      moving(430, 100, 55, 120, 0, 70, 200, "#facc15"),
      moving(430, 480, 55, 120, 0, -70, 200, "#facc15"),
      wall(80, 500, 80, 120, "#a16207"),
      wall(840, 80, 80, 120, "#a16207"),
      trap(160, 540, 45, 45),
      trap(795, 115, 45, 45),
    ],
    theme: {
      bg: "#fef9c3",
      bgGradient: ["#fef08a", "#fde047"],
      floorTile: "#facc15",
      accent: "#854d0e",
      particles: "dust",
    },
  },
  {
    id: 7,
    name: "Neon Alley",
    subtitle: "Midnight pursuit",
    time: 50,
    mouseSpeed: 155,
    mouseAI: "smart",
    mouseCount: 2,
    mouseType: "dash",
    hint: "Dash mice burst away every few seconds — time your pounce between bursts!",
    obstacles: [
      // Zigzag corridor walls
      wall(80, 80, 300, 50, "#1e1b4b"),    // Top-left horizontal
      wall(80, 80, 50, 260, "#1e1b4b"),    // Left vertical top
      wall(80, 430, 50, 190, "#1e1b4b"),   // Left vertical bottom
      wall(620, 570, 300, 50, "#1e1b4b"),  // Bottom-right horizontal
      wall(870, 190, 50, 380, "#1e1b4b"),  // Right vertical
      // Center water + moving blocker
      water(400, 280, 200, 140),
      moving(400, 360, 200, 35, 110, 0, 200, "#a855f7"),
      trap(340, 550, 50, 50),
      trap(610, 80, 50, 50),
    ],
    theme: {
      bg: "#0f172a",
      bgGradient: ["#1e1b4b", "#0f172a"],
      floorTile: "#1e293b",
      accent: "#22d3ee",
      particles: "neon",
    },
  },
  {
    id: 8,
    name: "Snowy Cabin",
    subtitle: "Two rooms, one mouse hunt",
    time: 60,
    mouseSpeed: 148,
    mouseAI: "scared",
    mouseCount: 3,
    hint: "The cabin has two rooms — mice scatter between them.",
    obstacles: [
      // Central dividing wall with doorway
      wall(440, 80, 120, 210, "#cbd5e1"),  // Divider top
      wall(440, 410, 120, 210, "#cbd5e1"), // Divider bottom (doorway gap 290–410 = 120px)
      // Room furniture
      soft(140, 150, 120, 60, "#94a3b8"),  // Left room — fireplace
      soft(740, 150, 120, 60, "#94a3b8"),  // Right room — wardrobe
      soft(140, 490, 120, 60, "#94a3b8"),  // Left room — bed
      soft(740, 490, 120, 60, "#94a3b8"),  // Right room — chest
      // Frozen puddle
      water(380, 300, 240, 100),
    ],
    theme: {
      bg: "#e0f2fe",
      bgGradient: ["#e0f2fe", "#bae6fd"],
      floorTile: "#f1f5f9",
      accent: "#0369a1",
      particles: "snow",
    },
  },
  {
    id: 9,
    name: "Pirate Ship",
    subtitle: "Mice ahoy!",
    time: 55,
    mouseSpeed: 155,
    mouseAI: "darty",
    mouseCount: 3,
    mouseType: "teleport",
    hint: "Teleport mice vanish every 8 seconds — watch the purple arc to time your catch!",
    obstacles: [
      // Ship rails (top and bottom of deck)
      wall(80, 80, 840, 30, "#78350f"),
      wall(80, 590, 840, 30, "#78350f"),
      // Mast in the center
      wall(470, 200, 60, 300, "#451a03"),
      // Moving crates on deck
      moving(160, 250, 100, 80, 0, 65, 200, "#92400e"),
      moving(740, 350, 100, 80, 0, -65, 200, "#92400e"),
      // Water on port and starboard
      water(80, 350, 50, 180),
      water(870, 200, 50, 180),
      // Cannon balls as traps
      trap(250, 540, 40, 40),
      trap(710, 110, 40, 40),
    ],
    theme: {
      bg: "#451a03",
      bgGradient: ["#7c2d12", "#451a03"],
      floorTile: "#92400e",
      accent: "#fbbf24",
      particles: "dust",
    },
  },
  {
    id: 10,
    name: "Candy Land",
    subtitle: "Sweet & sticky maze",
    time: 55,
    mouseSpeed: 160,
    mouseAI: "smart",
    mouseCount: 3,
    hint: "Weave through the candy cane maze — dead ends everywhere.",
    obstacles: [
      // Candy cane maze — interlocking rows
      soft(160, 80, 40, 280, "#f472b6"),   // Candy pillar 1 (top-anchored)
      soft(360, 340, 40, 280, "#a78bfa"),  // Candy pillar 2 (bottom-anchored)
      soft(560, 80, 40, 280, "#fbbf24"),   // Candy pillar 3 (top-anchored)
      soft(760, 340, 40, 280, "#34d399"),  // Candy pillar 4 (bottom-anchored)
      // Candy arch tops
      soft(160, 80, 240, 40, "#fb7185"),   // Top arch left
      soft(560, 80, 280, 40, "#fbbf24"),   // Top arch right
      soft(160, 580, 240, 40, "#a78bfa"),  // Bottom arch left
      soft(560, 580, 280, 40, "#34d399"),  // Bottom arch right
      trap(450, 220, 50, 50),
      trap(450, 430, 50, 50),
    ],
    theme: {
      bg: "#fce7f3",
      bgGradient: ["#fbcfe8", "#f9a8d4"],
      floorTile: "#fda4af",
      accent: "#be185d",
      particles: "dust",
    },
  },

  // ── WORLD 2: MYSTIC FOREST ────────────────────────────────────────────────
  {
    id: 11,
    name: "Toy Workshop",
    subtitle: "Mice in the gears",
    time: 55,
    mouseSpeed: 168,
    mouseType: "sleepy",
    mouseAI: "darty",
    mouseCount: 3,
    hint: "Pinball lanes — moving toys bounce side to side.",
    obstacles: [
      // Four moving toys in two lanes (left/right)
      moving(80, 200, 80, 80, 75, 0, 280, "#dc2626"),
      moving(80, 420, 80, 80, 75, 0, 280, "#16a34a"),
      moving(840, 240, 80, 80, -75, 0, 280, "#2563eb"),
      moving(840, 460, 80, 80, -75, 0, 280, "#9333ea"),
      // Lane dividers
      wall(430, 80, 140, 40, "#7c3aed"),   // Top lane cap
      wall(430, 580, 140, 40, "#7c3aed"),  // Bottom lane cap
      wall(430, 290, 140, 120, "#7c3aed"), // Center hub
      // Corner traps
      trap(80, 80, 40, 40),
      trap(880, 80, 40, 40),
      trap(80, 580, 40, 40),
      trap(880, 580, 40, 40),
    ],
    theme: {
      bg: "#dbeafe",
      bgGradient: ["#bfdbfe", "#93c5fd"],
      floorTile: "#bfdbfe",
      accent: "#1d4ed8",
      particles: "spark",
    },
  },
  {
    id: 12,
    name: "Cosmic Lab",
    subtitle: "Lab mice escaped!",
    time: 60,
    mouseSpeed: 165,
    mouseAI: "smart",
    mouseCount: 4,
    hint: "Four lab mice — divide and conquer.",
    obstacles: [
      wall(80, 80, 60, 200, "#7c3aed"),
      wall(80, 420, 60, 200, "#7c3aed"),
      wall(860, 80, 60, 200, "#7c3aed"),
      wall(860, 420, 60, 200, "#7c3aed"),
      water(440, 100, 120, 80),
      water(440, 520, 120, 80),
      trap(490, 340, 40, 40),
      moving(200, 320, 100, 60, 80, 0, 220, "#a855f7"),
      moving(700, 320, 100, 60, -80, 0, 220, "#a855f7"),
    ],
    theme: {
      bg: "#1e1b4b",
      bgGradient: ["#312e81", "#1e1b4b"],
      floorTile: "#3730a3",
      accent: "#a78bfa",
      particles: "neon",
    },
  },
  {
    id: 13,
    name: "Jungle Ruins",
    subtitle: "Temple with an inner courtyard",
    time: 55,
    mouseSpeed: 172,
    mouseAI: "darty",
    mouseCount: 3,
    hint: "Outer walls with gaps lead to an inner courtyard — mice guard the water.",
    obstacles: [
      // Outer temple wall segments (4 gaps for entry)
      wall(80, 80, 280, 40, "#166534"),     // Top-left wall
      wall(640, 80, 280, 40, "#166534"),    // Top-right wall (gap 360–640)
      wall(80, 580, 280, 40, "#166534"),    // Bottom-left wall
      wall(640, 580, 280, 40, "#166534"),   // Bottom-right wall (gap 360–640)
      wall(80, 80, 40, 220, "#166534"),     // Left-top wall
      wall(80, 400, 40, 220, "#166534"),    // Left-bottom wall (gap 300–400)
      wall(880, 80, 40, 220, "#166534"),    // Right-top wall
      wall(880, 400, 40, 220, "#166534"),   // Right-bottom wall
      // Inner water courtyard
      water(330, 240, 340, 220),
      // Moving vine
      moving(330, 240, 340, 30, 55, 0, 120, "#15803d"),
      // Side traps at outer wall gaps
      trap(80, 310, 40, 80),
      trap(880, 310, 40, 80),
    ],
    theme: {
      bg: "#14532d",
      bgGradient: ["#166534", "#14532d"],
      floorTile: "#15803d",
      accent: "#fbbf24",
      particles: "leaves",
    },
  },
  {
    id: 14,
    name: "Sky Castle",
    subtitle: "Battlement chase",
    time: 55,
    mouseSpeed: 176,
    mouseAI: "smart",
    mouseCount: 4,
    // Surprise: 2 decoy mice in the battlements
    decoyMice: 2,
    hint: "Two of those mice are decoys — only the real ones count!",
    obstacles: [
      // Castle battlement — 4 towers connected by walls with gaps
      wall(80, 80, 200, 50, "#94a3b8"),     // Top wall left
      wall(720, 80, 200, 50, "#94a3b8"),    // Top wall right (gap 280–720)
      wall(80, 570, 200, 50, "#94a3b8"),    // Bottom wall left
      wall(720, 570, 200, 50, "#94a3b8"),   // Bottom wall right
      wall(80, 80, 50, 200, "#94a3b8"),     // Left wall top
      wall(80, 420, 50, 200, "#94a3b8"),    // Left wall bottom (gap 280–420)
      wall(870, 80, 50, 200, "#94a3b8"),    // Right wall top
      wall(870, 420, 50, 200, "#94a3b8"),   // Right wall bottom
      // Inner keep
      wall(380, 220, 240, 50, "#64748b"),   // Keep top wall
      wall(380, 430, 240, 50, "#64748b"),   // Keep bottom wall
      wall(380, 220, 50, 260, "#64748b"),   // Keep left wall
      wall(570, 220, 50, 260, "#64748b"),   // Keep right wall (inner space ~140px sq)
    ],
    theme: {
      bg: "#e0f2fe",
      bgGradient: ["#bae6fd", "#7dd3fc"],
      floorTile: "#bae6fd",
      accent: "#0369a1",
      particles: "snow",
    },
  },
  {
    id: 15,
    name: "Lava Cavern",
    subtitle: "Lava river corridors",
    time: 50,
    mouseSpeed: 182,
    mouseAI: "darty",
    mouseCount: 3,
    hint: "Three lava pools in each row — find the gap and dart through!",
    obstacles: [
      // Upper lava row: 3 pools with gaps between (crossing at ~220 and ~550)
      trap(80, 210, 120, 60),
      trap(350, 210, 120, 60),
      trap(620, 210, 120, 60),
      trap(860, 210, 60, 60),
      // Lower lava row: offset gaps (crossing at ~350 and ~680)
      trap(80, 430, 60, 60),
      trap(210, 430, 120, 60),
      trap(490, 430, 120, 60),
      trap(750, 430, 170, 60),
      // Side walls
      wall(80, 300, 50, 130, "#7c2d12"),
      wall(870, 300, 50, 130, "#7c2d12"),
      // Center rock pillar
      wall(450, 290, 100, 120, "#7c2d12"),
    ],
    theme: {
      bg: "#7f1d1d",
      bgGradient: ["#991b1b", "#450a0a"],
      floorTile: "#b91c1c",
      accent: "#fcd34d",
      particles: "spark",
    },
  },
  {
    id: 16,
    name: "Underwater Reef",
    subtitle: "Slow motion chase",
    time: 65,
    mouseSpeed: 138,
    mouseAI: "scared",
    mouseCount: 4,
    hint: "Almost everything is water. You're slow — be patient.",
    obstacles: [
      water(0, 0, W, 200),
      water(0, 500, W, 200),
      water(0, 200, 200, 300),
      water(800, 200, 200, 300),
      wall(280, 280, 100, 100, "#0e7490"),
      wall(620, 280, 100, 100, "#0e7490"),
      wall(450, 320, 100, 60, "#0891b2"),
    ],
    theme: {
      bg: "#0c4a6e",
      bgGradient: ["#0e7490", "#0c4a6e"],
      floorTile: "#0891b2",
      accent: "#67e8f9",
      particles: "neon",
    },
  },
  {
    id: 17,
    name: "Haunted Manor",
    subtitle: "Three rooms, five traps",
    time: 55,
    mouseSpeed: 185,
    mouseAI: "darty",
    mouseCount: 4,
    hint: "The manor has three rooms — mice dart between them through doorways.",
    obstacles: [
      // Three-room mansion: left room | hallway | right room
      wall(310, 80, 50, 220, "#1e1b4b"),   // Left room right wall top
      wall(310, 400, 50, 220, "#1e1b4b"),  // Left room right wall bottom (gap 300–400)
      wall(640, 80, 50, 220, "#1e1b4b"),   // Right room left wall top
      wall(640, 400, 50, 220, "#1e1b4b"),  // Right room left wall bottom (gap 300–400)
      // Traps in each room + hallway
      trap(160, 200, 50, 50),              // Left room
      trap(160, 450, 50, 50),              // Left room
      trap(475, 320, 90, 60),              // Hallway center (big)
      trap(800, 200, 50, 50),              // Right room
      trap(800, 450, 50, 50),              // Right room
      // Furniture
      soft(100, 80, 160, 60, "#7c3aed"),   // Left room sofa
      soft(740, 80, 160, 60, "#7c3aed"),   // Right room wardrobe
      soft(100, 560, 160, 60, "#7c3aed"),  // Left room table
      soft(740, 560, 160, 60, "#7c3aed"),  // Right room table
    ],
    theme: {
      bg: "#0f172a",
      bgGradient: ["#1e1b4b", "#0f172a"],
      floorTile: "#312e81",
      accent: "#a78bfa",
      particles: "spark",
    },
  },
  {
    id: 18,
    name: "Robot Factory",
    subtitle: "Conveyor chaos",
    time: 60,
    mouseSpeed: 185,
    mouseAI: "smart",
    mouseCount: 4,
    hint: "Conveyors run nonstop. Pick a lane and commit.",
    obstacles: [
      moving(80, 200, 200, 50, 90, 0, 320, "#facc15"),
      moving(720, 250, 200, 50, -90, 0, 320, "#facc15"),
      moving(80, 400, 200, 50, 90, 0, 320, "#facc15"),
      moving(720, 450, 200, 50, -90, 0, 320, "#facc15"),
      wall(450, 100, 100, 60, "#475569"),
      wall(450, 540, 100, 60, "#475569"),
      trap(120, 60, 50, 40),
      trap(830, 600, 50, 40),
    ],
    theme: {
      bg: "#334155",
      bgGradient: ["#475569", "#1e293b"],
      floorTile: "#64748b",
      accent: "#fbbf24",
      particles: "spark",
    },
  },
  {
    id: 19,
    name: "Boss Lair",
    subtitle: "The Mouse King's chamber",
    time: 60,
    mouseSpeed: 190,
    mouseAI: "boss",
    mouseCount: 1,
    decoyMice: 4,
    hint: "Catch the BIG mouse — decoys can't be caught.",
    obstacles: [
      wall(80, 80, 60, 180, "#450a0a"),
      wall(80, 400, 60, 180, "#450a0a"),
      wall(860, 80, 60, 180, "#450a0a"),
      wall(860, 400, 60, 180, "#450a0a"),
      wall(80, 80, 300, 50, "#450a0a"),
      wall(620, 80, 300, 50, "#450a0a"),
      wall(80, 580, 300, 50, "#450a0a"),
      wall(620, 580, 300, 50, "#450a0a"),
      trap(250, 250, 50, 50),
      trap(700, 250, 50, 50),
      trap(250, 450, 50, 50),
      trap(700, 450, 50, 50),
      moving(400, 320, 200, 60, 60, 0, 200, "#dc2626"),
      wall(450, 180, 100, 60, "#7f1d1d"),
      wall(450, 460, 100, 60, "#7f1d1d"),
    ],
    theme: {
      bg: "#1c0a0a",
      bgGradient: ["#450a0a", "#1c0a0a"],
      floorTile: "#7f1d1d",
      accent: "#fbbf24",
      particles: "spark",
    },
  },
  {
    id: 20,
    name: "Mouse Kingdom",
    subtitle: "The final showdown",
    time: 80,
    mouseSpeed: 198,
    mouseAI: "boss",
    mouseCount: 5,
    hint: "Five royal mice. Use every power-up — show them who rules.",
    obstacles: [
      wall(80, 80, 60, 180, "#7f1d1d"),
      wall(80, 400, 60, 180, "#7f1d1d"),
      wall(860, 80, 60, 180, "#7f1d1d"),
      wall(860, 400, 60, 180, "#7f1d1d"),
      wall(140, 80, 220, 40, "#7f1d1d"),
      wall(640, 80, 220, 40, "#7f1d1d"),
      wall(140, 580, 220, 40, "#7f1d1d"),
      wall(640, 580, 220, 40, "#7f1d1d"),
      trap(220, 220, 50, 50),
      trap(730, 220, 50, 50),
      trap(220, 430, 50, 50),
      trap(730, 430, 50, 50),
      moving(380, 200, 240, 50, 80, 0, 180, "#dc2626"),
      moving(380, 450, 240, 50, -80, 0, 180, "#dc2626"),
      water(440, 320, 120, 60),
      wall(340, 320, 60, 60, "#fbbf24"),
      wall(600, 320, 60, 60, "#fbbf24"),
    ],
    theme: {
      bg: "#1c0a0a",
      bgGradient: ["#7f1d1d", "#1c0a0a"],
      floorTile: "#991b1b",
      accent: "#fcd34d",
      particles: "spark",
    },
  },

  // ── WORLD 3: SPACE STATION ─────────────────────────────────────────────────
  {
    id: 21,
    name: "Launch Bay",
    subtitle: "Mice stowed away!",
    time: 60,
    mouseSpeed: 205,
    mouseAI: "darty",
    mouseCount: 3,
    hint: "Rockets line the walls — stay in the central launch corridor.",
    obstacles: [
      // Launch pad rails top and bottom
      wall(80, 80, 840, 40, "#1e1b4b"),
      wall(80, 580, 840, 40, "#1e1b4b"),
      // Rocket bays on left and right
      wall(80, 120, 80, 160, "#6366f1"),   // Rocket bay left top
      wall(80, 420, 80, 160, "#6366f1"),   // Rocket bay left bottom
      wall(840, 120, 80, 160, "#818cf8"),  // Rocket bay right top
      wall(840, 420, 80, 160, "#818cf8"),  // Rocket bay right bottom
      // Moving crates crossing the corridor
      moving(200, 230, 110, 50, 90, 0, 280, "#6366f1"),
      moving(690, 420, 110, 50, -90, 0, 280, "#818cf8"),
      moving(440, 150, 50, 110, 0, 80, 200, "#a855f7"),
      // Traps at bay entrances
      trap(80, 280, 80, 140),              // Left bay gap trap
      trap(840, 280, 80, 140),             // Right bay gap trap
    ],
    theme: {
      bg: "#0f172a",
      bgGradient: ["#1e1b4b", "#0f172a"],
      floorTile: "#1e293b",
      accent: "#818cf8",
      particles: "neon",
    },
  },
  {
    id: 22,
    name: "Zero-G Lab",
    subtitle: "Floating island platforms",
    time: 55,
    mouseSpeed: 210,
    mouseAI: "smart",
    mouseCount: 3,
    hint: "Floating platforms isolate sections — orbit the outside to cut mice off.",
    obstacles: [
      // Four floating island platforms at cardinal positions
      soft(120, 130, 200, 140, "#1e1b4b"),  // Island NW
      soft(680, 130, 200, 140, "#1e1b4b"),  // Island NE
      soft(120, 430, 200, 140, "#1e1b4b"),  // Island SW
      soft(680, 430, 200, 140, "#1e1b4b"),  // Island SE
      // Asteroid belt moving obstacles through the gaps
      moving(330, 80, 45, 120, 0, 80, 240, "#a78bfa"),
      moving(625, 500, 45, 120, 0, -80, 240, "#c084fc"),
      moving(120, 300, 120, 45, 90, 0, 340, "#6366f1"),
      moving(760, 355, 120, 45, -90, 0, 340, "#818cf8"),
      // Central core
      water(420, 295, 160, 110),
      trap(180, 540, 45, 45),
      trap(775, 120, 45, 45),
    ],
    theme: {
      bg: "#020617",
      bgGradient: ["#0f172a", "#020617"],
      floorTile: "#1e293b",
      accent: "#a78bfa",
      particles: "neon",
    },
  },
  {
    id: 23,
    name: "Reactor Core",
    subtitle: "Meltdown imminent",
    time: 50,
    mouseSpeed: 215,
    mouseAI: "boss",
    mouseCount: 4,
    hint: "Energy beams sweep constantly — find the gap!",
    obstacles: [
      wall(80, 80, 60, 540, "#1e1b4b"),
      wall(860, 80, 60, 540, "#1e1b4b"),
      moving(200, 200, 240, 45, 100, 0, 260, "#22d3ee"),
      moving(560, 400, 240, 45, -100, 0, 260, "#0ea5e9"),
      moving(460, 140, 80, 100, 0, 90, 240, "#06b6d4"),
      trap(460, 310, 80, 80),
      trap(200, 510, 45, 45),
      trap(755, 140, 45, 45),
      wall(350, 310, 50, 80, "#0c4a6e"),
      wall(600, 310, 50, 80, "#0c4a6e"),
    ],
    theme: {
      bg: "#0c1445",
      bgGradient: ["#1e3a5f", "#0c1445"],
      floorTile: "#1e3a5f",
      accent: "#22d3ee",
      particles: "spark",
    },
  },

  // ── WORLD 4: VOLCANIC ISLAND ───────────────────────────────────────────────
  {
    id: 24,
    name: "Lava Beach",
    subtitle: "The sand is on fire",
    time: 55,
    mouseSpeed: 214,
    mouseAI: "darty",
    mouseCount: 3,
    hint: "Lava pools erupt in a grid — pick your corridor.",
    obstacles: [
      trap(140, 160, 70, 60),
      trap(790, 160, 70, 60),
      trap(140, 480, 70, 60),
      trap(790, 480, 70, 60),
      trap(450, 300, 100, 100),
      moving(250, 80, 90, 60, 0, 75, 200, "#dc2626"),
      moving(660, 560, 90, 60, 0, -75, 200, "#ef4444"),
      wall(80, 80, 50, 60, "#7f1d1d"),
      wall(870, 560, 50, 60, "#7f1d1d"),
    ],
    theme: {
      bg: "#431407",
      bgGradient: ["#7c2d12", "#431407"],
      floorTile: "#9a3412",
      accent: "#fb923c",
      particles: "spark",
    },
  },
  {
    id: 25,
    name: "Volcano Crater",
    subtitle: "Eruption in 3… 2… 1…",
    time: 55,
    mouseSpeed: 218,
    mouseAI: "smart",
    mouseCount: 4,
    hint: "Moving lava boulders — get caught between them and it's over.",
    obstacles: [
      moving(120, 250, 110, 55, 95, 0, 310, "#dc2626"),
      moving(770, 380, 110, 55, -95, 0, 310, "#b91c1c"),
      moving(460, 120, 55, 110, 0, 85, 240, "#ef4444"),
      moving(460, 470, 55, 110, 0, -85, 240, "#dc2626"),
      trap(200, 170, 55, 55),
      trap(745, 475, 55, 55),
      trap(200, 475, 55, 55),
      trap(745, 170, 55, 55),
      wall(460, 300, 80, 100, "#7f1d1d"),
    ],
    theme: {
      bg: "#3b0a0a",
      bgGradient: ["#7c2d12", "#3b0a0a"],
      floorTile: "#991b1b",
      accent: "#fbbf24",
      particles: "spark",
    },
  },
  {
    id: 26,
    name: "Molten Fortress",
    subtitle: "No safe ground",
    time: 60,
    mouseSpeed: 216,
    mouseAI: "boss",
    mouseCount: 4,
    hint: "Use the fortress openings to outsmart the boss mice.",
    obstacles: [
      wall(80, 80, 60, 180, "#7f1d1d"),
      wall(80, 400, 60, 180, "#7f1d1d"),
      wall(860, 80, 60, 180, "#7f1d1d"),
      wall(860, 400, 60, 180, "#7f1d1d"),
      wall(140, 80, 220, 40, "#7f1d1d"),
      wall(640, 80, 220, 40, "#7f1d1d"),
      wall(140, 580, 220, 40, "#7f1d1d"),
      wall(640, 580, 220, 40, "#7f1d1d"),
      trap(260, 220, 55, 55),
      trap(685, 220, 55, 55),
      trap(260, 425, 55, 55),
      trap(685, 425, 55, 55),
      moving(350, 195, 300, 55, 90, 0, 190, "#dc2626"),
      moving(350, 450, 300, 55, -90, 0, 190, "#b91c1c"),
      water(440, 305, 120, 90),
    ],
    theme: {
      bg: "#1c0505",
      bgGradient: ["#450a0a", "#1c0505"],
      floorTile: "#7f1d1d",
      accent: "#fcd34d",
      particles: "spark",
    },
  },
  // ── WORLD 5: ENDGAME ───────────────────────────────────────────────────────
  {
    id: 27,
    name: "Crystal Cavern",
    subtitle: "Dazzling gem maze",
    time: 55,
    mouseSpeed: 202,
    mouseAI: "smart",
    mouseCount: 4,
    hint: "Crystal walls form a grid maze — corners are dead ends.",
    obstacles: [
      // Crystal grid: 3×3 internal pillars with gaps between
      soft(220, 140, 120, 120, "#7c3aed"),   // NW pillar
      soft(440, 140, 120, 120, "#8b5cf6"),   // N pillar
      soft(660, 140, 120, 120, "#7c3aed"),   // NE pillar
      soft(220, 430, 120, 120, "#8b5cf6"),   // SW pillar
      soft(440, 430, 120, 120, "#7c3aed"),   // Center pillar
      soft(660, 430, 120, 120, "#8b5cf6"),   // SE pillar
      // Connecting crystal walls (partial, leaving passages)
      wall(80, 80, 40, 260, "#a78bfa"),
      wall(880, 80, 40, 260, "#a78bfa"),
      wall(80, 380, 40, 240, "#a78bfa"),
      wall(880, 380, 40, 240, "#a78bfa"),
      trap(130, 490, 45, 45),
      trap(825, 165, 45, 45),
      moving(310, 315, 100, 40, 80, 0, 160, "#c084fc"),
    ],
    theme: {
      bg: "#1e0a3c",
      bgGradient: ["#2e1065", "#1e0a3c"],
      floorTile: "#3b0764",
      accent: "#c084fc",
      particles: "neon",
    },
  },
  {
    id: 28,
    name: "Mirror Maze",
    subtitle: "Which way is out?",
    time: 50,
    mouseSpeed: 200,
    mouseAI: "darty",
    mouseCount: 3,
    hint: "A true dead-end maze — memorize the path or get trapped.",
    obstacles: [
      // Left spine — top anchored
      wall(190, 80, 40, 300, "#94a3b8"),
      // Second column — bottom anchored
      wall(360, 320, 40, 300, "#94a3b8"),
      // Third column — top anchored
      wall(530, 80, 40, 300, "#94a3b8"),
      // Fourth column — bottom anchored
      wall(700, 320, 40, 300, "#94a3b8"),
      // Right spine — top anchored
      wall(870, 80, 40, 300, "#94a3b8"),
      // Horizontal connectors (partial, making dead ends)
      wall(190, 80, 170, 40, "#cbd5e1"),     // Top connector L1–L2
      wall(530, 80, 170, 40, "#cbd5e1"),     // Top connector L3–L4
      wall(360, 580, 170, 40, "#cbd5e1"),    // Bottom connector L2–L3
      wall(700, 580, 170, 40, "#cbd5e1"),    // Bottom connector L4–R
      // Moving mirrors
      moving(230, 320, 110, 40, 65, 0, 120, "#64748b"),
      moving(610, 340, 110, 40, -65, 0, 120, "#64748b"),
      trap(95, 340, 45, 45),
      trap(860, 330, 45, 45),
    ],
    theme: {
      bg: "#0f172a",
      bgGradient: ["#1e293b", "#0f172a"],
      floorTile: "#334155",
      accent: "#e2e8f0",
      particles: "neon",
    },
  },
  {
    id: 29,
    name: "Thunder Dome",
    subtitle: "Electric mayhem",
    time: 55,
    mouseSpeed: 198,
    mouseAI: "boss",
    mouseCount: 4,
    hint: "Sweeping bolts from all sides — stay in the eye of the storm.",
    obstacles: [
      wall(80, 80, 840, 40, "#1e293b"),
      wall(80, 580, 840, 40, "#1e293b"),
      moving(170, 190, 110, 50, 95, 0, 310, "#facc15"),
      moving(170, 400, 110, 50, 95, 0, 310, "#fbbf24"),
      moving(720, 240, 110, 50, -95, 0, 310, "#fde047"),
      moving(720, 450, 110, 50, -95, 0, 310, "#facc15"),
      moving(455, 145, 90, 55, 0, 80, 210, "#fb923c"),
      moving(455, 500, 90, 55, 0, -80, 210, "#f97316"),
      trap(190, 335, 50, 50),
      trap(760, 335, 50, 50),
    ],
    theme: {
      bg: "#0a0a0a",
      bgGradient: ["#1c1917", "#0a0a0a"],
      floorTile: "#292524",
      accent: "#facc15",
      particles: "spark",
    },
  },
  {
    id: 30,
    name: "Mouse Apocalypse",
    subtitle: "The true final battle",
    time: 90,
    mouseSpeed: 198,
    mouseAI: "boss",
    mouseCount: 6,
    hint: "The arena has openings now — use them wisely.",
    obstacles: [
      wall(80, 80, 60, 180, "#450a0a"),
      wall(80, 400, 60, 180, "#450a0a"),
      wall(860, 80, 60, 180, "#450a0a"),
      wall(860, 400, 60, 180, "#450a0a"),
      wall(140, 80, 220, 40, "#450a0a"),
      wall(640, 80, 220, 40, "#450a0a"),
      wall(140, 580, 220, 40, "#450a0a"),
      wall(640, 580, 220, 40, "#450a0a"),
      trap(255, 210, 50, 50),
      trap(695, 210, 50, 50),
      trap(255, 440, 50, 50),
      trap(695, 440, 50, 50),
      trap(475, 325, 55, 55),
      moving(280, 295, 160, 50, 85, 0, 190, "#dc2626"),
      moving(560, 355, 160, 50, -85, 0, 190, "#b91c1c"),
      moving(455, 155, 90, 65, 0, 85, 200, "#ef4444"),
      water(200, 460, 180, 55),
      water(620, 185, 180, 55),
      soft(360, 295, 80, 80, "#7f1d1d"),
    ],
    theme: {
      bg: "#070202",
      bgGradient: ["#450a0a", "#070202"],
      floorTile: "#7f1d1d",
      accent: "#fcd34d",
      particles: "spark",
    },
  },
];
