import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type React from "react";
import type { CheeseBait, LevelDef, Obstacle, PowerUp, PowerUpKind, Vec2 } from "@/game/types";
import { ARENA } from "@/game/levels";
import { getSkin, type CatSkin } from "@/game/skins";
import {
  circleHits,
  findOpenPosition,
  moveWithCollision,
  spawnPowerUp,
  updateMovingObstacles,
} from "@/game/engine";
import { updateMouseAI, type MouseState } from "@/game/ai";
import { sfx } from "@/game/audio";

// Module-level flag for edge-triggered water-entry sound (one GameCanvas at a time)
let _wasInWater = false;

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
};

type ActivePower = { kind: PowerUpKind; until: number };

type GameCanvasProps = {
  level: LevelDef;
  difficultyMul: number;
  paused: boolean;
  joystick: { x: number; y: number };
  catSkin?: string;
  controlMode?: "tap" | "joystick";
  tapTargetRef?: React.RefObject<{ x: number; y: number } | null>;
  cheesePlaceRef?: React.RefObject<{ x: number; y: number } | null>;
  onCatch: (timeRemaining: number, score: number) => void;
  onTimeUp: (score: number) => void;
  onTrap: () => void;
  onState: (s: {
    score: number;
    timeLeft: number;
    activePower: ActivePower | null;
    now: number;
    miceLeft: number;
    miceTotal: number;
    combo: number;
    cheeseAvailable: boolean;
  }) => void;
};

const CAT_SPEED_BASE = 220;
const CAT_RADIUS = 22;
const MOUSE_RADIUS = 14;
const POWER_RADIUS = 18;
const MOUSE_SPAWN_DIST = 320;

