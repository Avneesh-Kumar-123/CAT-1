import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Home, RotateCcw, Shield } from "lucide-react";
import { GameCanvas } from "@/components/GameCanvas";
import { Button } from "@/components/ui/button";
import { MenuShell } from "@/components/MenuShell";
import { sfx } from "@/game/audio";
import { saveSave } from "@/game/storage";
import type { LevelDef, SaveData } from "@/game/types";

const LIVES = 3;

function waveTime(w: number) {
  return Math.min(28 + w * 3, 60);
}

function buildWaveLevel(wave: number): LevelDef {
  const mouseCount = wave;
  const mouseSpeed = Math.min(140 + wave * 10, 270);
  const mouseAI =
    wave >= 9 ? "boss" : wave >= 6 ? "darty" : wave >= 3 ? "smart" : "scared";
  const theme =
    wave >= 9
      ? { bg: "#1e1b4b", bgGradient: ["#1e1b4b", "#312e81"] as [string, string], floorTile: "#312e81", accent: "#818cf8" }
      : wave >= 6
      ? { bg: "#fef3c7", bgGradient: ["#fef3c7", "#fde68a"] as [string, string], floorTile: "#fcd34d", accent: "#f59e0b" }
      : wave >= 3
      ? { bg: "#fff7ed", bgGradient: ["#fff7ed", "#fed7aa"] as [string, string], floorTile: "#fdba74", accent: "#f97316" }
      : { bg: "#ecfdf5", bgGradient: ["#ecfdf5", "#d1fae5"] as [string, string], floorTile: "#a7f3d0", accent: "#10b981" };
  return {
    id: 9000 + wave,
    name: `Wave ${wave}`,
    subtitle: `${mouseCount} ${mouseCount === 1 ? "mouse" : "mice"}!`,
    time: 99999,
    mouseSpeed,
    mouseAI,
    mouseCount,
    obstacles: [],
    theme,
    hint: `Catch all ${mouseCount} mice before time runs out!`,
  };
}

type Phase = "ready" | "wave-intro" | "playing" | "wave-clear" | "life-lost" | "game-over";

type Props = {
  save: SaveData;
  onSave: (s: SaveData) => void;
};

