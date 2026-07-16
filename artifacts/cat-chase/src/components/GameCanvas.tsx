import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type React from "react";
import type { CheeseBait, LevelDef, MouseKind, Obstacle, PowerUp, PowerUpKind, Vec2 } from "@/game/types";
import { ARENA } from "@/game/levels";
import { getSkin, type CatSkin } from "@/game/skins";
import { getShopItem } from "@/game/shop";
import {
  circleHits,
  findOpenPosition,
  moveWithCollision,
  rectsOverlap,
  spawnPowerUp,
  updateMovingObstacles,
} from "@/game/engine";
import { updateMouseAI, type MouseState } from "@/game/ai";
import { sfx } from "@/game/audio";
import { coinsForMouseCatch } from "@/game/economy";

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
  equippedHat?: string;
  equippedTrail?: string;
  equippedPaw?: string;
  controlMode?: "tap" | "joystick";
  tapTargetRef?: React.RefObject<{ x: number; y: number } | null>;
  cheesePlaceRef?: React.RefObject<{ x: number; y: number } | null>;
  onCatch: (timeRemaining: number, score: number, tookDamage: boolean) => void;
  onTimeUp: (score: number) => void;
  onTrap: () => void;
  onMouseCoins?: (amount: number) => void;
  /** Fired with every distinct "kind" (personality + golden/boss, if applicable) represented by a catch — feeds the Mouse Almanac. */
  onMouseCaughtKinds?: (kinds: MouseKind[]) => void;
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
  equippedHat = "none-hat",
  equippedTrail = "none-trail",
  equippedPaw = "none-paw",
  controlMode = "joystick",
  tapTargetRef,
  cheesePlaceRef,
  onCatch,
  onTimeUp,
  onTrap,
  onMouseCoins,
  onMouseCaughtKinds,
  onState,
}: GameCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const lastEmitRef = useRef(0);
  const tookDamageRef = useRef(false);
  const [shake, setShake] = useState(0);

  // Stabilize props via refs so the game loop effect doesn't restart each frame
  const pausedRef = useRef(paused);
  const joystickRef = useRef(joystick);
  const difficultyMulRef = useRef(difficultyMul);
  const catSkinRef = useRef(catSkin);
  const equippedHatRef = useRef(equippedHat);
  const equippedTrailRef = useRef(equippedTrail);
  const equippedPawRef = useRef(equippedPaw);
  const onCatchRef = useRef(onCatch);
  const onTimeUpRef = useRef(onTimeUp);
  const onTrapRef = useRef(onTrap);
  const onMouseCoinsRef = useRef(onMouseCoins);
  const onMouseCaughtKindsRef = useRef(onMouseCaughtKinds);
  const onStateRef = useRef(onState);
  useLayoutEffect(() => { pausedRef.current = paused; }, [paused]);
  useLayoutEffect(() => { joystickRef.current = joystick; }, [joystick]);
  useLayoutEffect(() => { difficultyMulRef.current = difficultyMul; }, [difficultyMul]);
  useLayoutEffect(() => { catSkinRef.current = catSkin; }, [catSkin]);
  useLayoutEffect(() => { equippedHatRef.current = equippedHat; }, [equippedHat]);
  useLayoutEffect(() => { equippedTrailRef.current = equippedTrail; }, [equippedTrail]);
  useLayoutEffect(() => { equippedPawRef.current = equippedPaw; }, [equippedPaw]);
  useLayoutEffect(() => { onCatchRef.current = onCatch; }, [onCatch]);
  useLayoutEffect(() => { onTimeUpRef.current = onTimeUp; }, [onTimeUp]);
  useLayoutEffect(() => { onTrapRef.current = onTrap; }, [onTrap]);
  useLayoutEffect(() => { onMouseCoinsRef.current = onMouseCoins; }, [onMouseCoins]);
  useLayoutEffect(() => { onMouseCaughtKindsRef.current = onMouseCaughtKinds; }, [onMouseCaughtKinds]);
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
    pawPrints: [] as Array<{ x: number; y: number; angle: number; life: number; maxLife: number }>,
    lastTrailAt: 0,
    lastPawAt: 0,
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
    camera: null as { x: number; y: number } | null,
  slowMoUntil: 0,
  lastSlowMoAt: 0,
  // Trickster Mouse: guards against multiple sets of fake clones existing at once
  trickCloneActiveUntil: 0,
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
    s.slowMoUntil = 0;
    s.lastSlowMoAt = 0;
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
      // mobile: draw gameplay objects ~12% larger so they read clearly when zoomed
      const objMul = isMobile ? 1.12 : 1;

      let scale: number;
      let offX: number;
      let offY: number;

      if (isMobile) {
        // ── Real mobile camera ───────────────────────────────────────────────
        // Zoom in and follow the cat (like Brawl Stars / Survivor.io), clamped
        // so the viewport never shows outside the arena. Collision + all game
        // logic stay in world coordinates (W×H) — only the camera transform
        // (offX/offY/scale) changes, so there are no invisible walls.
        const MOBILE_ZOOM = 1.45;
        const containScale = Math.min(cw / W, ch / H);
        scale = containScale * MOBILE_ZOOM;
        const viewW = cw / scale;
        const viewH = ch / scale;
        const camTargetX = viewW >= W ? W / 2 : Math.max(viewW / 2, Math.min(W - viewW / 2, s.cat.x));
        const camTargetY = viewH >= H ? H / 2 : Math.max(viewH / 2, Math.min(H - viewH / 2, s.cat.y));
        if (!s.camera) s.camera = { x: camTargetX, y: camTargetY };
        // frame-rate independent smoothing — camera glides toward the cat instead of snapping
        const followT = 1 - Math.pow(0.0025, dt);
        s.camera.x += (camTargetX - s.camera.x) * followT;
        s.camera.y += (camTargetY - s.camera.y) * followT;
        offX = cw / 2 - s.camera.x * scale;
        offY = ch / 2 - s.camera.y * scale;
      } else {
        // Desktop: unchanged — full arena, letterboxed & centered, no camera follow
        const scaleX = cw / W;
        const scaleY = ch / H;
        scale = Math.min(scaleX, scaleY);
        offX = (cw - W * scale) / 2;
        offY = (ch - H * scale) / 2;
        s.camera = null;
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
        // Track whether the cat has bumped into a hazard (soft/moving obstacle) this run,
        // used to award the "No Damage" bonus at level completion.
        if (!tookDamageRef.current) {
          for (const o of s.obstacles) {
            if (
              (o.kind === "soft" || o.kind === "moving") &&
              rectsOverlap(s.cat.x - CAT_RADIUS, s.cat.y - CAT_RADIUS, CAT_RADIUS * 2, CAT_RADIUS * 2, o.x, o.y, o.w, o.h)
            ) {
              tookDamageRef.current = true;
              break;
            }
          }
        }
        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
          s.catFacing = Math.atan2(dy, dx);
          s.catBounce += dt * 12;

          // ── Cosmetic trail particles ─────────────────────────────────────
          const trailItem = getShopItem(equippedTrailRef.current);
          if (trailItem && trailItem.id !== "none-trail" && now - s.lastTrailAt > 45) {
            s.lastTrailAt = now;
            const trailColor =
              trailItem.color === "rainbow"
                ? `hsl(${(now / 4) % 360}, 85%, 60%)`
                : trailItem.color ?? "#f97316";
            s.particles.push({
              x: s.cat.x,
              y: s.cat.y,
              vx: (Math.random() - 0.5) * 12,
              vy: (Math.random() - 0.5) * 12,
              life: 0.5,
              maxLife: 0.5,
              color: trailColor,
              size: 3 + Math.random() * 2,
            });
          }

          // ── Cosmetic paw prints ──────────────────────────────────────────
          const pawItem = getShopItem(equippedPawRef.current);
          if (pawItem && pawItem.id !== "none-paw" && now - s.lastPawAt > 260) {
            s.lastPawAt = now;
            s.pawPrints.push({
              x: s.cat.x,
              y: s.cat.y,
              angle: s.catFacing,
              life: 1.1,
              maxLife: 1.1,
            });
          }
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

          // ── Trickster Mouse: every 6-8s, if the cat is nearby, spawn 2 fake clones ──
          // Reuses the existing decoy system (s.decoys) so rendering/movement is shared.
          // The `trickCloneActiveUntil` guard keeps at most one set of fakes alive at
          // once, even if a level ever had more than one Trickster Mouse.
          if (m.mouseType === "trickster" && !m.isDecoy) {
            if (m.trickNextAt === undefined) m.trickNextAt = now + 6000 + Math.random() * 2000;
            if (now >= m.trickNextAt) {
              const catDist = Math.hypot(m.pos.x - s.cat.x, m.pos.y - s.cat.y);
              if (catDist < 260 && now > s.trickCloneActiveUntil) {
                const expireAt = now + 2000;
                s.trickCloneActiveUntil = expireAt;
                for (let i = 0; i < 2; i++) {
                  const a = Math.random() * Math.PI * 2;
                  s.decoys.push({
                    pos: { x: m.pos.x, y: m.pos.y },
                    vel: { x: 0, y: 0 },
                    facing: m.facing,
                    pauseUntil: 0,
                    dartUntil: 0,
                    dartDir: { x: Math.cos(a), y: Math.sin(a) },
                    isDecoy: true,
                    expiresAt: expireAt,
                  });
                }
                spawnTricksterSmoke(s, m.pos.x, m.pos.y);
                sfx.pounce();
              }
              m.trickNextAt = now + 6000 + Math.random() * 2000;
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
            if (s.combo >= 2) {
              s.floatTexts.push({ x: m.pos.x, y: m.pos.y - 80, text: `🔥 ${s.combo}x COMBO!`, life: 0.9, color: "#fb923c" });
            }
            const comboBonus = s.combo > 1 ? s.combo * 25 : 0;
            const catchScore = 100 + Math.round(s.timeLeft * 5) + comboBonus;
            s.score += catchScore;
            // ── Coin reward for this catch (per-mouse-type value, boss/king/ninja tiers) ──
            const mouseCoins = coinsForMouseCatch(level, !!m.isGolden);
            if (mouseCoins > 0) {
              onMouseCoinsRef.current?.(mouseCoins);
              s.floatTexts.push({ x: m.pos.x, y: m.pos.y - 60, text: `🪙+${mouseCoins}`, life: 1.1, color: "#fde047" });
            }
            // ── Mouse Almanac: report every kind this catch represents ──────
            const caughtKinds: MouseKind[] = [m.mouseType ?? "normal"];
            if (m.isGolden) caughtKinds.push("golden");
            if (level.mouseAI === "boss") caughtKinds.push("boss");
            onMouseCaughtKindsRef.current?.(caughtKinds);
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
        // ── Slow-Mo Final Catch ───────────────────────────────────────────────
        if (s.mice.length === 1 && now > s.lastSlowMoAt + 4500) {
          const lastM = s.mice[0]!;
          const finalDist = Math.hypot(s.cat.x - lastM.pos.x, s.cat.y - lastM.pos.y);
          if (finalDist < 70 && finalDist > CAT_RADIUS + MOUSE_RADIUS) {
            s.slowMoUntil = now + 380;
            s.lastSlowMoAt = now;
            s.floatTexts.push({ x: lastM.pos.x, y: lastM.pos.y - 50, text: "⏱ SLOW MO!", life: 0.65, color: "#e0f2fe" });
          }
        }
        if (s.mice.length === 0) {
          s.catCaught = true;
          setShake(0.6);
          onCatchRef.current(s.timeLeft, s.score + Math.round(s.timeLeft * 10), tookDamageRef.current);
        }
      }

      // decoys
      if (!isPaused && !s.catCaught) {
        const decoySurvivors: MouseState[] = [];
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

          // ── Trickster Mouse fake clones only: vanish on touch or after their lifespan ──
          // Permanent boss decoys (no `expiresAt`) are untouched — same behavior as before.
          if (d.expiresAt !== undefined) {
            const touched = circleHits(s.cat, CAT_RADIUS, d.pos, MOUSE_RADIUS);
            const expired = now >= d.expiresAt;
            if (touched || expired) {
              spawnTricksterSparkle(s, d.pos.x, d.pos.y);
              if (touched) sfx.squeak();
              continue; // vanish — never pushed to survivors
            }
          }
          decoySurvivors.push(d);
        }
        s.decoys = decoySurvivors;
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

      // cosmetic paw prints
      for (const pw of s.pawPrints) pw.life -= dt;
      s.pawPrints = s.pawPrints.filter((pw) => pw.life > 0);

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

      // ── Themed backdrop decorations (pure visual, zero game-logic) ──────────
      drawThemedBackdrop(ctx, level.name, W, H, now, isMobile);

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
          // ── Themed obstacle skin detail ────────────────────────────────────────
          drawObstacleDetail(ctx, o, level.name, now);
        }
        ctx.restore();
      }

      // power-ups
      for (const p of s.powerUps) {
        const pulse = 1 + Math.sin(now / 200) * 0.08;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.scale(pulse * objMul, pulse * objMul);
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
        ctx.scale(pulse * objMul, pulse * objMul);
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
        ctx.scale(objMul, objMul);
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

        // ── Zigzag Mouse: teal motion-echo rings ─────────────────────────────
        if (m.mouseType === "zigzag") {
          const spd = Math.hypot(m.vel.x, m.vel.y);
          if (spd > 20) {
            ctx.save();
            const nx = m.vel.x / spd;
            const ny = m.vel.y / spd;
            for (let i = 1; i <= 3; i++) {
              ctx.globalAlpha = 0.46 - i * 0.12;
              ctx.strokeStyle = "#2dd4bf";
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(m.pos.x - nx * i * 8, m.pos.y - ny * i * 8, MOUSE_RADIUS - i * 2, 0, Math.PI * 2);
              ctx.stroke();
            }
            ctx.restore();
          }
        }

        // ── Stubborn Mouse: calm grey aura / panic red glow ──────────────────
        if (m.mouseType === "stubborn") {
          const sDist = Math.hypot(m.pos.x - s.cat.x, m.pos.y - s.cat.y);
          ctx.save();
          if (sDist < 130) {
            const pulse = 0.5 + 0.5 * Math.sin(now / 75);
            const gr = ctx.createRadialGradient(m.pos.x, m.pos.y, 4, m.pos.x, m.pos.y, 34);
            gr.addColorStop(0, `rgba(239,68,68,${(0.55 * pulse).toFixed(2)})`);
            gr.addColorStop(1, "rgba(239,68,68,0)");
            ctx.fillStyle = gr;
            ctx.beginPath();
            ctx.arc(m.pos.x, m.pos.y, 34, 0, Math.PI * 2);
          } else {
            ctx.globalAlpha = 0.18;
            ctx.fillStyle = "#94a3b8";
            ctx.beginPath();
            ctx.arc(m.pos.x, m.pos.y, MOUSE_RADIUS + 7, 0, Math.PI * 2);
          }
          ctx.fill();
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

        // ── Greedy Mouse: happy bounce + eating animation while at the cheese ──
        const isEating = m.mouseType === "greedy" && now < (m.eatingCheeseUntil ?? 0);
        const eatingBounce = isEating ? Math.abs(Math.sin(now / 90)) * 3 : 0;

        const variant = level.mouseAI === "boss" ? "boss" : "normal";
        drawMouse(ctx, m.pos.x, m.pos.y - eatingBounce, m.facing, now, variant, level.theme.accent, objMul);

        if (isEating) {
          ctx.save();
          ctx.font = "13px serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.globalAlpha = 0.9;
          ctx.fillText("😋", m.pos.x, m.pos.y - MOUSE_RADIUS - 6 - eatingBounce);
          ctx.restore();
        }

        // ── Greedy Mouse: cheese icon while actively sniffing out the bait ─────
        if (m.mouseType === "greedy" && !isEating && s.cheeseBait) {
          ctx.save();
          ctx.font = "14px serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          const bob = Math.sin(now / 220) * 2;
          ctx.globalAlpha = 0.92;
          ctx.fillText("🧀", m.pos.x, m.pos.y - MOUSE_RADIUS - 5 + bob);
          ctx.restore();
        }

        // ── Personality badge above mouse ─────────────────────────────────────
        const typeBadge = m.mouseType === "dash" ? "⚡"
          : m.mouseType === "teleport" ? "🔮"
          : m.mouseType === "zigzag" ? "〜"
          : m.mouseType === "stubborn" ? "😤"
          : m.mouseType === "trickster" ? "🎭"
          : null;
        if (typeBadge && !isEating && !(m.mouseType === "greedy" && s.cheeseBait)) {
          ctx.save();
          ctx.font = "13px serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.globalAlpha = 0.88;
          ctx.fillText(typeBadge, m.pos.x, m.pos.y - MOUSE_RADIUS - 5);
          ctx.restore();
        }

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
      for (const d of s.decoys) {
        // Trickster fake clones (expiresAt set) look identical to a real mouse;
        // permanent boss decoys keep their original, slightly duller "decoy" look.
        const decoyVariant = d.expiresAt !== undefined
          ? (level.mouseAI === "boss" ? "boss" : "normal")
          : "decoy";
        drawMouse(ctx, d.pos.x, d.pos.y, d.facing, now, decoyVariant, level.theme.accent, objMul);
      }

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

      // cosmetic paw prints (drawn under the cat, above the floor)
      {
        const pawItem = getShopItem(equippedPawRef.current);
        if (pawItem && pawItem.id !== "none-paw") {
          for (const pw of s.pawPrints) {
            const t = Math.max(0, pw.life / pw.maxLife);
            ctx.save();
            ctx.globalAlpha = t * 0.75;
            ctx.translate(pw.x, pw.y);
            ctx.rotate(pw.angle);
            if (pawItem.color) {
              ctx.fillStyle = pawItem.color;
              ctx.beginPath();
              ctx.arc(0, 0, 10, 0, Math.PI * 2);
              ctx.fill();
              ctx.globalAlpha = t;
            }
            ctx.font = "14px serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.rotate(-pw.angle);
            ctx.fillText(pawItem.emoji, 0, 0);
            ctx.restore();
          }
        }
      }
      ctx.globalAlpha = 1;

      // cat
      drawCat(ctx, s.cat.x, s.cat.y, s.catFacing, s.catBounce, getSkin(catSkinRef.current), objMul);

      // cosmetic hat, worn above the cat's head
      {
        const hatItem = getShopItem(equippedHatRef.current);
        if (hatItem && hatItem.id !== "none-hat") {
          ctx.save();
          ctx.font = `${Math.round(26 * objMul)}px serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          const bob = -Math.abs(Math.sin(s.catBounce)) * 3;
          ctx.fillText(hatItem.emoji, s.cat.x, s.cat.y - 30 * objMul + bob);
          ctx.restore();
        }
      }

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
          const cm = controlModeRef.current;
          const line1 = isMobile
            ? (cm === "joystick"
                ? "🕹️  Drag joystick to move  •  Double-tap for 🧀🧀"
                : "👉  Hold & drag anywhere to move  •  Hold still 0.5s for 🧀🧀")
            : "⌨️  WASD / Arrows to move ⬆️⬇️⬅️➡️ •  Double-Space for 🟥 ➡️ 🧀";
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
      const rawDt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const _ls = stateRef.current;
        const dtMul = _ls.slowMoUntil > 0 && now < _ls.slowMoUntil ? 0.22 : 1;
        if (ctx) draw(ctx, rawDt * dtMul, now);
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

const drawCat = (ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, bounce: number, skin: CatSkin, sizeMul = 1) => {
  ctx.save();
  ctx.translate(x, y);
  const flip = Math.cos(facing) < 0 ? -1 : 1;
  ctx.scale(flip * sizeMul, sizeMul);
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

const drawMouse = (ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, now: number, variant: "normal" | "decoy" | "boss", _accent?: string, sizeMul = 1) => {
  ctx.save();
  ctx.translate(x, y);
  const flip = Math.cos(facing) < 0 ? -1 : 1;
  ctx.scale(flip * sizeMul, sizeMul);
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

// ─────────────────────────────────────────────────────────────────────────────
// drawThemedBackdrop — purely decorative layer drawn after floor tiles.
// Uses only `ctx`, level name, dimensions, and `now` — no game state mutation.
// ─────────────────────────────────────────────────────────────────────────────
function drawThemedBackdrop(
  ctx: CanvasRenderingContext2D,
  levelName: string,
  W: number,
  H: number,
  now: number,
  isMobile: boolean,
) {
  ctx.save();
  const n = levelName;

  if (n === "Cozy Kitchen") {
    // Wood-grain floor lines
    ctx.globalAlpha = 0.09; ctx.strokeStyle = "#92400e"; ctx.lineWidth = 1.5;
    for (let i = 0; i < 7; i++) {
      const y = H * 0.55 + i * 22;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y + Math.sin(i * 1.4) * 5); ctx.stroke();
    }
    // Stove burner rings bottom-left
    ctx.globalAlpha = 0.13; ctx.strokeStyle = "#7c3f00"; ctx.lineWidth = 3;
    for (let r = 0; r < 2; r++) { ctx.beginPath(); ctx.arc(75, H - 75, 20 + r * 10, 0, Math.PI * 2); ctx.stroke(); }
    // Steam wisps
    ctx.globalAlpha = 0.07; ctx.strokeStyle = "#fffbeb"; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const xb = 180 + i * 240, ph = now / 1100 + i * 1.5;
      ctx.beginPath(); ctx.moveTo(xb, 20);
      for (let t = 0; t < 55; t += 6) ctx.lineTo(xb + Math.sin(ph + t * 0.16) * 11, 20 + t);
      ctx.stroke();
    }
  }

  else if (n === "Living Room") {
    // Vertical wallpaper stripes
    ctx.globalAlpha = 0.06; ctx.fillStyle = "#db2777";
    for (let x = 0; x < W; x += 60) ctx.fillRect(x, 0, 18, H);
    // Carpet diamonds
    ctx.globalAlpha = 0.07; ctx.strokeStyle = "#9d174d"; ctx.lineWidth = 1.5;
    const cx = W / 2, cy = H / 2;
    for (let s = 40; s < 200; s += 50) {
      ctx.beginPath(); ctx.moveTo(cx, cy - s); ctx.lineTo(cx + s * 0.65, cy);
      ctx.lineTo(cx, cy + s); ctx.lineTo(cx - s * 0.65, cy); ctx.closePath(); ctx.stroke();
    }
    // Window light shaft top-right
    ctx.globalAlpha = 0.05;
    const sg = ctx.createLinearGradient(W - 80, 0, W / 2, H / 2);
    sg.addColorStop(0, "#fef3c7"); sg.addColorStop(1, "transparent");
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.moveTo(W - 160, 0); ctx.lineTo(W, 0); ctx.lineTo(W / 2 + 80, H * 0.55); ctx.closePath(); ctx.fill();
  }

  else if (n === "Garden Patio") {
    // Grass tufts at bottom edge
    ctx.globalAlpha = 0.18; ctx.strokeStyle = "#16a34a"; ctx.lineWidth = 2;
    for (let x = 16; x < W - 16; x += 26) {
      const h2 = 9 + Math.sin(x * 0.28 + now / 2000) * 4;
      ctx.beginPath(); ctx.moveTo(x, H - 14); ctx.lineTo(x - 5, H - 14 - h2);
      ctx.moveTo(x, H - 14); ctx.lineTo(x + 5, H - 14 - h2 * 0.8); ctx.stroke();
    }
    // Scattered flowers
    ctx.globalAlpha = 0.14;
    const flowerC = ["#fde047", "#fb7185", "#c084fc"];
    for (let i = 0; i < (isMobile ? 5 : 9); i++) {
      const fx = 70 + (i * 139.7) % (W - 140), fy = 70 + (i * 97.3) % (H - 200);
      for (let p = 0; p < 5; p++) {
        const a = (Math.PI * 2 / 5) * p;
        ctx.fillStyle = flowerC[i % 3]!;
        ctx.beginPath(); ctx.arc(fx + Math.cos(a) * 8, fy + Math.sin(a) * 8, 4, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "#fef08a"; ctx.beginPath(); ctx.arc(fx, fy, 4, 0, Math.PI * 2); ctx.fill();
    }
    // Stone path
    ctx.globalAlpha = 0.09; ctx.fillStyle = "#a3a3a3";
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(W / 2 + (i - 2) * 75, H / 2 + 60, 22, 13, 0, 0, Math.PI * 2); ctx.fill(); }
  }

  else if (n === "The Library") {
    // Shelf lines + colourful book spines
    ctx.globalAlpha = 0.11; ctx.strokeStyle = "#7c2d12"; ctx.lineWidth = 2;
    for (let y = 80; y < H - 30; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(55, y); ctx.moveTo(W - 55, y); ctx.lineTo(W, y); ctx.stroke();
    }
    const bkC = ["#dc2626","#2563eb","#16a34a","#d97706","#7c3aed","#0891b2"];
    ctx.globalAlpha = 0.18;
    for (let y = 90; y < H - 60; y += 60) {
      let x = 3;
      for (let b = 0; b < 4 && x < 56; b++) {
        const bw = 9 + (b * 7) % 9;
        ctx.fillStyle = bkC[(b + Math.floor(y / 60)) % bkC.length]!;
        ctx.fillRect(x, y - 42, bw, 40); x += bw + 2;
      }
      x = W - 3;
      for (let b = 0; b < 4; b++) {
        const bw = 9 + (b * 5) % 9; x -= bw + 2;
        ctx.fillStyle = bkC[(b + 2 + Math.floor(y / 60)) % bkC.length]!;
        ctx.fillRect(x, y - 42, bw, 40);
      }
    }
    // Warm reading lamp glow bottom-right
    ctx.globalAlpha = 0.08;
    const lg = ctx.createRadialGradient(W - 50, H - 50, 5, W - 50, H - 50, 110);
    lg.addColorStop(0, "#fef08a"); lg.addColorStop(1, "transparent");
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(W - 50, H - 50, 110, 0, Math.PI * 2); ctx.fill();
  }

  else if (n === "Spooky Attic") {
    // Cobwebs in top corners
    ctx.globalAlpha = 0.14; ctx.strokeStyle = "#d1d5db"; ctx.lineWidth = 1;
    const drawWeb = (ox: number, oy: number, flip: boolean) => {
      for (let d = 0; d < 6; d++) {
        const a = (flip ? Math.PI * 0.5 : 0) + (Math.PI / 2 / 5) * d;
        ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + Math.cos(a) * 75, oy + Math.sin(a) * 75); ctx.stroke();
      }
      for (let r = 18; r <= 72; r += 18) {
        ctx.beginPath();
        for (let d = 0; d <= 5; d++) {
          const a = (flip ? Math.PI * 0.5 : 0) + (Math.PI / 2 / 5) * d;
          d === 0 ? ctx.moveTo(ox + Math.cos(a) * r, oy + Math.sin(a) * r) : ctx.lineTo(ox + Math.cos(a) * r, oy + Math.sin(a) * r);
        }
        ctx.stroke();
      }
    };
    drawWeb(0, 0, false); drawWeb(W, 0, true);
    // Dusty beam diagonal
    ctx.globalAlpha = 0.05;
    const bg2 = ctx.createLinearGradient(0, 0, 200, H);
    bg2.addColorStop(0, "#fef3c7"); bg2.addColorStop(1, "transparent");
    ctx.fillStyle = bg2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(110, 0); ctx.lineTo(270, H); ctx.lineTo(160, H); ctx.closePath(); ctx.fill();
    // Creaky floor lines
    ctx.globalAlpha = 0.08; ctx.strokeStyle = "#78350f"; ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(0, H * 0.58 + i * 25); ctx.lineTo(W, H * 0.58 + i * 25 + Math.sin(i * 2.1) * 7); ctx.stroke(); }
  }

  else if (n === "Cheese Factory") {
    // Dashed conveyor belts
    ctx.globalAlpha = 0.11; ctx.setLineDash([18, 14]); ctx.strokeStyle = "#92400e"; ctx.lineWidth = 3;
    for (const y of [H * 0.33, H * 0.66]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    ctx.setLineDash([]);
    // Pipes on left edge
    ctx.globalAlpha = 0.13; ctx.fillStyle = "#713f12"; ctx.strokeStyle = "#92400e"; ctx.lineWidth = 2;
    for (let y = 60; y < H - 50; y += 80) {
      ctx.fillRect(0, y, 16, 38); ctx.strokeRect(0, y, 16, 38);
      ctx.beginPath(); ctx.arc(8, y, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    }
    // Cheese hole doodles on floor
    ctx.globalAlpha = 0.09; ctx.fillStyle = "#ca8a04";
    for (let i = 0; i < 7; i++) {
      ctx.beginPath(); ctx.ellipse(90 + (i * 157) % (W - 180), 80 + (i * 97) % (H - 160), 11, 7, (i * 0.5) % Math.PI, 0, Math.PI * 2); ctx.fill();
    }
  }

  else if (n === "Neon Alley") {
    // Neon tubes along top & bottom
    const nc = ["#22d3ee","#f472b6","#a78bfa"];
    for (let i = 0; i < 3; i++) {
      ctx.globalAlpha = 0.18; ctx.shadowColor = nc[i]!; ctx.shadowBlur = 10;
      ctx.strokeStyle = nc[i]!; ctx.lineWidth = 3;
      const sx = i * (W / 3) + 16;
      ctx.beginPath(); ctx.moveTo(sx, 10); ctx.lineTo(sx + W / 3 - 32, 10); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(sx, H - 10); ctx.lineTo(sx + W / 3 - 32, H - 10); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    // Window silhouettes on edges
    ctx.globalAlpha = 0.10; ctx.strokeStyle = "#22d3ee"; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.strokeRect(5, 55 + i * 85, 28, 48); ctx.strokeRect(9, 60 + i * 85, 8, 11); ctx.strokeRect(19, 60 + i * 85, 8, 11);
      ctx.strokeRect(W - 33, 70 + i * 85, 28, 48); ctx.strokeRect(W - 29, 75 + i * 85, 8, 11); ctx.strokeRect(W - 19, 75 + i * 85, 8, 11);
    }
  }

  else if (n === "Snowy Cabin") {
    // Frost crystals in corners
    ctx.globalAlpha = 0.14; ctx.strokeStyle = "#bae6fd"; ctx.lineWidth = 1.5;
    const drawFrost = (fx: number, fy: number) => {
      for (let a = 0; a < 6; a++) {
        const ang = (Math.PI / 3) * a;
        ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + Math.cos(ang) * 38, fy + Math.sin(ang) * 38); ctx.stroke();
        for (let b = 1; b <= 2; b++) {
          const bx2 = fx + Math.cos(ang) * b * 15, by2 = fy + Math.sin(ang) * b * 15;
          for (const da of [-0.55, 0.55]) {
            ctx.beginPath(); ctx.moveTo(bx2, by2); ctx.lineTo(bx2 + Math.cos(ang + da) * 9, by2 + Math.sin(ang + da) * 9); ctx.stroke();
          }
        }
      }
    };
    drawFrost(28, 28); drawFrost(W - 28, 28); drawFrost(28, H - 28); drawFrost(W - 28, H - 28);
    // Fireplace warm glow
    ctx.globalAlpha = 0.09;
    const fg = ctx.createRadialGradient(65, H - 65, 5, 65, H - 65, 95);
    fg.addColorStop(0, "#fb923c"); fg.addColorStop(1, "transparent");
    ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(65, H - 65, 95, 0, Math.PI * 2); ctx.fill();
    // Snowdrift along bottom
    ctx.globalAlpha = 0.14; ctx.fillStyle = "#e0f2fe";
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 36) ctx.quadraticCurveTo(x + 18, H - 14 - Math.sin(x * 0.09) * 7, x + 36, H);
    ctx.closePath(); ctx.fill();
  }

  else if (n === "Pirate Ship") {
    // Wood plank horizontals
    ctx.globalAlpha = 0.11; ctx.strokeStyle = "#78350f"; ctx.lineWidth = 1.5;
    for (let y = 36; y < H; y += 34) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // Portholes
    ctx.globalAlpha = 0.16; ctx.strokeStyle = "#b45309"; ctx.lineWidth = 3;
    for (let y = 100; y < H - 70; y += 155) {
      ctx.beginPath(); ctx.arc(28, y, 21, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(28, y, 14, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(W - 28, y, 21, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(W - 28, y, 14, 0, Math.PI * 2); ctx.stroke();
    }
    // Rigging ropes
    ctx.globalAlpha = 0.10; ctx.strokeStyle = "#d97706"; ctx.lineWidth = 2; ctx.setLineDash([5, 5]);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W * 0.42, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W, 0); ctx.lineTo(W * 0.58, H); ctx.stroke();
    ctx.setLineDash([]);
  }

  else if (n === "Candy Land") {
    // Polka dots
    ctx.globalAlpha = 0.10;
    const cc = ["#fb7185","#fde047","#a78bfa","#34d399","#38bdf8"];
    for (let i = 0; i < (isMobile ? 10 : 18); i++) {
      ctx.fillStyle = cc[i % cc.length]!;
      ctx.beginPath(); ctx.arc(36 + (i * 139.7) % (W - 72), 36 + (i * 97.3) % (H - 72), 7 + (i % 3) * 4, 0, Math.PI * 2); ctx.fill();
    }
    // Candy stripe border
    ctx.globalAlpha = 0.12; ctx.strokeStyle = "#be185d"; ctx.lineWidth = 7; ctx.setLineDash([18, 18]);
    ctx.strokeRect(6, 6, W - 12, H - 12); ctx.setLineDash([]);
  }

  else if (n === "Toy Workshop") {
    // Train track at bottom
    ctx.globalAlpha = 0.13; ctx.strokeStyle = "#1d4ed8"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, H - 52); ctx.lineTo(W, H - 52); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, H - 30); ctx.lineTo(W, H - 30); ctx.stroke();
    ctx.lineWidth = 4;
    for (let x = 0; x < W; x += 28) { ctx.beginPath(); ctx.moveTo(x, H - 54); ctx.lineTo(x, H - 28); ctx.stroke(); }
    // Star sparkles
    ctx.globalAlpha = 0.14; ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2;
    for (let i = 0; i < (isMobile ? 5 : 9); i++) {
      const sx = 55 + (i * 157) % (W - 110), sy = 55 + (i * 97) % (H - 180);
      for (let a = 0; a < 4; a++) {
        const ang = (Math.PI / 4) * a;
        ctx.beginPath(); ctx.moveTo(sx - Math.cos(ang) * 11, sy - Math.sin(ang) * 11); ctx.lineTo(sx + Math.cos(ang) * 11, sy + Math.sin(ang) * 11); ctx.stroke();
      }
    }
  }

  else if (n === "Cosmic Lab") {
    // Planet with ring
    ctx.globalAlpha = 0.10; ctx.strokeStyle = "#a78bfa"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(W * 0.14, H * 0.18, 34, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(W * 0.14, H * 0.18, 60, 17, -0.35, 0, Math.PI * 2); ctx.stroke();
    // Orbit rings
    ctx.globalAlpha = 0.07; ctx.lineWidth = 1;
    for (let i = 1; i <= 2; i++) { ctx.beginPath(); ctx.ellipse(W / 2, H / 2, W * 0.36 * i, H * 0.3 * i, 0.2, 0, Math.PI * 2); ctx.stroke(); }
    // Stars
    ctx.globalAlpha = 0.20; ctx.fillStyle = "#e9d5ff";
    for (let i = 0; i < (isMobile ? 18 : 32); i++) {
      const sz = 0.8 + (i % 3) * 0.5, tw = 0.5 + Math.sin(now / 550 + i * 1.4) * 0.5;
      ctx.globalAlpha = 0.07 + tw * 0.11;
      ctx.beginPath(); ctx.arc((i * 137.5) % W, (i * 91.3) % H, sz, 0, Math.PI * 2); ctx.fill();
    }
  }

  else if (n === "Jungle Ruins") {
    // Hanging vines from top
    ctx.globalAlpha = 0.14; ctx.strokeStyle = "#16a34a"; ctx.lineWidth = 2;
    for (let i = 0; i < (isMobile ? 4 : 7); i++) {
      const vx = 75 + (i * 157) % (W - 150), vl = 55 + (i * 37) % 95;
      ctx.beginPath(); ctx.moveTo(vx, 0);
      for (let t = 0; t < vl; t += 10) ctx.lineTo(vx + Math.sin(t * 0.3 + i) * 13, t);
      ctx.stroke();
      ctx.fillStyle = "#22c55e"; ctx.globalAlpha = 0.16;
      ctx.beginPath(); ctx.ellipse(vx + Math.sin(vl * 0.3 + i) * 13, vl, 6, 11, Math.PI * 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.14;
    }
    // Stone brick edges
    ctx.globalAlpha = 0.09; ctx.strokeStyle = "#a16207"; ctx.lineWidth = 1.5;
    for (let y = 0; y < H; y += 28) {
      const off = ((y / 28) % 2) * 28;
      for (let x = off - 28; x < 58; x += 56) ctx.strokeRect(x, y, 56, 26);
      for (let x = W - 58 + off; x < W + 28; x += 56) ctx.strokeRect(x, y, 56, 26);
    }
  }

  else if (n === "Sky Castle") {
    // Cloud puffs
    ctx.globalAlpha = 0.16; ctx.fillStyle = "#fff";
    const drawCloud = (cx2: number, cy2: number) => {
      for (const [dx, dy, r] of [[-18,0,16],[0,-5,20],[18,0,16],[-8,8,13],[10,8,13]] as [number,number,number][]) {
        ctx.beginPath(); ctx.arc(cx2+dx, cy2+dy, r, 0, Math.PI*2); ctx.fill();
      }
    };
    drawCloud(55,75); drawCloud(W-55,75); drawCloud(55,H-75); drawCloud(W-55,H-75);
    // Battlements at top
    ctx.globalAlpha = 0.08; ctx.fillStyle = "#e0f2fe";
    for (let x = 0; x < W; x += 36) ctx.fillRect(x, 0, 22, 20);
  }

  else if (n === "Lava Cavern") {
    // Crack lines on floor
    ctx.globalAlpha = 0.14; ctx.strokeStyle = "#fcd34d"; ctx.lineWidth = 1.5;
    for (let i = 0; i < (isMobile ? 3 : 5); i++) {
      const cx2 = 100 + (i * 157) % (W - 200), cy2 = 100 + (i * 91) % (H - 200);
      ctx.beginPath(); ctx.moveTo(cx2, cy2);
      let px = cx2, py = cy2;
      for (let s = 0; s < 5; s++) { px += (i % 2 === 0 ? 1 : -1) * (14 + s * 6); py += 11 + s * 4; ctx.lineTo(px, py); }
      ctx.stroke();
    }
    // Lava glow on side edges
    ctx.globalAlpha = 0.09;
    const ll = ctx.createLinearGradient(0,0,55,0); ll.addColorStop(0,"#fb923c"); ll.addColorStop(1,"transparent");
    ctx.fillStyle = ll; ctx.fillRect(0,0,55,H);
    const lr = ctx.createLinearGradient(W,0,W-55,0); lr.addColorStop(0,"#fb923c"); lr.addColorStop(1,"transparent");
    ctx.fillStyle = lr; ctx.fillRect(W-55,0,55,H);
  }

  else if (n === "Underwater Reef") {
    // Swaying seaweed
    ctx.globalAlpha = 0.16; ctx.strokeStyle = "#16a34a"; ctx.lineWidth = 3;
    for (let i = 0; i < (isMobile ? 6 : 10); i++) {
      const wx = 38 + (i * 139) % (W - 76), wh = 58 + (i * 37) % 78;
      ctx.beginPath(); ctx.moveTo(wx, H);
      for (let t = 0; t < wh; t += 11) ctx.lineTo(wx + Math.sin(now / 750 + i + t * 0.1) * 15, H - t);
      ctx.stroke();
    }
    // Coral at corners
    ctx.globalAlpha = 0.14; ctx.strokeStyle = "#fb923c"; ctx.lineWidth = 2;
    const drawCoral = (cx2: number, cy2: number) => {
      for (let b = 0; b < 5; b++) {
        const ang = -Math.PI/2 + (b-2)*0.38;
        ctx.beginPath(); ctx.moveTo(cx2,cy2); ctx.lineTo(cx2+Math.cos(ang)*(24+b*5), cy2+Math.sin(ang)*(24+b*5)); ctx.stroke();
      }
    };
    drawCoral(38,H-38); drawCoral(W-38,H-38); drawCoral(38,75); drawCoral(W-38,75);
    // Bubbles rising
    ctx.globalAlpha = 0.12; ctx.strokeStyle = "#67e8f9"; ctx.lineWidth = 1.5;
    for (let i = 0; i < (isMobile ? 5 : 9); i++) {
      const by = H - ((now / (24+i*7) + i*78) % H), br = 3+(i%3)*3;
      ctx.beginPath(); ctx.arc(38+(i*139)%(W-76), by, br, 0, Math.PI*2); ctx.stroke();
    }
  }

  else if (n === "Haunted Manor") {
    // Arched windows on edges
    ctx.globalAlpha = 0.12; ctx.strokeStyle = "#a78bfa"; ctx.lineWidth = 2;
    for (let y = 80; y < H - 70; y += 190) {
      ctx.beginPath(); ctx.rect(5,y,27,58); ctx.arc(18,y,13,Math.PI,0); ctx.stroke();
      ctx.beginPath(); ctx.rect(W-32,y,27,58); ctx.arc(W-18,y,13,Math.PI,0); ctx.stroke();
    }
    // Cobwebs in top corners
    ctx.globalAlpha = 0.13; ctx.strokeStyle = "#c4b5fd"; ctx.lineWidth = 1;
    for (let r2 = 14; r2 <= 60; r2 += 14) {
      ctx.beginPath(); ctx.arc(0,0,r2,0,Math.PI/2); ctx.stroke();
      ctx.beginPath(); ctx.arc(W,0,r2,Math.PI/2,Math.PI); ctx.stroke();
    }
    for (let d = 0; d < 5; d++) {
      const a = (Math.PI/2/4)*d;
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*60, Math.sin(a)*60); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W,0); ctx.lineTo(W-Math.sin(a)*60, Math.cos(a)*60); ctx.stroke();
    }
  }

  else if (n === "Robot Factory") {
    // Circuit traces
    ctx.globalAlpha = 0.10; ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2;
    for (const t of [[0,100,80,100,80,200],[0,330,60,330,60,440],[W,140,W-80,140,W-80,260],[W,380,W-70,380,W-70,490]] as number[][]) {
      ctx.beginPath();
      for (let i=0;i<t.length;i+=2) i===0?ctx.moveTo(t[i]!,t[i+1]!):ctx.lineTo(t[i]!,t[i+1]!);
      ctx.stroke();
      ctx.globalAlpha=0.17; ctx.fillStyle="#fbbf24"; ctx.beginPath(); ctx.arc(t[t.length-2]!,t[t.length-1]!,5,0,Math.PI*2); ctx.fill();
      ctx.globalAlpha=0.10;
    }
    // Rivet grid
    ctx.globalAlpha = 0.11; ctx.fillStyle = "#94a3b8";
    for (let x=20;x<W;x+=78) for (let y=20;y<H;y+=78) { ctx.beginPath(); ctx.arc(x,y,4,0,Math.PI*2); ctx.fill(); }
  }

  else if (n === "Boss Lair" || n === "Mouse Apocalypse") {
    // Claw marks
    ctx.globalAlpha = 0.12; ctx.strokeStyle = "#fbbf24"; ctx.lineWidth = 2;
    for (let i = 0; i < (isMobile ? 3 : 5); i++) {
      const clx = 75+(i*157)%(W-150), cly = 75+(i*91)%(H-150);
      for (let c=0;c<3;c++) { ctx.beginPath(); ctx.moveTo(clx+c*13,cly-28); ctx.lineTo(clx+c*13+8,cly+18); ctx.stroke(); }
    }
    // Pulsing rune rings at center
    ctx.globalAlpha = 0.07; ctx.strokeStyle = "#fcd34d"; ctx.lineWidth = 1.5;
    for (let i=1;i<=3;i++) { ctx.beginPath(); ctx.arc(W/2,H/2,i*72,0,Math.PI*2); ctx.stroke(); }
    ctx.globalAlpha = 0.05 * Math.abs(Math.sin(now/800));
    const rg = ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,210);
    rg.addColorStop(0,"#fcd34d"); rg.addColorStop(1,"transparent");
    ctx.fillStyle = rg; ctx.fillRect(0,0,W,H);
  }

  else if (n === "Mouse Kingdom") {
    // Royal banners at top corners
    ctx.globalAlpha = 0.14; ctx.fillStyle = "#fcd34d";
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(38,0); ctx.lineTo(38,78); ctx.lineTo(19,58); ctx.lineTo(0,78); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W,0); ctx.lineTo(W-38,0); ctx.lineTo(W-38,78); ctx.lineTo(W-19,58); ctx.lineTo(W,78); ctx.closePath(); ctx.fill();
    // Crown at top center
    ctx.globalAlpha = 0.09; ctx.strokeStyle = "#fcd34d"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(W/2-42,32); ctx.lineTo(W/2-30,10); ctx.lineTo(W/2,26); ctx.lineTo(W/2+30,10); ctx.lineTo(W/2+42,32); ctx.lineTo(W/2-42,32); ctx.stroke();
    // Seal rings
    ctx.globalAlpha = 0.07; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(W/2,H/2,105,0,Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.arc(W/2,H/2,82,0,Math.PI*2); ctx.stroke();
  }

  else if (n === "Launch Bay" || n === "Zero-G Lab") {
    // Twinkling stars
    for (let i = 0; i < (isMobile ? 22 : 42); i++) {
      const tw = 0.5+Math.sin(now/580+i*1.35)*0.5;
      ctx.globalAlpha = 0.06+tw*0.11;
      ctx.fillStyle = "#e0e7ff";
      ctx.beginPath(); ctx.arc((i*137.5)%W,(i*91.3)%H,0.8+(i%3)*0.55,0,Math.PI*2); ctx.fill();
    }
    // Crescent moon top-right
    ctx.globalAlpha = 0.08; ctx.fillStyle = "#c7d2fe";
    ctx.beginPath(); ctx.arc(W-48,48,34,0,Math.PI*2); ctx.fill();
    ctx.globalAlpha = 0.12; ctx.fillStyle = "#1e1b4b";
    ctx.beginPath(); ctx.arc(W-38,42,28,0,Math.PI*2); ctx.fill();
    if (n === "Launch Bay") {
      // Launch pad grid at bottom
      ctx.globalAlpha = 0.10; ctx.strokeStyle = "#818cf8"; ctx.lineWidth = 1.5;
      for (let x=0;x<W;x+=55) { ctx.beginPath(); ctx.moveTo(x,H-55); ctx.lineTo(x,H); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(0,H-55); ctx.lineTo(W,H-55); ctx.stroke();
    }
  }

  else if (n === "Reactor Core") {
    // Expanding rings from center
    const rph = (now/1800)%1;
    for (let i=0;i<3;i++) {
      const ph = (rph+i/3)%1;
      ctx.globalAlpha = (1-ph)*0.09;
      ctx.strokeStyle = "#22d3ee"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(W/2,H/2,ph*Math.min(W,H)*0.46,0,Math.PI*2); ctx.stroke();
    }
    // Warning stripe edges
    ctx.globalAlpha = 0.07; ctx.fillStyle = "#fcd34d";
    for (let y=0;y<H;y+=36) { ctx.fillRect(0,y,12,20); ctx.fillRect(W-12,y+20,12,20); }
  }

  else if (n === "Crystal Cavern") {
    // Crystal shards at all four corners
    ctx.globalAlpha = 0.16;
    const drawShards = (cx2: number, cy2: number, flip: boolean) => {
      const pal = ["#c084fc","#a78bfa","#e879f9","#818cf8"];
      for (let i=0;i<5;i++) {
        ctx.fillStyle = pal[i%pal.length]!;
        const aw=7+i*4, ah=18+i*12, ax=cx2+(i-2)*15;
        ctx.beginPath(); ctx.moveTo(ax, flip?cy2:cy2-ah); ctx.lineTo(ax-aw/2,flip?cy2+ah:cy2); ctx.lineTo(ax+aw/2,flip?cy2+ah:cy2); ctx.closePath(); ctx.fill();
      }
    };
    drawShards(38,0,true); drawShards(W-38,0,true); drawShards(38,H,false); drawShards(W-38,H,false);
    // Ambient gem glow
    ctx.globalAlpha = 0.06+Math.abs(Math.sin(now/620))*0.05;
    const gg = ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.min(W,H)*0.5);
    gg.addColorStop(0,"#e9d5ff"); gg.addColorStop(1,"transparent");
    ctx.fillStyle = gg; ctx.fillRect(0,0,W,H);
  }

  else if (n === "Mirror Maze") {
    // Grid lines
    ctx.globalAlpha = 0.07; ctx.strokeStyle = "#e2e8f0"; ctx.lineWidth = 1;
    for (let x=0;x<W;x+=80) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,H); ctx.stroke(); }
    for (let y=0;y<H;y+=80) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
    // Diamond lattice overlay
    ctx.globalAlpha = 0.06; ctx.strokeStyle = "#94a3b8";
    for (let x=0;x<W;x+=80) for (let y=0;y<H;y+=80) {
      ctx.beginPath(); ctx.moveTo(x+40,y); ctx.lineTo(x+80,y+40); ctx.lineTo(x+40,y+80); ctx.lineTo(x,y+40); ctx.closePath(); ctx.stroke();
    }
    // Shimmer sweep
    ctx.globalAlpha = 0.04+Math.abs(Math.sin(now/1300))*0.04;
    const ms = ctx.createLinearGradient(0,0,W,H);
    ms.addColorStop(0,"#fff"); ms.addColorStop(0.5,"transparent"); ms.addColorStop(1,"#fff");
    ctx.fillStyle = ms; ctx.fillRect(0,0,W,H);
  }

  else if (n === "Thunder Dome") {
    // Crowd silhouette at top
    ctx.globalAlpha = 0.09; ctx.fillStyle = "#1c1917";
    for (let x=0;x<W;x+=17) { ctx.beginPath(); ctx.arc(x+8,11+Math.sin(x*0.38)*4,6,0,Math.PI*2); ctx.fill(); ctx.fillRect(x+2,16+Math.sin(x*0.38)*4,11,16); }
    // Flashing lightning bolt in corners
    const lf = Math.abs(Math.sin(now/380))>0.72 ? 0.22 : 0.10;
    ctx.globalAlpha = lf; ctx.fillStyle = "#facc15";
    ctx.beginPath(); ctx.moveTo(28,38); ctx.lineTo(15,80); ctx.lineTo(26,80); ctx.lineTo(13,122); ctx.lineTo(39,70); ctx.lineTo(28,70); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(W-28,38); ctx.lineTo(W-15,80); ctx.lineTo(W-26,80); ctx.lineTo(W-13,122); ctx.lineTo(W-39,70); ctx.lineTo(W-28,70); ctx.closePath(); ctx.fill();
    // Danger floor stripes
    ctx.globalAlpha = 0.07; ctx.fillStyle = "#facc15";
    for (let x=0;x<W;x+=28) ctx.fillRect(x,H-14,16,14);
  }

  else if (n === "Lava Beach" || n === "Volcano Crater" || n === "Molten Fortress") {
    // Lava wave lines
    ctx.globalAlpha = 0.12; ctx.strokeStyle = "#fb923c"; ctx.lineWidth = 2;
    for (let w=0;w<3;w++) {
      ctx.beginPath(); ctx.moveTo(0,H-38+w*14);
      for (let x=0;x<=W;x+=9) ctx.lineTo(x, H-38+w*14+Math.sin(x*0.042+now/580+w)*8);
      ctx.stroke();
    }
    // Volcanic rock lumps
    ctx.globalAlpha = 0.10; ctx.fillStyle = "#7c2d12";
    for (let i=0;i<5;i++) { ctx.beginPath(); ctx.ellipse((i*157)%W, H*0.72+(i*37)%(H*0.2), 18+i*5, 11+i*3, 0,0,Math.PI*2); ctx.fill(); }
    if (n === "Molten Fortress") {
      ctx.globalAlpha = 0.10; ctx.fillStyle = "#450a0a";
      for (let x=0;x<W;x+=28) ctx.fillRect(x,0,20,32);
    }
  }

  // Generic vignette for any unmatched levels
  else {
    ctx.globalAlpha = 0.06;
    const vg = ctx.createRadialGradient(W/2,H/2,Math.min(W,H)*0.22,W/2,H/2,Math.min(W,H)*0.65);
    vg.addColorStop(0,"transparent"); vg.addColorStop(1,"rgba(0,0,0,0.45)");
    ctx.fillStyle = vg; ctx.fillRect(0,0,W,H);
  }

  ctx.globalAlpha = 1;
  ctx.restore();
};

// ─────────────────────────────────────────────────────────────────────────────
// drawObstacleDetail — themed skin drawn on top of existing wall/soft gradient.
// Called inside the obstacle loop — ctx already has arena transform applied.
// ─────────────────────────────────────────────────────────────────────────────
function drawObstacleDetail(
  ctx: CanvasRenderingContext2D,
  o: { x: number; y: number; w: number; h: number; kind: string },
  levelName: string,
  now: number,
) {
  if (o.kind === "water" || o.kind === "trap") return;
  ctx.save();
  const cx = o.x + o.w / 2, cy = o.y + o.h / 2;
  const n = levelName;
  const rad = o.kind === "soft" ? 18 : 8;

  if (n === "Cozy Kitchen") {
    // Wood-grain lines
    ctx.globalAlpha = 0.17; ctx.strokeStyle = "#92400e"; ctx.lineWidth = 1;
    for (let i = 1; i * 11 < o.h; i++) { ctx.beginPath(); ctx.moveTo(o.x+5, o.y+i*11); ctx.lineTo(o.x+o.w-5, o.y+i*11+Math.sin(i*1.7)*2); ctx.stroke(); }
    // Handle knob
    if (o.w > 55 && o.h > 28) { ctx.globalAlpha = 0.22; ctx.fillStyle = "#b45309"; ctx.beginPath(); ctx.ellipse(cx,cy,9,5,0,0,Math.PI*2); ctx.fill(); }
  }

  else if (n === "Living Room") {
    // Coloured book spines
    const bkC = ["#dc2626","#2563eb","#16a34a","#d97706","#7c3aed","#0891b2","#be185d"];
    ctx.globalAlpha = 0.22;
    let bx = o.x+4, bi = 0;
    while (bx < o.x+o.w-8) { const bw=8+(bi*7)%10; ctx.fillStyle=bkC[bi%bkC.length]!; ctx.fillRect(bx,o.y+4,bw,o.h-8); bx+=bw+2; bi++; }
  }

  else if (n === "Garden Patio") {
    // Leaf dots for hedge texture
    ctx.globalAlpha = 0.18;
    const lc = ["#16a34a","#15803d","#4ade80"];
    for (let i=0;i<8;i++) { ctx.fillStyle=lc[i%3]!; ctx.beginPath(); ctx.ellipse(o.x+6+(i*37)%(o.w-12),o.y+6+(i*53)%(o.h-12),5,8,(i*0.6)%Math.PI,0,Math.PI*2); ctx.fill(); }
    if (o.w>55&&o.h>38) {
      ctx.globalAlpha=0.24; ctx.fillStyle="#fde047";
      for (let p=0;p<5;p++) { const a=(Math.PI*2/5)*p; ctx.beginPath(); ctx.arc(cx+Math.cos(a)*8,cy+Math.sin(a)*8,4,0,Math.PI*2); ctx.fill(); }
      ctx.fillStyle="#fff"; ctx.beginPath(); ctx.arc(cx,cy,4,0,Math.PI*2); ctx.fill();
    }
  }

  else if (n === "The Library") {
    const bkC = ["#dc2626","#2563eb","#16a34a","#d97706","#7c3aed"];
    ctx.globalAlpha = 0.20;
    if (o.w >= o.h) {
      let bx2=o.x+4, bi=0;
      while(bx2<o.x+o.w-8){const bw=8+(bi*7)%10; ctx.fillStyle=bkC[bi%bkC.length]!; ctx.fillRect(bx2,o.y+3,bw,o.h-6); bx2+=bw+2; bi++;}
    } else {
      for(let row=0;row*16<o.h-8;row++){ctx.fillStyle=bkC[row%bkC.length]!; ctx.fillRect(o.x+4,o.y+4+row*18,28+(row*17)%(o.w-16),14);}
    }
  }

  else if (n === "Spooky Attic" || n === "Haunted Manor") {
    ctx.globalAlpha=0.14; ctx.strokeStyle="#d1d5db"; ctx.lineWidth=1.5;
    if(o.w>38&&o.h>28){
      ctx.beginPath(); ctx.moveTo(o.x+8,o.y+8); ctx.lineTo(o.x+o.w-8,o.y+o.h-8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(o.x+o.w-8,o.y+8); ctx.lineTo(o.x+8,o.y+o.h-8); ctx.stroke();
    }
    ctx.globalAlpha=0.09; ctx.strokeStyle="#6b7280"; ctx.lineWidth=1;
    for(let i=1;i<4;i++){ctx.beginPath(); ctx.moveTo(o.x+4,o.y+(o.h/4)*i); ctx.lineTo(o.x+o.w-4,o.y+(o.h/4)*i); ctx.stroke();}
  }

  else if (n === "Cheese Factory") {
    ctx.globalAlpha=0.20; ctx.fillStyle="#ca8a04";
    const hc=Math.min(5,Math.floor((o.w*o.h)/1600)+2);
    for(let i=0;i<hc;i++){ctx.beginPath(); ctx.ellipse(o.x+10+(i*37)%(o.w-20),o.y+8+(i*53)%(o.h-16),7,5,(i*0.7)%Math.PI,0,Math.PI*2); ctx.fill();}
  }

  else if (n === "Neon Alley" || n === "Cosmic Lab" || n === "Launch Bay" || n === "Zero-G Lab") {
    const nc2 = n==="Neon Alley"?"#22d3ee":n==="Cosmic Lab"?"#a78bfa":"#818cf8";
    ctx.globalAlpha=0.18+Math.sin(now/400)*0.06; ctx.shadowColor=nc2; ctx.shadowBlur=6;
    ctx.strokeStyle=nc2; ctx.lineWidth=1.5;
    roundRect(ctx,o.x+3,o.y+3,o.w-6,o.h-6,Math.max(2,rad-4)); ctx.stroke();
    ctx.shadowBlur=0; ctx.globalAlpha=0.18; ctx.fillStyle=nc2;
    ctx.beginPath(); ctx.arc(cx,cy,4,0,Math.PI*2); ctx.fill();
  }

  else if (n === "Snowy Cabin") {
    ctx.globalAlpha=0.16; ctx.strokeStyle="#bae6fd"; ctx.lineWidth=1;
    for(let a=0;a<4;a++){const ang=(Math.PI/4)*a,len=Math.min(o.w,o.h)*0.28; ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(cx+Math.cos(ang)*len,cy+Math.sin(ang)*len); ctx.stroke();}
    ctx.globalAlpha=0.19; ctx.fillStyle="#e0f2fe"; ctx.fillRect(o.x+4,o.y+2,o.w-8,Math.min(7,o.h*0.2));
  }

  else if (n === "Pirate Ship") {
    ctx.globalAlpha=0.15; ctx.strokeStyle="#78350f"; ctx.lineWidth=1.5;
    for(let i=1;i*14<o.h;i++){ctx.beginPath(); ctx.moveTo(o.x+4,o.y+i*14); ctx.lineTo(o.x+o.w-4,o.y+i*14); ctx.stroke();}
    ctx.globalAlpha=0.22; ctx.fillStyle="#b45309";
    for(const[dx,dy] of [[7,7],[o.w-7,7],[7,o.h-7],[o.w-7,o.h-7]] as [number,number][]){ctx.beginPath(); ctx.arc(o.x+dx,o.y+dy,4,0,Math.PI*2); ctx.fill();}
  }

  else if (n === "Candy Land") {
    ctx.globalAlpha=0.15; ctx.strokeStyle="#be185d"; ctx.lineWidth=3; ctx.setLineDash([7,7]);
    ctx.beginPath(); ctx.moveTo(o.x,o.y); ctx.lineTo(o.x+o.w,o.y+o.h); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha=0.18; ctx.fillStyle="#fb7185"; ctx.beginPath(); ctx.arc(cx,cy,7,0,Math.PI*2); ctx.fill();
  }

  else if (n === "Toy Workshop") {
    ctx.globalAlpha=0.20; ctx.fillStyle="#1d4ed8";
    for(const[dx,dy] of [[7,7],[o.w-7,7],[7,o.h-7],[o.w-7,o.h-7]] as [number,number][]){ctx.beginPath(); ctx.arc(o.x+dx,o.y+dy,5,0,Math.PI*2); ctx.fill();}
    ctx.globalAlpha=0.18; ctx.strokeStyle="#fbbf24"; ctx.lineWidth=2;
    for(let a=0;a<4;a++){const ang=(Math.PI/4)*a; ctx.beginPath(); ctx.moveTo(cx-Math.cos(ang)*10,cy-Math.sin(ang)*10); ctx.lineTo(cx+Math.cos(ang)*10,cy+Math.sin(ang)*10); ctx.stroke();}
  }

  else if (n === "Jungle Ruins") {
    ctx.globalAlpha=0.13; ctx.strokeStyle="#a16207"; ctx.lineWidth=1;
    for(let row=0;row*20<o.h;row++){
      ctx.beginPath(); ctx.moveTo(o.x,o.y+row*20); ctx.lineTo(o.x+o.w,o.y+row*20); ctx.stroke();
      const off=(row%2)*24;
      for(let bx2=o.x+off-24;bx2<o.x+o.w;bx2+=48){ctx.beginPath(); ctx.moveTo(bx2,o.y+row*20); ctx.lineTo(bx2,o.y+row*20+20); ctx.stroke();}
    }
    ctx.globalAlpha=0.18; ctx.fillStyle="#4ade80"; ctx.beginPath(); ctx.arc(cx,cy,5,0,Math.PI*2); ctx.fill();
  }

  else if (n === "Sky Castle") {
    ctx.globalAlpha=0.15; ctx.fillStyle="#fff";
    for(let i=0;i<3;i++){ctx.beginPath(); ctx.arc(o.x+10+i*(o.w/3),cy,8,0,Math.PI*2); ctx.fill();}
    if(o.h>38){ctx.globalAlpha=0.14; ctx.fillStyle="#bae6fd"; for(let bx2=o.x+4;bx2<o.x+o.w-4;bx2+=22) ctx.fillRect(bx2,o.y+2,13,8);}
  }

  else if (n==="Lava Cavern"||n==="Lava Beach"||n==="Volcano Crater"||n==="Molten Fortress") {
    ctx.globalAlpha=0.17; ctx.strokeStyle="#fcd34d"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(cx-9,o.y+5); ctx.lineTo(cx,cy); ctx.lineTo(cx+8,o.y+o.h-7); ctx.stroke();
    const em=0.09+Math.abs(Math.sin(now/400))*0.09;
    ctx.globalAlpha=em;
    const eg=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.min(o.w,o.h)*0.42);
    eg.addColorStop(0,"#fb923c"); eg.addColorStop(1,"transparent");
    ctx.fillStyle=eg; ctx.fillRect(o.x,o.y,o.w,o.h);
  }

  else if (n === "Underwater Reef") {
    ctx.globalAlpha=0.16; ctx.strokeStyle="#fb923c"; ctx.lineWidth=1.5;
    for(let b=0;b<5;b++){const ang=-Math.PI/2+(b-2)*0.3; ctx.beginPath(); ctx.moveTo(cx,o.y+o.h); ctx.lineTo(cx+Math.cos(ang)*o.h*0.48,o.y+o.h*0.52); ctx.stroke();}
    ctx.globalAlpha=0.12; ctx.strokeStyle="#67e8f9"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.arc(o.x+o.w*0.72,o.y+o.h*0.28,5,0,Math.PI*2); ctx.stroke();
  }

  else if (n === "Robot Factory") {
    // Diagonal hazard stripes + bolt corners
    ctx.globalAlpha=0.13; ctx.fillStyle="#fbbf24"; ctx.save();
    ctx.beginPath(); roundRect(ctx,o.x,o.y,o.w,o.h,rad); ctx.clip();
    for(let i=-o.h;i<o.w+o.h;i+=18) ctx.fillRect(o.x+i,o.y,7,o.h);
    ctx.restore();
    ctx.globalAlpha=0.20; ctx.fillStyle="#94a3b8";
    for(const[dx,dy] of [[5,5],[o.w-5,5],[5,o.h-5],[o.w-5,o.h-5]] as [number,number][]){ctx.beginPath(); ctx.arc(o.x+dx,o.y+dy,4,0,Math.PI*2); ctx.fill();}
  }

  else if (n==="Boss Lair"||n==="Mouse Apocalypse") {
    ctx.globalAlpha=0.14; ctx.strokeStyle="#fcd34d"; ctx.lineWidth=1.5;
    for(let c=0;c<3;c++){ctx.beginPath(); ctx.moveTo(o.x+9+c*12,o.y+7); ctx.lineTo(o.x+14+c*12,o.y+o.h-7); ctx.stroke();}
  }

  else if (n === "Mouse Kingdom") {
    ctx.globalAlpha=0.13; ctx.strokeStyle="#fcd34d"; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.moveTo(cx,o.y+5); ctx.lineTo(o.x+o.w-5,cy); ctx.lineTo(cx,o.y+o.h-5); ctx.lineTo(o.x+5,cy); ctx.closePath(); ctx.stroke();
    ctx.globalAlpha=0.20; ctx.fillStyle="#fcd34d"; ctx.beginPath(); ctx.arc(cx,cy,5,0,Math.PI*2); ctx.fill();
  }

  else if (n==="Reactor Core"||n==="Mirror Maze"||n==="Thunder Dome") {
    const col=n==="Reactor Core"?"#22d3ee":n==="Thunder Dome"?"#facc15":"#e2e8f0";
    const pulse2=0.09+Math.abs(Math.sin(now/320))*0.09;
    ctx.globalAlpha=pulse2; ctx.strokeStyle=col; ctx.lineWidth=2;
    ctx.beginPath(); ctx.arc(cx,cy,Math.min(o.w,o.h)*0.32,0,Math.PI*2); ctx.stroke();
    ctx.globalAlpha=0.11; ctx.fillStyle=col; ctx.save();
    ctx.beginPath(); roundRect(ctx,o.x,o.y,o.w,o.h,rad); ctx.clip();
    for(let i=-o.h;i<o.w+o.h;i+=16) ctx.fillRect(o.x+i,o.y,5,o.h);
    ctx.restore();
  }

  else if (n === "Crystal Cavern") {
    ctx.globalAlpha=0.18; ctx.strokeStyle="#c084fc"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(o.x+o.w*0.3,o.y+4); ctx.lineTo(cx,o.y+o.h*0.4); ctx.lineTo(o.x+o.w*0.72,o.y+4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx,o.y+o.h*0.4); ctx.lineTo(cx,o.y+o.h-4); ctx.stroke();
    ctx.globalAlpha=0.07+Math.abs(Math.sin(now/680))*0.06;
    const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.min(o.w,o.h)*0.42);
    cg.addColorStop(0,"#e9d5ff"); cg.addColorStop(1,"transparent");
    ctx.fillStyle=cg; ctx.fillRect(o.x,o.y,o.w,o.h);
  }

  ctx.globalAlpha = 1;
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

/** Trickster Mouse: purple smoke puff when the fake clones appear. */
const spawnTricksterSmoke = (s: { particles: Particle[] }, x: number, y: number) => {
  for (let i = 0; i < 16; i++) {
    const a = (Math.PI * 2 * i) / 16 + Math.random() * 0.3;
    const sp = 40 + Math.random() * 90;
    s.particles.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 20,
      life: 0.5 + Math.random() * 0.3,
      maxLife: 0.8,
      color: ["#a78bfa", "#7c3aed", "#c4b5fd"][i % 3]!,
      size: 4 + Math.random() * 3,
    });
  }
};

/** Trickster Mouse: small sparkle burst when a fake clone disappears. */
const spawnTricksterSparkle = (s: { particles: Particle[] }, x: number, y: number) => {
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI * 2 * i) / 8;
    s.particles.push({
      x, y,
      vx: Math.cos(a) * 70,
      vy: Math.sin(a) * 70,
      life: 0.35,
      maxLife: 0.35,
      color: "#e9d5ff",
      size: 2.5,
    });
  }
};