export const GameCanvas = ({
  level,
  difficultyMul,
  paused,
  joystick,
  catSkin = "orange",
  controlMode = "joystick",
  tapTargetRef,
  cheesePlaceRef,
  onCatch,
  onTimeUp,
  onTrap,
  onState,
}: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const lastEmitRef = useRef(0);
  const [shake, setShake] = useState(0);

  // Stabilize props via refs so the game loop effect doesn't restart each frame
  const pausedRef = useRef(paused);
  const joystickRef = useRef(joystick);
  const difficultyMulRef = useRef(difficultyMul);
  const catSkinRef = useRef(catSkin);
  const onCatchRef = useRef(onCatch);
  const onTimeUpRef = useRef(onTimeUp);
  const onTrapRef = useRef(onTrap);
  const onStateRef = useRef(onState);
  useLayoutEffect(() => { pausedRef.current = paused; }, [paused]);
  useLayoutEffect(() => { joystickRef.current = joystick; }, [joystick]);
  useLayoutEffect(() => { difficultyMulRef.current = difficultyMul; }, [difficultyMul]);
  useLayoutEffect(() => { catSkinRef.current = catSkin; }, [catSkin]);
  useLayoutEffect(() => { onCatchRef.current = onCatch; }, [onCatch]);
  useLayoutEffect(() => { onTimeUpRef.current = onTimeUp; }, [onTimeUp]);
  useLayoutEffect(() => { onTrapRef.current = onTrap; }, [onTrap]);
  useLayoutEffect(() => { onStateRef.current = onState; }, [onState]);
  const controlModeRef = useRef(controlMode);
  useLayoutEffect(() => { controlModeRef.current = controlMode; }, [controlMode]);

  const stateRef = useRef({
    cat: { x: 80, y: 80 } as Vec2,
    catVel: { x: 0, y: 0 } as Vec2,
    catFacing: 0,
    catBounce: 0,
    mice: [] as MouseState[],
    decoys: [] as MouseState[],
    miceTotal: 1,
    obstacles: [] as Obstacle[],
    powerUps: [] as PowerUp[],
    nextPowerId: 1,
    nextPowerSpawn: 0,
    timeLeft: level.time,
    score: 0,
    activePower: null as ActivePower | null,
    frozenUntil: 0,
    particles: [] as Particle[],
    floatTexts: [] as Array<{ x: number; y: number; text: string; life: number; color: string }>,
    keys: new Set<string>(),
    started: 0,
    catCaught: false,
    lastCatchAt: 0,
    combo: 0,
    cheeseBait: null as CheeseBait | null,
    cheeseUsed: false,
    rageMode: false as boolean,
    rageActivatedAt: 0,
    rageBannerLife: 0,
    lastSpaceAt: 0,
    dropCheeseAtCat: false,
    hintLife: 4.5,
    timeOrbs: [] as Array<{ x: number; y: number; collected: boolean }>,
  });

  // initialize level
  useEffect(() => {
    const s = stateRef.current;
    // deep-copy obstacles so moving ones don't mutate the level def
    s.obstacles = level.obstacles.map((o) => ({ ...o, origin: o.origin ? { ...o.origin } : undefined }));
    s.cat = level.catSpawn ?? findOpenPosition(ARENA.w, ARENA.h, s.obstacles, CAT_RADIUS);
    s.catVel = { x: 0, y: 0 };
    s.catFacing = 0;
    s.catBounce = 0;

    const count = Math.max(1, level.mouseCount ?? 1);
    s.miceTotal = count;
    s.mice = [];
    for (let i = 0; i < count; i++) {
      let pos = findOpenPosition(ARENA.w, ARENA.h, s.obstacles, MOUSE_RADIUS);
      let attempts = 0;
      while (attempts < 50) {
        const farFromCat = Math.hypot(pos.x - s.cat.x, pos.y - s.cat.y) >= MOUSE_SPAWN_DIST;
        const farFromOthers = s.mice.every(
          (om) => Math.hypot(om.pos.x - pos.x, om.pos.y - pos.y) > 120,
        );
        if (farFromCat && farFromOthers) break;
        pos = findOpenPosition(ARENA.w, ARENA.h, s.obstacles, MOUSE_RADIUS);
        attempts++;
      }
      s.mice.push({
        pos,
        vel: { x: 0, y: 0 },
        facing: Math.random() * Math.PI * 2,
        pauseUntil: 0,
        dartUntil: 0,
        dartDir: { x: 1, y: 0 },
        mouseType: level.mouseType ?? "normal",
      });
    }
    s.decoys = [];
    if (level.decoyMice) {
      for (let i = 0; i < level.decoyMice; i++) {
        s.decoys.push({
          pos: findOpenPosition(ARENA.w, ARENA.h, s.obstacles, MOUSE_RADIUS),
          vel: { x: 0, y: 0 },
          facing: 0,
          pauseUntil: 0,
          dartUntil: 0,
          dartDir: { x: 1, y: 0 },
          isDecoy: true,
        });
      }
    }
    s.powerUps = [];
    s.nextPowerId = 1;
    s.nextPowerSpawn = performance.now() + 4000;
    s.timeLeft = level.time;
    s.score = 0;
    s.activePower = null;
    s.frozenUntil = 0;
    s.particles = [];
    s.floatTexts = [];
    s.started = performance.now();
    s.catCaught = false;
    s.lastCatchAt = 0;
    s.combo = 0;
    s.cheeseBait = null;
    s.cheeseUsed = false;
    s.rageMode = false;
    s.rageActivatedAt = 0;
    s.rageBannerLife = 0;
    s.dropCheeseAtCat = false;
    s.hintLife = level.id <= 2 ? 4.5 : 0;
    // mark one random mouse as golden
    if (level.hasGoldenMouse && s.mice.length > 0) {
      const idx = Math.floor(Math.random() * s.mice.length);
      s.mice[idx].isGolden = true;
    }
    // time orbs from level definition
    s.timeOrbs = (level.timeOrbs ?? []).map((o) => ({ ...o, collected: false }));
  }, [level]);

  // keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " "].includes(k)) {
        e.preventDefault();
      }
      stateRef.current.keys.add(k);
      // Double-Space drops cheese at cat's current position
      if (k === " ") {
        const t = performance.now();
        if (t - stateRef.current.lastSpaceAt < 380) {
          stateRef.current.dropCheeseAtCat = true;
        }
        stateRef.current.lastSpaceAt = t;
      }
    };
    const up = (e: KeyboardEvent) => {
      stateRef.current.keys.delete(e.key.toLowerCase());
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // game loop
  useEffect(() => {
    let raf = 0;
    let prev = performance.now();
    const draw = (ctx: CanvasRenderingContext2D, dt: number, now: number) => {
      const s = stateRef.current;
      const W = ARENA.w;
      const H = ARENA.h;

      const isPaused = pausedRef.current;

      // compute canvas layout — needed for both rendering and tap-to-move
      const cw = ctx.canvas.clientWidth;
      const ch = ctx.canvas.clientHeight;
      // mobile: narrower canvas, portrait orientation
      const isMobile = cw < 768;
      const scaleX = cw / W;
      const scaleY = ch / H;
      // mobile: zoom camera in ~18% so gameplay elements read larger on small screens
      const scale = Math.min(scaleX, scaleY) * (isMobile ? 1.18 : 1);
      const offX = (cw - W * scale) / 2;
      let offY = (ch - H * scale) / 2;
      // mobile: shift the arena upward (up to ~75px) to shrink dead space below the HUD,
      // never letting less than 10px of margin remain above the arena
      if (isMobile) {
        const upShift = Math.min(75, Math.max(0, offY - 10));
        offY -= upShift;
      }

      // update timer
      if (!isPaused && !s.catCaught) {
        s.timeLeft -= dt;
        if (s.timeLeft <= 0) {
          s.timeLeft = 0;
          if (!s.catCaught) {
            s.catCaught = true;
            sfx.fail();
            onTimeUpRef.current(s.score);
          }
        }
      }

      // active power expiry
      if (s.activePower && s.activePower.until <= now) {
        s.activePower = null;
      }

      // cat input
      let inputX = 0;
      let inputY = 0;
      const k = s.keys;
      if (k.has("arrowleft") || k.has("a")) inputX -= 1;
      if (k.has("arrowright") || k.has("d")) inputX += 1;
      if (k.has("arrowup") || k.has("w")) inputY -= 1;
      if (k.has("arrowdown") || k.has("s")) inputY += 1;
      if (controlModeRef.current === "tap") {
        const tap = tapTargetRef?.current;
        if (tap && !isPaused && !s.catCaught) {
          const canvas = canvasRef.current;
          if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const localX = tap.x - rect.left;
            const localY = tap.y - rect.top;
            const worldX = (localX - offX) / scale;
            const worldY = (localY - offY) / scale;
            const ddx = worldX - s.cat.x;
            const ddy = worldY - s.cat.y;
            const dist = Math.hypot(ddx, ddy);
            // Only move if finger is not right on top of the cat — prevents jitter.
            // Do NOT clear the ref here; Play.tsx clears it on touchend so the cat
            // keeps following while the finger is held and stops the moment it lifts.
            if (dist > 6) {
              inputX = ddx / dist;
              inputY = ddy / dist;
            }
          }
        }
      } else {
        const j = joystickRef.current;
        if (j.x !== 0 || j.y !== 0) {
          inputX = j.x;
          inputY = j.y;
        }
      }
      const mag = Math.hypot(inputX, inputY);
      if (mag > 1) {
        inputX /= mag;
        inputY /= mag;
      }

      const speedMul = s.activePower?.kind === "speed" ? 1.6 : 1;
      // Give cat a 12% speed boost on mobile to compensate for thumb lag
      let catSpeed = CAT_SPEED_BASE * speedMul * (isMobile ? 1.12 : 1);

      let inWater = false;
      if (!isPaused && !s.catCaught) {
        // check if cat currently overlaps water
        for (const o of s.obstacles) {
          if (o.kind === "water") {
            if (
              s.cat.x + CAT_RADIUS > o.x &&
              s.cat.x - CAT_RADIUS < o.x + o.w &&
              s.cat.y + CAT_RADIUS > o.y &&
              s.cat.y - CAT_RADIUS < o.y + o.h
            ) {
              inWater = true;
              break;
            }
          }
        }
        if (inWater) catSpeed *= 0.5;
        // Edge-trigger: play water splash only on entry, never on every frame
        if (inWater && !_wasInWater) sfx.water();
        _wasInWater = inWater;

        const dx = inputX * catSpeed * dt;
        const dy = inputY * catSpeed * dt;
        const moved = moveWithCollision(
          s.cat,
          CAT_RADIUS,
          dx,
          dy,
          s.obstacles,
          W,
          H,
          ["wall", "soft", "moving"],
        );
        s.cat = moved.pos;
        if (moved.hitTrap) {
          s.catCaught = true;
          sfx.fail();
          setShake(0.5);
          onTrapRef.current();
        }
        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
          s.catFacing = Math.atan2(dy, dx);
          s.catBounce += dt * 12;
        }

        // mouse magnet pulls all live mice toward cat
        if (s.activePower?.kind === "magnet") {
          for (const mm of s.mice) {
            const mdx = s.cat.x - mm.pos.x;
            const mdy = s.cat.y - mm.pos.y;
            const md = Math.hypot(mdx, mdy);
            if (md > 1) {
              mm.pos.x += (mdx / md) * 40 * dt;
              mm.pos.y += (mdy / md) * 40 * dt;
            }
          }
        }
      }

      // moving obstacles
      if (!isPaused && !s.catCaught) {
        updateMovingObstacles(s.obstacles, dt);
      }

      // ── Cheese bait placement ──────────────────────────────────────────────
      if (!isPaused && !s.catCaught && cheesePlaceRef?.current && !s.cheeseUsed) {
        const canvas = canvasRef.current;
        if (canvas) {
          const place = cheesePlaceRef.current;
          cheesePlaceRef.current = null;
          const rect = canvas.getBoundingClientRect();
          const localX = place.x - rect.left;
          const localY = place.y - rect.top;
          const wx = Math.max(20, Math.min(W - 20, (localX - offX) / scale));
          const wy = Math.max(20, Math.min(H - 20, (localY - offY) / scale));
          s.cheeseBait = { x: wx, y: wy, placedAt: now, duration: 4000 };
          s.cheeseUsed = true;
          sfx.cheese();
        }
      }
      // Double-Space: drop cheese at cat's current arena position
      if (!isPaused && !s.catCaught && s.dropCheeseAtCat && !s.cheeseUsed) {
        s.dropCheeseAtCat = false;
        s.cheeseBait = { x: s.cat.x, y: s.cat.y, placedAt: now, duration: 4000 };
        s.cheeseUsed = true;
        sfx.cheese();
      }

      // Expire cheese after its duration
      if (s.cheeseBait && now - s.cheeseBait.placedAt >= s.cheeseBait.duration) {
        s.cheeseBait = null;
      }

      // mice update + catch check
      if (!isPaused && !s.catCaught) {
        const survivors: MouseState[] = [];
        // On mobile, slow mouse by 12% — compensates for thumb lag vs mouse precision
        const mobileDiffMul = isMobile ? 0.75 : 1;
        for (const m of s.mice) {
          // ── Teleport Mouse: snap to open position every 8 seconds ──────────
          if (m.mouseType === "teleport" && !m.isDecoy) {
            if (m.teleportNextAt === undefined) m.teleportNextAt = now + 8000;
            if (now >= m.teleportNextAt) {
              m.teleportPoofPos = { ...m.pos };
              m.teleportPoofAt = now;
              m.pos = findOpenPosition(W, H, s.obstacles, MOUSE_RADIUS);
              m.vel = { x: 0, y: 0 };
              m.teleportNextAt = now + 8000;
              sfx.pounce();
            }
          }

          const prevDashUntil = m.dashUntil;
          const rageMul = 1; // no speed penalty — rage is visual/audio only
          const goldenMul = m.isGolden ? 1.15 : 1;
          const d = updateMouseAI(
            m, s.cat, level, s.obstacles, W, H, dt, now,
            difficultyMulRef.current * mobileDiffMul * rageMul * goldenMul, s.frozenUntil, s.cheeseBait,
          );
          // Detect newly triggered dash burst → play sfx + float text
          if (m.dashUntil && m.dashUntil !== prevDashUntil && now < m.dashUntil) {
            sfx.dash();
            s.floatTexts.push({ x: m.pos.x, y: m.pos.y - 30, text: "💨 WOOSH!", life: 0.65, color: "#f97316" });
          }
          const moved = moveWithCollision(
            m.pos, MOUSE_RADIUS, d.x, d.y, s.obstacles, W, H,
            ["wall", "soft", "moving"],
          );
          m.pos = moved.pos;
          if (circleHits(s.cat, CAT_RADIUS, m.pos, MOUSE_RADIUS)) {
            // caught one! — combo-aware: pitch rises with each chained catch
            const nextCombo = now - s.lastCatchAt < 2500 ? s.combo + 1 : 1;
            sfx.catchCombo(nextCombo);
            sfx.squeak();
            spawnCatchParticles(s, m.pos.x, m.pos.y);
            // combo: chain catches within 2.5s
            if (now - s.lastCatchAt < 2500) s.combo += 1;
            else s.combo = 1;
            s.lastCatchAt = now;
            const comboBonus = s.combo > 1 ? s.combo * 25 : 0;
            const catchScore = 100 + Math.round(s.timeLeft * 5) + comboBonus;
            s.score += catchScore;
            // Golden Mouse: +8s bonus + fanfare
            if (m.isGolden) {
              s.timeLeft = Math.min(level.time + 8, s.timeLeft + 8);
              sfx.goldenCatch();
              s.floatTexts.push({ x: m.pos.x, y: m.pos.y - 44, text: "👑 +8s!", life: 1.8, color: "#fbbf24" });
              s.floatTexts.push({ x: m.pos.x, y: m.pos.y - 24, text: `+${catchScore}`, life: 1.2, color: "#fbbf24" });
            } else {
            // small time bonus per catch (not on the final mouse)
            const isFinal = survivors.length + (s.mice.length - s.mice.indexOf(m) - 1) === 0;
            if (!isFinal) {
              s.timeLeft = Math.min(level.time, s.timeLeft + 3);
              s.floatTexts.push({ x: m.pos.x, y: m.pos.y - 24, text: `+${catchScore}  +3s`, life: 1.2, color: "#fbbf24" });
            } else {
              s.floatTexts.push({ x: m.pos.x, y: m.pos.y - 24, text: `+${catchScore}`, life: 1.2, color: "#fbbf24" });
            }
            }
            setShake(0.45);
            // mouse is removed (not pushed to survivors)
          } else {
            survivors.push(m);
          }
        }
        s.mice = survivors;
        // Rage mode: last mouse gets 40% speed boost + red glow + banner
        if (s.mice.length === 1 && !s.rageMode && s.miceTotal > 1) {
          s.rageMode = true;
          s.rageActivatedAt = now;
          s.rageBannerLife = 2.2;
          sfx.rage();
        }
        if (s.mice.length === 0) {
          s.catCaught = true;
          setShake(0.6);
          onCatchRef.current(s.timeLeft, s.score + Math.round(s.timeLeft * 10));
        }
      }

      // decoys
      if (!isPaused && !s.catCaught) {
        for (const d of s.decoys) {
          const dd = updateMouseAI(
            d, s.cat, level, s.obstacles, W, H, dt, now,
            difficultyMulRef.current, s.frozenUntil, s.cheeseBait,
          );
          const moved = moveWithCollision(
            d.pos, MOUSE_RADIUS, dd.x, dd.y, s.obstacles, W, H,
            ["wall", "soft", "moving"],
          );
          d.pos = moved.pos;
        }
      }

      // power-ups
      if (!isPaused && !s.catCaught) {
        if (now > s.nextPowerSpawn && s.powerUps.length < 2) {
          s.powerUps.push(spawnPowerUp(s.nextPowerId++, W, H, s.obstacles));
          s.nextPowerSpawn = now + 6000 + Math.random() * 4000;
        }
        // pickup
        s.powerUps = s.powerUps.filter((p) => {
          if (circleHits(s.cat, CAT_RADIUS, { x: p.x, y: p.y }, POWER_RADIUS)) {
            if (p.kind === "speed")   sfx.powerSpeed();
            else if (p.kind === "freeze")  sfx.powerFreeze();
            else if (p.kind === "magnet")  sfx.powerMagnet();
            else                           sfx.powerExtra();
            spawnPickupParticles(s, p.x, p.y);
            s.score += 50;
            if (p.kind === "speed") s.activePower = { kind: "speed", until: now + 5000 };
            else if (p.kind === "freeze") {
              s.activePower = { kind: "freeze", until: now + 3000 };
              s.frozenUntil = now + 3000;
            } else if (p.kind === "magnet") s.activePower = { kind: "magnet", until: now + 4000 };
            else if (p.kind === "extra") s.timeLeft = Math.min(level.time, s.timeLeft + 5);
            return false;
          }
          // expire after 8s
          if (now - p.spawnedAt > 8000) return false;
          return true;
        });
      }

      // time orb collection
      if (!isPaused && !s.catCaught) {
        for (const orb of s.timeOrbs) {
          if (orb.collected) continue;
          const dist = Math.hypot(s.cat.x - orb.x, s.cat.y - orb.y);
          if (dist < CAT_RADIUS + 18) {
            orb.collected = true;
            s.timeLeft = Math.min(level.time + 10, s.timeLeft + 5);
            sfx.timeOrb();
            s.score += 30;
            s.floatTexts.push({ x: orb.x, y: orb.y - 20, text: "⏱ +5s", life: 1.4, color: "#fbbf24" });
          }
        }
      }

      // particles
      for (const p of s.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 200 * dt;
        p.life -= dt;
      }
      s.particles = s.particles.filter((p) => p.life > 0);

      // ===== render =====
      const dpr = window.devicePixelRatio || 1;
      if (ctx.canvas.width !== Math.round(cw * dpr) || ctx.canvas.height !== Math.round(ch * dpr)) {
        ctx.canvas.width = Math.round(cw * dpr);
        ctx.canvas.height = Math.round(ch * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // ── Full-canvas background (fills letterbox dead zones on mobile) ──────
      const fullGrad = ctx.createLinearGradient(0, 0, 0, ch);
      fullGrad.addColorStop(0, level.theme.bgGradient[0]);
      fullGrad.addColorStop(1, level.theme.bgGradient[1]);
      ctx.fillStyle = fullGrad;
      ctx.fillRect(0, 0, cw, ch);
      // Extend tile pattern across the whole canvas so dead zones look seamless
      if (scale > 0) {
        const tilePx = 80 * scale;
        ctx.globalAlpha = 0.11;
        ctx.fillStyle = level.theme.floorTile;
        const sx = ((offX % (tilePx * 2)) + tilePx * 2) % (tilePx * 2) - tilePx * 2;
        const sy = ((offY % (tilePx * 2)) + tilePx * 2) % (tilePx * 2) - tilePx * 2;
        for (let i = sx; i < cw; i += tilePx * 2) {
          for (let j = sy; j < ch; j += tilePx * 2) {
            ctx.fillRect(i, j, tilePx, tilePx);
            ctx.fillRect(i + tilePx, j + tilePx, tilePx, tilePx);
          }
        }
        ctx.globalAlpha = 1;
      }

      // arena bg
      ctx.save();
      ctx.translate(offX, offY);
      ctx.scale(scale, scale);

      // arena floor (brighter shade to distinguish play area from dead zones)
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, level.theme.bgGradient[0]);
      grad.addColorStop(1, level.theme.bgGradient[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // tile pattern (inside arena — slightly stronger than full-canvas tiles)
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = level.theme.floorTile;
      for (let i = 0; i < W; i += 80) {
        for (let j = 0; j < H; j += 80) {
          if (((i + j) / 80) % 2 === 0) {
            ctx.fillRect(i, j, 80, 80);
          }
        }
      }
      ctx.globalAlpha = 1;

      // ── Animated floor atmosphere (world-theme aware, mobile-safe) ────────────
      // All effects are pure math — no state, no game-logic impact.
      // Mobile gets half the element count for performance.
      const floorCount = isMobile ? 6 : 12;
      const pt = level.theme.particles;

      if (pt === "spark") {
        // 🔥 Lava / fire levels: rising orange embers
        ctx.save();
        for (let i = 0; i < floorCount; i++) {
          const seed = i * 137.5;
          const speed = 38 + (i % 5) * 14;
          const xPos = (Math.sin(seed) * 0.5 + 0.5) * W;
          const drift = Math.sin(now / 900 + seed) * 22;
          const yRaw = H - ((now / speed + seed * 4.3) % H);
          const sz = 2 + (i % 3) * 1.2;
          const alpha = 0.25 + Math.sin(now / 300 + seed) * 0.15;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = i % 3 === 0 ? "#fb923c" : i % 3 === 1 ? "#fbbf24" : "#f87171";
          ctx.beginPath();
          ctx.arc(xPos + drift, yRaw, sz, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      } else if (pt === "snow") {
        // ❄️ Snow / ice levels: falling snowflakes
        ctx.save();
        for (let i = 0; i < floorCount; i++) {
          const seed = i * 93.7;
          const speed = 22 + (i % 4) * 9;
          const xPos = (Math.sin(seed * 2.3) * 0.5 + 0.5) * W + Math.sin(now / 1100 + seed) * 18;
          const yPos = (now / speed + seed * 6.1) % H;
          const sz = 2 + (i % 4);
          ctx.globalAlpha = 0.18 + (i % 3) * 0.07;
          ctx.fillStyle = "#e0f2fe";
          ctx.beginPath();
          ctx.arc(xPos, yPos, sz, 0, Math.PI * 2);
          ctx.fill();
          // cross arms for larger flakes
          if (sz > 3) {
            ctx.globalAlpha = 0.12;
            ctx.strokeStyle = "#bae6fd";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(xPos - sz, yPos); ctx.lineTo(xPos + sz, yPos);
            ctx.moveTo(xPos, yPos - sz); ctx.lineTo(xPos, yPos + sz);
            ctx.stroke();
          }
        }
        ctx.restore();
      } else if (pt === "leaves") {
        // 🍃 Garden / forest levels: drifting leaves
        ctx.save();
        for (let i = 0; i < floorCount; i++) {
          const seed = i * 71.3;
          const speed = 18 + (i % 5) * 7;
          const xBase = (Math.sin(seed) * 0.5 + 0.5) * W;
          const xDrift = Math.sin(now / 1400 + seed) * 40;
          const yPos = (now / speed + seed * 5.7) % H;
          const rot = now / 800 + seed;
          const sz = 5 + (i % 3) * 2;
          ctx.globalAlpha = 0.18 + (i % 3) * 0.06;
          ctx.save();
          ctx.translate(xBase + xDrift, yPos);
          ctx.rotate(rot);
          // simple leaf ellipse
          const leafColor = i % 3 === 0 ? "#4ade80" : i % 3 === 1 ? "#86efac" : "#bbf7d0";
          ctx.fillStyle = leafColor;
          ctx.beginPath();
          ctx.ellipse(0, 0, sz * 0.55, sz, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        ctx.restore();
      } else if (pt === "neon") {
        // 💜 Neon / cyber levels: scrolling scan lines + grid pulse
        ctx.save();
        const scanCount = isMobile ? 3 : 5;
        for (let i = 0; i < scanCount; i++) {
          const yLine = (now / 80 + (H / scanCount) * i) % H;
          const alpha = 0.06 + Math.sin(now / 400 + i) * 0.03;
          ctx.globalAlpha = alpha;
          ctx.fillStyle = level.theme.accent;
          ctx.fillRect(0, yLine, W, 2);
        }
        // pulse dots at grid intersections
        const gridStep = 80;
        const pulseDots = isMobile ? 4 : 8;
        let dotCount = 0;
        outer: for (let gx = gridStep; gx < W; gx += gridStep) {
          for (let gy = gridStep; gy < H; gy += gridStep) {
            const p = Math.sin(now / 600 + gx * 0.03 + gy * 0.02);
            if (p > 0.5) {
              ctx.globalAlpha = (p - 0.5) * 0.25;
              ctx.fillStyle = level.theme.accent;
              ctx.beginPath();
              ctx.arc(gx, gy, 3, 0, Math.PI * 2);
              ctx.fill();
              if (++dotCount >= pulseDots) break outer;
            }
          }
        }
        ctx.restore();
      } else if (pt === "dust") {
        // 🌫️ Cozy / warm levels: floating dust motes
        ctx.save();
        for (let i = 0; i < floorCount; i++) {
          const seed = i * 53.1;
          const xPos = (Math.sin(seed * 1.7) * 0.5 + 0.5) * W + Math.sin(now / 2000 + seed) * 30;
          const yPos = (Math.sin(seed * 3.1) * 0.5 + 0.5) * H + Math.sin(now / 1600 + seed * 2) * 20;
          const sz = 1.5 + (i % 3) * 0.8;
          ctx.globalAlpha = 0.10 + Math.sin(now / 700 + seed) * 0.05;
          ctx.fillStyle = "#fef9c3";
          ctx.beginPath();
          ctx.arc(xPos, yPos, sz, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // arena border — thinner on mobile to save visual space
      ctx.strokeStyle = level.theme.accent;
      ctx.lineWidth = isMobile ? 4 : 8;
      ctx.strokeRect(2, 2, W - 4, H - 4);

      // obstacles
      for (const o of s.obstacles) {
        ctx.save();
        if (o.kind === "water") {
          ctx.fillStyle = o.color ?? "#60a5fa";
          ctx.globalAlpha = 0.7;
          roundRect(ctx, o.x, o.y, o.w, o.h, 16);
          ctx.fill();
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = "#bfdbfe";
          for (let i = 0; i < 4; i++) {
            const yy = o.y + 12 + i * 16 + Math.sin(now / 400 + i) * 3;
            ctx.fillRect(o.x + 12, yy, o.w - 24, 3);
          }
        } else if (o.kind === "trap") {
          // mousetrap: red base with metal bar
          ctx.fillStyle = "#7f1d1d";
          roundRect(ctx, o.x, o.y, o.w, o.h, 4);
          ctx.fill();
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(o.x + 6, o.y + 6);
          ctx.lineTo(o.x + o.w - 6, o.y + o.h - 6);
          ctx.moveTo(o.x + o.w - 6, o.y + 6);
          ctx.lineTo(o.x + 6, o.y + o.h - 6);
          ctx.stroke();
          ctx.fillStyle = "#fde68a";
          ctx.beginPath();
          ctx.arc(o.x + o.w / 2, o.y + o.h / 2, 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          const radius = o.kind === "soft" ? 18 : 8;
          // ── Drop shadow beneath wall ─────────────────────────────────────────
          ctx.globalAlpha = 0.28;
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          roundRect(ctx, o.x + 5, o.y + 6, o.w, o.h, radius);
          ctx.fill();
          ctx.globalAlpha = 1;
          // ── Main wall fill with vertical gradient ─────────────────────────────
          const wallGrad = ctx.createLinearGradient(o.x, o.y, o.x, o.y + o.h);
          const base = o.color ?? "#8b5e3c";
          wallGrad.addColorStop(0, lightenColor(base, 0.22));
          wallGrad.addColorStop(0.45, base);
          wallGrad.addColorStop(1, darkenColor(base, 0.30));
          ctx.fillStyle = wallGrad;
          roundRect(ctx, o.x, o.y, o.w, o.h, radius);
          ctx.fill();
          // ── Top-face bright edge (3D top face) ───────────────────────────────
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = lightenColor(base, 0.45);
          roundRect(ctx, o.x + 2, o.y + 2, o.w - 4, Math.min(6, o.h * 0.2), Math.min(radius, 5));
          ctx.fill();
          ctx.globalAlpha = 1;
          // ── Left-face bright strip ────────────────────────────────────────────
          ctx.globalAlpha = 0.30;
          ctx.fillStyle = "#fff";
          roundRect(ctx, o.x + 2, o.y + 6, Math.min(5, o.w * 0.15), o.h - 10, 2);
          ctx.fill();
          ctx.globalAlpha = 1;
          // ── Bottom/right dark edge ─────────────────────────────────────────────
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = "#000";
          roundRect(ctx, o.x + 3, o.y + o.h - 5, o.w - 6, 5, 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.restore();
      }

      // power-ups
      for (const p of s.powerUps) {
        const pulse = 1 + Math.sin(now / 200) * 0.08;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(pulse, pulse);
        const colors: Record<PowerUpKind, [string, string]> = {
          speed: ["#fde047", "#ca8a04"],
          freeze: ["#bae6fd", "#0369a1"],
          magnet: ["#fecaca", "#dc2626"],
          extra: ["#bbf7d0", "#16a34a"],
        };
        const [bg, ring] = colors[p.kind];
        ctx.beginPath();
        ctx.arc(0, 0, POWER_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = bg;
        ctx.fill();
        ctx.strokeStyle = ring;
        ctx.lineWidth = 4;
        ctx.stroke();
        // letter
        ctx.fillStyle = ring;
        ctx.font = "bold 18px Fredoka, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const letter = { speed: "S", freeze: "F", magnet: "M", extra: "+" }[p.kind];
        ctx.fillText(letter, 0, 1);
        ctx.restore();
      }

      // ── Cheese bait rendering ─────────────────────────────────────────────
      if (s.cheeseBait) {
        const cb = s.cheeseBait;
        const elapsed = now - cb.placedAt;
        const progress = Math.max(0, 1 - elapsed / cb.duration);
        // fade out in the last 800ms
        const fadeAlpha = elapsed > cb.duration - 800 ? (progress * cb.duration) / 800 : 1;
        const pulse = 1 + Math.sin(now / 180) * 0.06;

        ctx.save();
        ctx.translate(cb.x, cb.y);
        ctx.scale(pulse, pulse);
        ctx.globalAlpha = Math.min(1, fadeAlpha);

        // outer glow ring
        const glow = ctx.createRadialGradient(0, 0, 8, 0, 0, 34);
        glow.addColorStop(0, "rgba(253, 224, 71, 0.55)");
        glow.addColorStop(1, "rgba(253, 224, 71, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(0, 0, 34, 0, Math.PI * 2);
        ctx.fill();

        // cheese body
        ctx.beginPath();
        ctx.arc(0, 0, 17, 0, Math.PI * 2);
        ctx.fillStyle = "#fcd34d";
        ctx.fill();
        ctx.strokeStyle = "#b45309";
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // cheese holes
        ctx.fillStyle = "#a16207";
        const holes: [number, number, number][] = [[-5, -3, 3.2], [5, 4, 2.6], [-2, 6, 2.2]];
        for (const [hx, hy, hr] of holes) {
          ctx.beginPath();
          ctx.arc(hx, hy, hr, 0, Math.PI * 2);
          ctx.fill();
        }

        // shrinking timer arc (green → red)
        const arcEnd = -Math.PI / 2 + Math.PI * 2 * progress;
        ctx.beginPath();
        ctx.arc(0, 0, 23, -Math.PI / 2, arcEnd);
        ctx.strokeStyle = progress > 0.35 ? "#16a34a" : "#dc2626";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.restore();
        ctx.globalAlpha = 1;
      }

      // mouse trail when speed boost
      if (s.activePower?.kind === "speed") {
        ctx.fillStyle = "rgba(253, 224, 71, 0.4)";
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.arc(s.cat.x - i * (Math.cos(s.catFacing) * 8), s.cat.y - i * (Math.sin(s.catFacing) * 8), CAT_RADIUS - i * 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── Time Orbs ─────────────────────────────────────────────────────────────
      for (const orb of s.timeOrbs) {
        if (orb.collected) continue;
        const pulse = 0.75 + 0.25 * Math.sin(now / 400);
        const spin = (now / 1200) % (Math.PI * 2);
        ctx.save();
        ctx.translate(orb.x, orb.y);
        // outer glow
        const orbGlow = ctx.createRadialGradient(0, 0, 4, 0, 0, 24);
        orbGlow.addColorStop(0, `rgba(251,191,36,${(0.55 * pulse).toFixed(2)})`);
        orbGlow.addColorStop(1, "rgba(251,191,36,0)");
        ctx.fillStyle = orbGlow;
        ctx.beginPath();
        ctx.arc(0, 0, 24, 0, Math.PI * 2);
        ctx.fill();
        // clock face
        ctx.fillStyle = "#fef3c7";
        ctx.strokeStyle = "#f59e0b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        // clock hands
        ctx.strokeStyle = "#92400e";
        ctx.lineWidth = 2;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(spin - Math.PI / 2) * 8, Math.sin(spin - Math.PI / 2) * 8);
        ctx.stroke();
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(spin * 12 - Math.PI / 2) * 6, Math.sin(spin * 12 - Math.PI / 2) * 6);
        ctx.stroke();
        ctx.restore();
      }

      // mice
      for (const m of s.mice) {
        // Rage glow: pulsing red halo when last mouse is in rage mode
        if (s.rageMode) {
          const pulse = 0.55 + 0.45 * Math.sin(now / 110);
          ctx.save();
          const glowRad = ctx.createRadialGradient(m.pos.x, m.pos.y, 6, m.pos.x, m.pos.y, 38);
          glowRad.addColorStop(0, `rgba(239,68,68,${(0.5 + pulse * 0.35).toFixed(2)})`);
          glowRad.addColorStop(1, "rgba(239,68,68,0)");
          ctx.fillStyle = glowRad;
          ctx.beginPath();
          ctx.arc(m.pos.x, m.pos.y, 38, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // ── Dash Mouse: orange speed streak while bursting ───────────────────
        if (m.mouseType === "dash" && m.dashUntil && now < m.dashUntil && m.dashDir) {
          ctx.save();
          for (let i = 1; i <= 4; i++) {
            const tx = m.pos.x - m.dashDir.x * i * 10;
            const ty = m.pos.y - m.dashDir.y * i * 10;
            ctx.globalAlpha = 0.38 - i * 0.07;
            ctx.fillStyle = "#f97316";
            ctx.beginPath();
            ctx.arc(tx, ty, MOUSE_RADIUS - i * 2, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // ── Teleport Mouse: poof sparkle at old position ─────────────────────
        if (m.mouseType === "teleport" && m.teleportPoofAt && m.teleportPoofPos) {
          const poofAge = now - m.teleportPoofAt;
          if (poofAge < 550) {
            const t = poofAge / 550;
            ctx.save();
            ctx.globalAlpha = (1 - t) * 0.9;
            for (let i = 0; i < 8; i++) {
              const angle = (i / 8) * Math.PI * 2;
              const r = 6 + t * 30;
              const sx = m.teleportPoofPos.x + Math.cos(angle) * r;
              const sy = m.teleportPoofPos.y + Math.sin(angle) * r;
              ctx.fillStyle = i % 2 === 0 ? "#a78bfa" : "#c4b5fd";
              ctx.beginPath();
              ctx.arc(sx, sy, 4 - t * 3, 0, Math.PI * 2);
              ctx.fill();
            }
            // centre flash
            ctx.globalAlpha = (1 - t) * 0.6;
            ctx.fillStyle = "#ede9fe";
            ctx.beginPath();
            ctx.arc(m.teleportPoofPos.x, m.teleportPoofPos.y, (1 - t) * 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }

        // ── Teleport Mouse: cooldown arc under mouse ─────────────────────────
        if (m.mouseType === "teleport" && m.teleportNextAt !== undefined) {
          const coolTotal = 8000;
          const coolLeft = Math.max(0, m.teleportNextAt - now);
          const progress = 1 - coolLeft / coolTotal;
          ctx.save();
          ctx.globalAlpha = 0.7;
          ctx.strokeStyle = "#a78bfa";
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.arc(m.pos.x, m.pos.y + 20, 10, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // ── Sleepy Mouse: ZZZ animation while napping ────────────────────────
        if (m.mouseType === "sleepy" && now < m.pauseUntil) {
          ctx.save();
          ctx.globalAlpha = 0.82;
          // dim the mouse area slightly
          ctx.fillStyle = "rgba(148,163,184,0.35)";
          ctx.beginPath();
          ctx.arc(m.pos.x, m.pos.y, MOUSE_RADIUS + 4, 0, Math.PI * 2);
          ctx.fill();
          // three floating Zs at different sizes + offsets
          const zPhase = (now % 1200) / 1200;
          const zOffsets = [{ dx: 0, size: 14, delay: 0 }, { dx: 8, size: 11, delay: 0.33 }, { dx: 16, size: 9, delay: 0.66 }];
          for (const z of zOffsets) {
            const t = (zPhase + z.delay) % 1;
            ctx.globalAlpha = Math.sin(t * Math.PI) * 0.9;
            ctx.font = `bold ${z.size}px Fredoka, sans-serif`;
            ctx.fillStyle = "#60a5fa";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("Z", m.pos.x + z.dx - 8, m.pos.y - 24 - t * 18);
          }
          ctx.restore();
        }

        // ── Golden Mouse: pulsing gold halo ──────────────────────────────────
        if (m.isGolden) {
          const gPulse = 0.6 + 0.4 * Math.sin(now / 180);
          ctx.save();
          const goldGlow = ctx.createRadialGradient(m.pos.x, m.pos.y, 6, m.pos.x, m.pos.y, 34);
          goldGlow.addColorStop(0, `rgba(251,191,36,${(0.65 * gPulse).toFixed(2)})`);
          goldGlow.addColorStop(1, "rgba(251,191,36,0)");
          ctx.fillStyle = goldGlow;
          ctx.beginPath();
          ctx.arc(m.pos.x, m.pos.y, 34, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        const variant = level.mouseAI === "boss" ? "boss" : "normal";
        drawMouse(ctx, m.pos.x, m.pos.y, m.facing, now, variant, level.theme.accent);

        // ── Golden Mouse: crown above mouse ──────────────────────────────────
        if (m.isGolden) {
          ctx.save();
          ctx.font = "16px serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          const crownBob = Math.sin(now / 300) * 2;
          ctx.fillText("👑", m.pos.x, m.pos.y - MOUSE_RADIUS - 4 + crownBob);
          ctx.restore();
        }
      }
      for (const d of s.decoys) drawMouse(ctx, d.pos.x, d.pos.y, d.facing, now, "decoy", level.theme.accent);

      // ── Cat spotlight: warm radial glow around the cat ───────────────────────
      {
        const spotR = 200;
        const spot = ctx.createRadialGradient(s.cat.x, s.cat.y, 20, s.cat.x, s.cat.y, spotR);
        spot.addColorStop(0, "rgba(255,240,180,0.13)");
        spot.addColorStop(0.5, "rgba(255,220,120,0.06)");
        spot.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = spot;
        ctx.beginPath();
        ctx.arc(s.cat.x, s.cat.y, spotR, 0, Math.PI * 2);
        ctx.fill();
      }

      // cat
      drawCat(ctx, s.cat.x, s.cat.y, s.catFacing, s.catBounce, getSkin(catSkinRef.current));

      // particles
      for (const p of s.particles) {
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // floating score texts
      for (const ft of s.floatTexts) {
        ft.life -= dt;
        ft.y -= 30 * dt;
      }
      s.floatTexts = s.floatTexts.filter((ft) => ft.life > 0);
      ctx.font = "bold 22px Fredoka, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const ft of s.floatTexts) {
        ctx.globalAlpha = Math.min(1, ft.life * 1.2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(0,0,0,0.65)";
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
      }
      ctx.globalAlpha = 1;

      // ── Edge vignette: dark fade toward arena border ──────────────────────────
      {
        const vx = W / 2, vy = H / 2;
        const vigR = Math.max(W, H) * 0.78;
        const vig = ctx.createRadialGradient(vx, vy, vigR * 0.38, vx, vy, vigR);
        vig.addColorStop(0, "rgba(0,0,0,0)");
        vig.addColorStop(1, "rgba(0,0,0,0.48)");
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, W, H);
      }

      // freeze overlay
      if (s.activePower?.kind === "freeze" && s.frozenUntil > now) {
        ctx.fillStyle = "rgba(186, 230, 253, 0.20)";
        ctx.fillRect(0, 0, W, H);
      }

      // Controls hint strip — fades in at level start, auto-dismisses after 4.5s
      if (s.hintLife > 0 && !isPaused) {
        s.hintLife -= dt;
        const hl = Math.max(0, s.hintLife);
        const hintAlpha = Math.min(1, hl * 3) * Math.min(1, (4.5 - hl) * 6);
        if (hintAlpha > 0.02) {
          const isMob = (canvasRef.current?.clientWidth ?? 1000) < 768;
          const line1 = isMob ? "🕹️  Joystick to move  •  Double-tap for 🧀🧀" : "⌨️  WASD / Arrows to move ⬆️⬇️⬅️➡️ •  Double-Space for 🟥 ➡️ 🧀";
          const line2 = "🧀 = Cheese bait — lures mice to one spot!";
          ctx.save();
          ctx.globalAlpha = hintAlpha;
          const bw = W - 80;
          const bh = 62;
          const bx = 40;
          const by = H - 100;
          ctx.fillStyle = "rgba(0,0,0,0.72)";
          roundRect(ctx, bx, by, bw, bh, 14);
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.18)";
          ctx.lineWidth = 1.5;
          roundRect(ctx, bx, by, bw, bh, 14);
          ctx.stroke();
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillStyle = "#fff";
          ctx.font = "bold 15px Fredoka, sans-serif";
          ctx.fillText(line1, W / 2, by + 20);
          ctx.fillStyle = "rgba(251,191,36,0.92)";
          ctx.font = "13px Fredoka, sans-serif";
          ctx.fillText(line2, W / 2, by + 44);
          ctx.restore();
        }
      }

      // Rage banner: "🔥 LAST ONE!" fades in fast, lingers, then fades out
      if (s.rageBannerLife > 0) {
        s.rageBannerLife -= dt;
        const bl = Math.max(0, s.rageBannerLife);
        const bannerAlpha = Math.min(1, (2.2 - bl) * 6) * Math.min(1, bl * 5);
        if (bannerAlpha > 0.01) {
          ctx.save();
          ctx.globalAlpha = bannerAlpha;
          ctx.fillStyle = "rgba(185,28,28,0.92)";
          roundRect(ctx, W / 2 - 178, H / 2 - 54, 356, 66, 20);
          ctx.fill();
          ctx.strokeStyle = "#fca5a5";
          ctx.lineWidth = 3;
          roundRect(ctx, W / 2 - 178, H / 2 - 54, 356, 66, 20);
          ctx.stroke();
          ctx.font = "bold 32px Fredoka, sans-serif";
          ctx.fillStyle = "#fff";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("🔥  LAST ONE!", W / 2, H / 2 - 21);
          ctx.restore();
        }
      }

      ctx.restore();

      // emit state for HUD (throttled to ~10Hz to avoid render storms)
      if (now - lastEmitRef.current > 100) {
        lastEmitRef.current = now;
        onStateRef.current({
          score: s.score,
          timeLeft: s.timeLeft,
          activePower: s.activePower,
          now,
          miceLeft: s.mice.length,
          miceTotal: s.miceTotal,
          combo: now - s.lastCatchAt < 2500 ? s.combo : 0,
          cheeseAvailable: !s.cheeseUsed,
        });
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) draw(ctx, dt, now);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [level]);

  // shake decay
  useEffect(() => {
    if (shake <= 0) return;
    const t = setTimeout(() => setShake(0), 400);
    return () => clearTimeout(t);
  }, [shake]);

  return (
    <div
      ref={wrapRef}
      className={`relative w-full h-full ${shake > 0 ? "animate-shake" : ""}`}
      style={{ background: level.theme.bgGradient[1] }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};

// Parse "#rrggbb" → [r,g,b] and blend toward white (amt>0) or black (amt<0)
const lightenColor = (hex: string, amt: number): string => {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) + 255 * amt));
  const g = Math.min(255, Math.round(((n >> 8) & 0xff) + 255 * amt));
  const b = Math.min(255, Math.round((n & 0xff) + 255 * amt));
  return `rgb(${r},${g},${b})`;
};
const darkenColor = (hex: string, amt: number): string => lightenColor(hex, -amt);

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
};

const drawCat = (ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, bounce: number, skin: CatSkin) => {
  ctx.save();
  ctx.translate(x, y);
  const flip = Math.cos(facing) < 0 ? -1 : 1;
  ctx.scale(flip, 1);
  const by = -Math.abs(Math.sin(bounce)) * 3;
  ctx.translate(0, by);
  // shadow
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(0, 22, 20, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // tail
  ctx.strokeStyle = skin.stroke;
  ctx.lineWidth = 2;
  ctx.fillStyle = skin.body;
  ctx.beginPath();
  ctx.moveTo(-18, 8);
  ctx.quadraticCurveTo(-30, 0, -22, -10);
  ctx.quadraticCurveTo(-18, -14, -14, -10);
  ctx.lineTo(-12, -4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // body
  ctx.beginPath();
  ctx.ellipse(0, 8, 18, 14, 0, 0, Math.PI * 2);
  ctx.fillStyle = skin.body;
  ctx.fill();
  ctx.stroke();
  // belly
  ctx.beginPath();
  ctx.ellipse(0, 12, 11, 8, 0, 0, Math.PI * 2);
  ctx.fillStyle = skin.belly;
  ctx.fill();
  // head
  ctx.beginPath();
  ctx.arc(8, -6, 14, 0, Math.PI * 2);
  ctx.fillStyle = skin.body;
  ctx.fill();
  ctx.stroke();
  // ears
  ctx.beginPath();
  ctx.moveTo(-2, -16);
  ctx.lineTo(-4, -26);
  ctx.lineTo(4, -18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(18, -16);
  ctx.lineTo(20, -26);
  ctx.lineTo(12, -18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // eyes
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(4, -7, 3, 0, Math.PI * 2);
  ctx.arc(14, -7, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(5, -6, 1.6, 0, Math.PI * 2);
  ctx.arc(15, -6, 1.6, 0, Math.PI * 2);
  ctx.fill();
  // nose
  ctx.fillStyle = "#fb7185";
  ctx.beginPath();
  ctx.moveTo(8, -3);
  ctx.lineTo(10, -1);
  ctx.lineTo(6, -1);
  ctx.closePath();
  ctx.fill();
  // whiskers
  ctx.strokeStyle = skin.whiskers;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(2, -2); ctx.lineTo(-6, -3);
  ctx.moveTo(2, -1); ctx.lineTo(-6, 0);
  ctx.moveTo(14, -2); ctx.lineTo(22, -3);
  ctx.moveTo(14, -1); ctx.lineTo(22, 0);
  ctx.stroke();
  ctx.restore();
};

const drawMouse = (ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, now: number, variant: "normal" | "decoy" | "boss", _accent?: string) => {
  ctx.save();
  ctx.translate(x, y);
  const flip = Math.cos(facing) < 0 ? -1 : 1;
  ctx.scale(flip, 1);
  const sz = variant === "boss" ? 1.6 : 1;
  ctx.scale(sz, sz);
  const bob = Math.sin(now / 90) * 1.5;
  ctx.translate(0, bob);
  // shadow
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = "#000";
  ctx.beginPath();
  ctx.ellipse(0, 14, 12, 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  const body = variant === "boss" ? "#9ca3af" : variant === "decoy" ? "#cbd5e1" : "#d1d5db";
  const stroke = variant === "boss" ? "#1e293b" : "#475569";
  // tail
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-12, 6);
  ctx.quadraticCurveTo(-22, 0, -18, -8);
  ctx.stroke();
  // body
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 6, 12, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // head
  ctx.beginPath();
  ctx.arc(10, -2, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // ears
  ctx.beginPath();
  ctx.arc(5, -10, 4, 0, Math.PI * 2);
  ctx.arc(13, -10, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#fda4af";
  ctx.beginPath();
  ctx.arc(5, -10, 2, 0, Math.PI * 2);
  ctx.arc(13, -10, 2, 0, Math.PI * 2);
  ctx.fill();
  // eyes
  ctx.fillStyle = "#0f172a";
  ctx.beginPath();
  ctx.arc(9, -2, 1.4, 0, Math.PI * 2);
  ctx.arc(13, -2, 1.4, 0, Math.PI * 2);
  ctx.fill();
  // nose
  ctx.fillStyle = "#fb7185";
  ctx.beginPath();
  ctx.arc(17, 0, 1.3, 0, Math.PI * 2);
  ctx.fill();
  if (variant === "boss") {
    ctx.fillStyle = "#fbbf24";
    ctx.beginPath();
    ctx.moveTo(2, -14);
    ctx.lineTo(6, -22);
    ctx.lineTo(10, -16);
    ctx.lineTo(14, -22);
    ctx.lineTo(18, -16);
    ctx.lineTo(20, -22);
    ctx.lineTo(22, -14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#92400e";
    ctx.stroke();
  }
  ctx.restore();
};

const spawnCatchParticles = (s: { particles: Particle[] }, x: number, y: number) => {
  for (let i = 0; i < 24; i++) {
    const a = (Math.PI * 2 * i) / 24 + Math.random() * 0.3;
    const sp = 80 + Math.random() * 200;
    s.particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0.8 + Math.random() * 0.4,
      maxLife: 1.2,
      color: ["#fde047", "#fb7185", "#a78bfa", "#34d399"][i % 4]!,
      size: 3 + Math.random() * 3,
    });
  }
};

const spawnPickupParticles = (s: { particles: Particle[] }, x: number, y: number) => {
  for (let i = 0; i < 12; i++) {
    const a = (Math.PI * 2 * i) / 12;
    s.particles.push({
      x, y,
      vx: Math.cos(a) * 120,
      vy: Math.sin(a) * 120,
      life: 0.5,
      maxLife: 0.5,
      color: "#fde047",
      size: 3,
    });
  }
};
