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
  });

  // initialize level
  useEffect(() => {
    const s = stateRef.current;
    // deep-copy obstacles so moving ones don't mutate the level def
    s.obstacles = level.obstacles.map((o) => ({ ...o, origin: o.origin ? { ...o.origin } : undefined }));
    s.cat = { x: 80, y: 80 };
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
  }, [level]);

  // keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " "].includes(k)) {
        e.preventDefault();
      }
      stateRef.current.keys.add(k);
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
      const scaleX = cw / W;
      const scaleY = ch / H;
      const scale = Math.min(scaleX, scaleY);
      const offX = (cw - W * scale) / 2;
      const offY = (ch - H * scale) / 2;

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
      let catSpeed = CAT_SPEED_BASE * speedMul;

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
          sfx.power();
        }
      }
      // Expire cheese after its duration
      if (s.cheeseBait && now - s.cheeseBait.placedAt >= s.cheeseBait.duration) {
        s.cheeseBait = null;
      }

      // mice update + catch check
      if (!isPaused && !s.catCaught) {
        const survivors: MouseState[] = [];
        for (const m of s.mice) {
          const d = updateMouseAI(
            m, s.cat, level, s.obstacles, W, H, dt, now,
            difficultyMulRef.current, s.frozenUntil, s.cheeseBait,
          );
          const moved = moveWithCollision(
            m.pos, MOUSE_RADIUS, d.x, d.y, s.obstacles, W, H,
            ["wall", "soft", "moving"],
          );
          m.pos = moved.pos;
          if (circleHits(s.cat, CAT_RADIUS, m.pos, MOUSE_RADIUS)) {
            // caught one!
            sfx.catch();
            sfx.squeak();
            spawnCatchParticles(s, m.pos.x, m.pos.y);
            // combo: chain catches within 2.5s
            if (now - s.lastCatchAt < 2500) s.combo += 1;
            else s.combo = 1;
            s.lastCatchAt = now;
            const comboBonus = s.combo > 1 ? s.combo * 25 : 0;
            const catchScore = 100 + Math.round(s.timeLeft * 5) + comboBonus;
            s.score += catchScore;
            // small time bonus per catch (not on the final mouse)
            const isFinal = survivors.length + (s.mice.length - s.mice.indexOf(m) - 1) === 0;
            if (!isFinal) {
              s.timeLeft = Math.min(level.time, s.timeLeft + 3);
              s.floatTexts.push({ x: m.pos.x, y: m.pos.y - 24, text: `+${catchScore}  +3s`, life: 1.2, color: "#fbbf24" });
            } else {
              s.floatTexts.push({ x: m.pos.x, y: m.pos.y - 24, text: `+${catchScore}`, life: 1.2, color: "#fbbf24" });
            }
            setShake(0.45);
            // mouse is removed (not pushed to survivors)
          } else {
            survivors.push(m);
          }
        }
        s.mice = survivors;
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
            sfx.power();
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

      // backdrop
      ctx.fillStyle = level.theme.bgGradient[1];
      ctx.fillRect(0, 0, cw, ch);

      // arena bg
      ctx.save();
      ctx.translate(offX, offY);
      ctx.scale(scale, scale);

      // arena floor
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, level.theme.bgGradient[0]);
      grad.addColorStop(1, level.theme.bgGradient[1]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // tile pattern
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

      // arena border
      ctx.strokeStyle = level.theme.accent;
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, W - 8, H - 8);

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
          ctx.fillStyle = o.color ?? "#8b5e3c";
          roundRect(ctx, o.x, o.y, o.w, o.h, o.kind === "soft" ? 18 : 8);
          ctx.fill();
          // top highlight
          ctx.globalAlpha = 0.25;
          ctx.fillStyle = "#fff";
          roundRect(ctx, o.x + 4, o.y + 4, o.w - 8, Math.min(8, o.h / 4), 4);
          ctx.fill();
          ctx.globalAlpha = 1;
          // shadow
          ctx.globalAlpha = 0.18;
          ctx.fillStyle = "#000";
          roundRect(ctx, o.x + 3, o.y + o.h - 4, o.w - 6, 4, 2);
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

      // mice
      for (const m of s.mice) {
        const variant = level.mouseAI === "boss" ? "boss" : "normal";
        drawMouse(ctx, m.pos.x, m.pos.y, m.facing, now, variant, level.theme.accent);
      }
      for (const d of s.decoys) drawMouse(ctx, d.pos.x, d.pos.y, d.facing, now, "decoy", level.theme.accent);

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

      // freeze overlay
      if (s.activePower?.kind === "freeze" && s.frozenUntil > now) {
        ctx.fillStyle = "rgba(186, 230, 253, 0.20)";
        ctx.fillRect(0, 0, W, H);
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
