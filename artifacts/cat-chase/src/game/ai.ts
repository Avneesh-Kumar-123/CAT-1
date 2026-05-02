import type { LevelDef, Obstacle, Vec2 } from "./types";
import { rectsOverlap } from "./engine";

export type MouseState = {
  pos: Vec2;
  vel: Vec2;
  facing: number;
  pauseUntil: number;
  dartUntil: number;
  dartDir: Vec2;
  isDecoy?: boolean;
  /** how long to commit to currently chosen flee angle (avoids dithering) */
  steerUntil?: number;
  steerAngle?: number;
};

const MOUSE_RADIUS = 14;
const PROBE_DISTANCE = 180;

/**
 * Returns how far an axis-aligned circle of `radius` can travel from `pos`
 * along `angle` before hitting an obstacle or arena wall, capped at `max`.
 */
const freeDistance = (
  pos: Vec2,
  angle: number,
  obstacles: Obstacle[],
  arenaW: number,
  arenaH: number,
  max: number,
  radius: number,
): number => {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const STEP = 12;
  let traveled = 0;
  while (traveled < max) {
    const px = pos.x + dx * traveled;
    const py = pos.y + dy * traveled;
    if (px < radius || px > arenaW - radius || py < radius || py > arenaH - radius) {
      return traveled;
    }
    let hit = false;
    for (const o of obstacles) {
      if (o.kind === "trap" || o.kind === "water") continue;
      if (rectsOverlap(px - radius, py - radius, radius * 2, radius * 2, o.x, o.y, o.w, o.h)) {
        hit = true;
        break;
      }
    }
    if (hit) return traveled;
    traveled += STEP;
  }
  return max;
};

/**
 * Picks the best escape angle: samples 9 candidates fanning out around the
 * direction away from the cat, then scores each by free distance ahead and
 * alignment with the flee direction. Avoids running into corners.
 */
const pickFleeAngle = (
  m: MouseState,
  cat: Vec2,
  obstacles: Obstacle[],
  arenaW: number,
  arenaH: number,
  now: number,
  bias: number, // 0..1 — how strongly to commit to flee dir vs free space
): number => {
  // Re-evaluate every 250ms to avoid jitter
  if (m.steerUntil && now < m.steerUntil && m.steerAngle !== undefined) {
    return m.steerAngle;
  }
  const dx = m.pos.x - cat.x;
  const dy = m.pos.y - cat.y;
  const dist = Math.hypot(dx, dy);
  const fleeAngle = dist > 1 ? Math.atan2(dy, dx) : Math.random() * Math.PI * 2;

  let bestScore = -Infinity;
  let bestAngle = fleeAngle;
  // 9 candidates: -120° .. +120° in 30° increments around flee direction
  for (let i = -4; i <= 4; i++) {
    const a = fleeAngle + (i * Math.PI) / 6;
    const free = freeDistance(m.pos, a, obstacles, arenaW, arenaH, PROBE_DISTANCE, MOUSE_RADIUS);
    const align = (Math.cos(a - fleeAngle) + 1) / 2; // 0..1
    // pull toward arena center when very close to a wall
    const centerPull =
      m.pos.x < 80 || m.pos.x > arenaW - 80 || m.pos.y < 80 || m.pos.y > arenaH - 80
        ? Math.cos(a - Math.atan2(arenaH / 2 - m.pos.y, arenaW / 2 - m.pos.x))
        : 0;
    const score = free * (0.4 + bias * 0.6) + align * 90 * bias + centerPull * 40;
    if (score > bestScore) {
      bestScore = score;
      bestAngle = a;
    }
  }
  m.steerUntil = now + 200 + Math.random() * 120;
  m.steerAngle = bestAngle;
  return bestAngle;
};

export const updateMouseAI = (
  m: MouseState,
  cat: Vec2,
  level: LevelDef,
  obstacles: Obstacle[],
  arenaW: number,
  arenaH: number,
  dt: number,
  now: number,
  speedMul: number,
  frozenUntil: number,
): Vec2 => {
  if (now < frozenUntil) {
    m.vel.x *= 0.6;
    m.vel.y *= 0.6;
    return { x: 0, y: 0 };
  }

  const ai = m.isDecoy ? "darty" : level.mouseAI;

  let targetDx = 0;
  let targetDy = 0;

  if (ai === "scared") {
    const a = pickFleeAngle(m, cat, obstacles, arenaW, arenaH, now, 0.85);
    targetDx = Math.cos(a);
    targetDy = Math.sin(a);
    if (now > m.pauseUntil && Math.random() < 0.004) {
      m.pauseUntil = now + 200 + Math.random() * 350;
    }
  } else if (ai === "smart") {
    const a = pickFleeAngle(m, cat, obstacles, arenaW, arenaH, now, 0.7);
    targetDx = Math.cos(a);
    targetDy = Math.sin(a);
  } else if (ai === "darty") {
    if (now > m.dartUntil) {
      // pick a new dart angle, biased away from cat & toward open space
      const a = pickFleeAngle(m, cat, obstacles, arenaW, arenaH, now, 0.45);
      // add randomness so it feels twitchy
      m.dartDir = {
        x: Math.cos(a + (Math.random() - 0.5) * 1.0),
        y: Math.sin(a + (Math.random() - 0.5) * 1.0),
      };
      m.dartUntil = now + 250 + Math.random() * 400;
      m.steerUntil = 0; // allow re-pick on next frame
    }
    targetDx = m.dartDir.x;
    targetDy = m.dartDir.y;
  } else if (ai === "boss") {
    // Boss: smart escape with frequent darts
    if (now > m.dartUntil && Math.hypot(m.pos.x - cat.x, m.pos.y - cat.y) < 240) {
      const a = pickFleeAngle(m, cat, obstacles, arenaW, arenaH, now, 0.55);
      m.dartDir = {
        x: Math.cos(a + (Math.random() - 0.5) * 0.7),
        y: Math.sin(a + (Math.random() - 0.5) * 0.7),
      };
      m.dartUntil = now + 220 + Math.random() * 280;
      m.steerUntil = 0;
    }
    if (now < m.dartUntil) {
      targetDx = m.dartDir.x;
      targetDy = m.dartDir.y;
    } else {
      const a = pickFleeAngle(m, cat, obstacles, arenaW, arenaH, now, 0.8);
      targetDx = Math.cos(a);
      targetDy = Math.sin(a);
    }
  }

  if (now < m.pauseUntil) {
    m.vel.x *= 0.6;
    m.vel.y *= 0.6;
    return { x: m.vel.x * dt, y: m.vel.y * dt };
  }

  const speed = level.mouseSpeed * speedMul * (m.isDecoy ? 0.85 : 1);
  // smooth velocity
  m.vel.x += (targetDx * speed - m.vel.x) * 0.22;
  m.vel.y += (targetDy * speed - m.vel.y) * 0.22;

  if (Math.abs(m.vel.x) > 5 || Math.abs(m.vel.y) > 5) {
    m.facing = Math.atan2(m.vel.y, m.vel.x);
  }

  return { x: m.vel.x * dt, y: m.vel.y * dt };
};