export const Survival = ({ save, onSave }: Props) => {
  const [phase, setPhase] = useState<Phase>("ready");
  const [wave, setWave] = useState(1);
  const [lives, setLives] = useState(LIVES);
  const [timeLeft, setTimeLeft] = useState(waveTime(1));
  const [canvasKey, setCanvasKey] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveRef = useRef(1);
  const livesRef = useRef(LIVES);
  const saveRef = useRef(save);
  useLayoutEffect(() => { saveRef.current = save; }, [save]);

  const tapTargetRef = useRef<{ x: number; y: number } | null>(null);
  const cheesePlaceRef = useRef<{ x: number; y: number } | null>(null);

  const best = save.survivalBest ?? 0;
  const catSkin = save.settings.catSkin ?? "orange";
  const controlMode = save.settings.controlMode ?? "tap";

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  const doSaveBest = useCallback((reachedWave: number) => {
    const cur = saveRef.current;
    if (reachedWave > (cur.survivalBest ?? 0)) {
      const updated = { ...cur, survivalBest: reachedWave };
      onSave(updated);
      saveSave(updated);
    }
  }, [onSave]);

  const doLoseLive = useCallback(() => {
    const newLives = livesRef.current - 1;
    livesRef.current = newLives;
    setLives(newLives);
    if (newLives <= 0) {
      doSaveBest(waveRef.current);
      setPhase("game-over");
    } else {
      sfx.lifeLost();
      setPhase("life-lost");
    }
  }, [doSaveBest]);

  const startWaveTimer = useCallback((w: number) => {
    clearTimer();
    const duration = waveTime(w);
    setTimeLeft(duration);
    let remaining = duration;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);
      if (remaining <= 0) { clearTimer(); doLoseLive(); }
    }, 1000);
  }, [clearTimer, doLoseLive]);

  const launchWave = useCallback(() => {
    setCanvasKey((k) => k + 1);
    setPhase("playing");
    startWaveTimer(waveRef.current);
  }, [startWaveTimer]);

  const startGame = useCallback(() => {
    sfx.click();
    clearTimer();
    waveRef.current = 1;
    livesRef.current = LIVES;
    setWave(1);
    setLives(LIVES);
    setPhase("wave-intro");
  }, [clearTimer]);

  useEffect(() => {
    if (phase !== "wave-intro") return;
    const t = setTimeout(launchWave, 1500);
    return () => clearTimeout(t);
  }, [phase, launchWave]);

  useEffect(() => {
    if (phase !== "life-lost") return;
    const t = setTimeout(launchWave, 1800);
    return () => clearTimeout(t);
  }, [phase, launchWave]);

  useEffect(() => {
    if (phase !== "wave-clear") return;
    const t = setTimeout(() => {
      waveRef.current += 1;
      setWave((w) => w + 1);
      setPhase("wave-intro");
    }, 1500);
    return () => clearTimeout(t);
  }, [phase]);

  const handleCatch = useCallback(() => {
    clearTimer();
    sfx.win();
    doSaveBest(waveRef.current);
    setPhase("wave-clear");
  }, [clearTimer, doSaveBest]);

  const handleTrap = useCallback(() => {
    clearTimer();
    doLoseLive();
  }, [clearTimer, doLoseLive]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  const currentLevel = useMemo(() => buildWaveLevel(wave), [wave]);

  const handleTouchMove = (e: React.TouchEvent) => {
    if (controlMode !== "tap" || phase !== "playing") return;
    e.preventDefault();
    const t = e.changedTouches[0];
    if (t) tapTargetRef.current = { x: t.clientX, y: t.clientY };
  };
  const handleTouchStart = (e: React.TouchEvent) => {
    if (phase !== "playing") return;
    e.preventDefault();
    const t = e.changedTouches[0];
    if (!t || controlMode !== "tap") return;
    tapTargetRef.current = { x: t.clientX, y: t.clientY };
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (controlMode !== "tap") return;
    e.preventDefault();
    if (e.touches.length === 0) tapTargetRef.current = null;
  };

  if (phase === "ready") {
    return (
      <MenuShell showBack>
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="w-full max-w-sm"
          >
            <div className="text-6xl mb-4">🌊</div>
            <h1 className="font-display font-bold text-5xl sm:text-6xl mb-2">Survival</h1>
            <p className="text-muted-foreground font-bold text-lg mb-4">
              Endless waves — how far can you go?
            </p>

            {best > 0 && (
              <div className="inline-flex items-center gap-2 bg-card border-2 border-primary rounded-2xl px-4 py-2 mb-5 shadow-md">
                <span className="text-lg">🏆</span>
                <span className="font-display font-bold">Best: Wave {best}</span>
              </div>
            )}

            <div className="bg-card/80 border-2 border-card-border rounded-2xl p-4 mb-6 text-left shadow">
              <p className="font-bold text-sm mb-2">How it works:</p>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li>🌊 Each wave adds <span className="font-semibold text-foreground">one more mouse</span></li>
                <li>❤️ You have <span className="font-semibold text-foreground">3 lives</span> — don't let time run out!</li>
                <li>⚡ Mice get <span className="font-semibold text-foreground">faster every wave</span></li>
                <li>🏆 Survive as many waves as possible!</li>
              </ul>
            </div>

            <Button
              size="lg"
              className="w-full h-16 text-2xl font-display font-bold shadow-lg game-button"
              onClick={startGame}
            >
              START!
            </Button>
          </motion.div>
        </div>
      </MenuShell>
    );
  }

  if (phase === "game-over") {
    const reached = wave;
    const isNewBest = reached > best && best > 0;
    const isFirstBest = reached > 0 && best === 0;
    return (
      <MenuShell showBack>
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center">
          <motion.div
            key="result"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className="w-full max-w-sm"
          >
            <div className="text-6xl mb-3">{isNewBest || isFirstBest ? "🎉" : "💀"}</div>
            <h1 className="font-display font-bold text-4xl sm:text-5xl mb-1">
              {isNewBest || isFirstBest ? "New Best!" : "Game Over!"}
            </h1>

            <div className="bg-card border-2 border-primary rounded-3xl p-6 my-6 shadow-xl">
              <div className="text-muted-foreground font-bold text-sm uppercase tracking-widest mb-1">
                Survived to
              </div>
              <div className="font-display font-bold text-7xl text-primary">Wave {reached}</div>
              {best > 0 && !isNewBest && (
                <div className="text-sm text-muted-foreground mt-2">
                  Best: <span className="font-bold">Wave {best}</span>
                </div>
              )}
              {(isNewBest || isFirstBest) && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-sm font-bold text-primary mt-2"
                >
                  ⭐ New personal best!
                </motion.div>
              )}
            </div>

            <div className="grid gap-3">
              <Button
                size="lg"
                className="w-full font-display font-bold text-lg h-14 game-button"
                onClick={startGame}
              >
                <RotateCcw className="mr-2 h-5 w-5" /> Try Again
              </Button>
              <Link href="/">
                <Button variant="secondary" className="w-full font-display font-bold">
                  <Home className="mr-2 h-4 w-4" /> Menu
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </MenuShell>
    );
  }

  return (
    <div
      className="flex flex-col w-full"
      style={{ height: "100dvh", background: currentLevel.theme.bg }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div
        className="flex-none flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 bg-card/90 backdrop-blur border-b-2 border-card-border shadow-sm"
        style={{ paddingTop: "max(6px, env(safe-area-inset-top))" }}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1 sm:gap-1.5">
          <Shield className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary flex-shrink-0" />
          <span className="font-display font-bold text-base sm:text-xl">Wave {wave}</span>
        </div>

        <div className="font-display font-bold text-base sm:text-xl tracking-wide">
          {Array.from({ length: LIVES }).map((_, i) => (
            <span key={i} style={{ opacity: i < lives ? 1 : 0.2, fontSize: "0.95rem" }}>❤️</span>
          ))}
        </div>

        <span
          className="font-display font-bold text-lg sm:text-2xl tabular-nums"
          style={{ color: timeLeft <= 8 ? "#ef4444" : undefined }}
        >
          {timeLeft}s
        </span>
      </div>

      <AnimatePresence>
        {(phase === "wave-intro" || phase === "wave-clear" || phase === "life-lost") && (
          <motion.div
            key={phase}
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.15 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-card/96 border-4 border-primary rounded-3xl px-10 py-8 shadow-2xl text-center">
              {phase === "wave-intro" && (
                <>
                  <div className="text-5xl mb-2">🌊</div>
                  <div className="font-display font-bold text-4xl text-primary">Wave {wave}</div>
                  <div className="font-bold text-muted-foreground mt-1">
                    {wave} {wave === 1 ? "mouse" : "mice"} incoming!
                  </div>
                </>
              )}
              {phase === "wave-clear" && (
                <>
                  <div className="text-5xl mb-2">✅</div>
                  <div className="font-display font-bold text-4xl text-green-600">Cleared!</div>
                  <div className="font-bold text-muted-foreground mt-1">Next wave coming…</div>
                </>
              )}
              {phase === "life-lost" && (
                <>
                  <div className="text-5xl mb-2">💔</div>
                  <div className="font-display font-bold text-4xl text-destructive">Life Lost!</div>
                  <div className="font-bold text-muted-foreground mt-1">
                    {lives} {lives === 1 ? "life" : "lives"} remaining — retrying…
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <GameCanvas
          key={canvasKey}
          level={currentLevel}
          difficultyMul={1}
          paused={phase !== "playing"}
          joystick={{ x: 0, y: 0 }}
          catSkin={catSkin}
          controlMode={controlMode}
          tapTargetRef={tapTargetRef}
          cheesePlaceRef={cheesePlaceRef}
          onCatch={handleCatch}
          onTimeUp={() => {}}
          onTrap={handleTrap}
          onState={() => {}}
        />
      </div>
    </div>
  );
};
