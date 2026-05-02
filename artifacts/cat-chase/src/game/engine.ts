import type { Obstacle, PowerUp, PowerUpKind, Vec2 } from "./types";

export const rectsOverlap = (
  ax: number, ay: number, aw: number, ah: number,
  bx: number, by: number, bw: number, bh: number,
) => ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

export const circleHits = (a: Vec2, ra: number, b: Vec2, rb: number) => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy <= (ra + rb) * (ra + rb);
};

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

export const moveWithCollision = (
  pos: Vec2,
  radius: number,
  dx: number,
  dy: number,
  obstacles: Obstacle[],
  arenaW: number,
  arenaH: number,
  blockBy: Array<Obstacle["kind"]>,
): { pos: Vec2; hitTrap: boolean; inWater: boolean } => {
  let nx = pos.x + dx;
  let ny = pos.y + dy;
  let hitTrap = false;
  let inWater = false;

  // X axis
  for (const o of obstacles) {
    if (o.kind === "trap") {
      if (rectsOverlap(nx - radius, pos.y - radius, radius * 2, radius * 2, o.x, o.y, o.w, o.h)) {
        hitTrap = true;
      }
      continue;
    }
    if (o.kind === "water") {
      if (rectsOverlap(nx - radius, pos.y - radius, radius * 2, radius * 2, o.x, o.y, o.w, o.h)) {
        inWater = true;
      }
      continue;
    }
    if (!blockBy.includes(o.kind)) continue;
    if (rectsOverlap(nx - radius, pos.y - radius, radius * 2, radius * 2, o.x, o.y, o.w, o.h)) {
      if (dx > 0) nx = o.x - radius;
      else if (dx < 0) nx = o.x + o.w + radius;
    }
  }

  // Y axis
  for (const o of obstacles) {
    if (o.kind === "trap") {
      if (rectsOverlap(nx - radius, ny - radius, radius * 2, radius * 2, o.x, o.y, o.w, o.h)) {
        hitTrap = true;
      }
      continue;
    }
    if (o.kind === "water") {
      if (rectsOverlap(nx - radius, ny - radius, radius * 2, radius * 2, o.x, o.y, o.w, o.h)) {
        inWater = true;
      }
      continue;
    }
    if (!blockBy.includes(o.kind)) continue;
    if (rectsOverlap(nx - radius, ny - radius, radius * 2, radius * 2, o.x, o.y, o.w, o.h)) {
      if (dy > 0) ny = o.y - radius;
      else if (dy < 0) ny = o.y + o.h + radius;
    }
  }

  nx = clamp(nx, radius, arenaW - radius);
  ny = clamp(ny, radius, arenaH - radius);

  return { pos: { x: nx, y: ny }, hitTrap, inWater };
};

export const updateMovingObstacles = (obstacles: Obstacle[], dt: number) => {
  for (const o of obstacles) {
    if (o.kind !== "moving" || !o.origin || o.range === undefined) continue;
    const vx = o.vx ?? 0;
    const vy = o.vy ?? 0;
    o.x += vx * dt;
    o.y += vy * dt;
    if (vx !== 0) {
      const dx = o.x - o.origin.x;
      if (Math.abs(dx) > o.range) {
        o.vx = -vx;
        o.x = o.origin.x + Math.sign(dx) * o.range;
      }
    }
    if (vy !== 0) {
      const dy = o.y - o.origin.y;
      if (Math.abs(dy) > o.range) {
        o.vy = -vy;
        o.y = o.origin.y + Math.sign(dy) * o.range;
      }
    }
  }
};

const POWER_KINDS: PowerUpKind[] = ["speed", "freeze", "magnet", "extra"];

export const spawnPowerUp = (id: number, arenaW: number, arenaH: number, obstacles: Obstacle[]): PowerUp => {
  for (let i = 0; i < 30; i++) {
    const x = 60 + Math.random() * (arenaW - 120);
    const y = 60 + Math.random() * (arenaH - 120);
    const blocked = obstacles.some((o) =>
      o.kind !== "water" && rectsOverlap(x - 18, y - 18, 36, 36, o.x, o.y, o.w, o.h),
    );
    if (!blocked) {
      const kind = POWER_KINDS[Math.floor(Math.random() * POWER_KINDS.length)] as PowerUpKind;
      return { id, x, y, kind, spawnedAt: performance.now() };
    }
  }
  return { id, x: arenaW / 2, y: arenaH / 2, kind: "speed", spawnedAt: performance.now() };
};

export const findOpenPosition = (arenaW: number, arenaH: number, obstacles: Obstacle[], radius = 22): Vec2 => {
  for (let i = 0; i < 100; i++) {
    const x = 60 + Math.random() * (arenaW - 120);
    const y = 60 + Math.random() * (arenaH - 120);
    const blocked = obstacles.some((o) =>
      o.kind !== "water" && rectsOverlap(x - radius, y - radius, radius * 2, radius * 2, o.x, o.y, o.w, o.h),
    );
    if (!blocked) return { x, y };
  }
  return { x: arenaW / 2, y: arenaH / 2 };
};
