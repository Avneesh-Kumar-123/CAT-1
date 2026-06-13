import { useCallback, useRef, useState } from "react";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Home, RotateCcw, Timer } from "lucide-react";
import { GameCanvas } from "@/components/GameCanvas";
import { Button } from "@/components/ui/button";
import { MenuShell } from "@/components/MenuShell";
import { sfx } from "@/game/audio";
import { saveSave } from "@/game/storage";
import type { LevelDef, SaveData } from "@/game/types";

const DURATION = 60;
const MOUSE_COUNT = 3;

const TIME_ATTACK_LEVEL: LevelDef = {
  id: 999,
  name: "Time Attack",
  subtitle: "Catch as many as you can!",
  time: 99999,
  mouseSpeed: 155,
  mouseAI: "scared",
  mouseCount: MOUSE_COUNT,
  obstacles: [],
  theme: {
    bg: "#fef3c7",
    bgGradient: ["#fef3c7", "#fde68a"],
    floorTile: "#fcd34d",
    accent: "#f59e0b",
  },
  hint: "Catch all 3 mice — they respawn instantly!",
};

type Phase = "ready" | "playing" | "done";

type Props = {
  save: SaveData;
  onSave: (s: SaveData) => void;
};

export const TimeAttack = ({ save, onSave }: Props) => {
  const [phase, setPhase] = useState<Phase>("ready");
  const [caught, setCaught] = useState(0);
  const [timeLeft, setTimeLeft] = useState(DURATION);
  const [canvasKey, setCanvasKey] = useState(0);
  const [placingBait, setPlacingBait] = useState(false);
  const [cheeseUsed, setCheeseUsed] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const caughtRef = useRef(0);
  const tapTargetRef = useRef<{ x: number; y: number } | null>(null);
  const cheesePlaceRef = useRef<{ x: number; y: number } | null>(null);

  const best = save.timeAttackBest ?? 0;

  const startGame = () => {
    sfx.click();
    caughtRef.current = 0;
    setCaught(0);
    setTimeLeft(DURATION);
    setCanvasKey((k) => k + 1);
    setPlacingBait(false);
    setCheeseUsed(false);
    tapTargetRef.current = null;
    cheesePlaceRef.current = null;
    setPhase("playing");

    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase("done");
          const finalScore = caughtRef.current;
          if (finalScore > (save.timeAttackBest ?? 0)) {
            const updated = { ...save, timeAttackBest: finalScore };
            onSave(updated);
            saveSave(updated);
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const handleCatch = useCallback(() => {
    sfx.win();
    caughtRef.current += MOUSE_COUNT;
    setCaught(caughtRef.current);
    setCheeseUsed(false);
    setCanvasKey((k) => k + 1);
  }, []);

  const handleEnd = () => {
    clearInterval(timerRef.current!);
    const finalScore = caughtRef.current;
    if (finalScore > (save.timeAttackBest ?? 0)) {
      const updated = { ...save, timeAttackBest: finalScore };
      onSave(updated);
      saveSave(updated);
    }
    setPhase("done");
  };

  const handleRestart = () => {
    clearInterval(timerRef.current!);
    startGame();
  };

  const catSkin = save.settings.catSkin ?? "orange";
  const controlMode = save.settings.controlMode ?? "tap";
  const isNewBest = phase === "done" && caught > best && best > 0;
  const isFirstBest = phase === "done" && caught > 0 && best === 0;

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
    if (!t) return;
    if (placingBait) {
      cheesePlaceRef.current = { x: t.clientX, y: t.clientY };
      setPlacingBait(false);
      setCheeseUsed(true);
      return;
    }
    if (controlMode !== "tap") return;
    tapTargetRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (controlMode !== "tap") return;
    e.preventDefault();
    if (e.touches.length === 0) tapTargetRef.current = null;
  };

  const handleGameClick = (e: React.MouseEvent) => {
    if (!placingBait || phase !== "playing") return;
    cheesePlaceRef.current = { x: e.clientX, y: e.clientY };
    setPlacingBait(false);
    setCheeseUsed(true);
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
            <div className="text-6xl mb-4">⏱️</div>
            <h1 className="font-display font-bold text-5xl sm:text-6xl mb-2">Time Attack</h1>
            <p className="text-muted-foreground font-bold text-lg mb-4">
              Catch as many mice as you can in <span className="text-primary">60 seconds!</span>
            </p>

            {best > 0 && (
              <div className="inline-flex items-center gap-2 bg-card border-2 border-primary rounded-2xl px-4 py-2 mb-5 shadow-md">
                <span className="text-lg">🏆</span>
                <span className="font-display font-bold">Best: {best} mice</span>
              </div>
            )}

            <div className="bg-card/80 border-2 border-card-border rounded-2xl p-4 mb-6 text-left shadow">
              <p className="font-bold text-sm mb-2">How it works:</p>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li>🐭🐭🐭 <span className="font-semibold text-foreground">3 mice</span> chase around the arena at once</li>
                <li>⏱️ 60-second countdown — catch as many as possible</li>
                <li>🧀 Use <span className="font-semibold text-foreground">cheese bait</span> once per wave to lure them!</li>
                <li>🏆 Beat your personal best!</li>
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

  if (phase === "done") {
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
            <div className="text-6xl mb-3">{isNewBest || isFirstBest ? "🎉" : "⏰"}</div>
            <h1 className="font-display font-bold text-4xl sm:text-5xl mb-1">
              {isNewBest || isFirstBest ? "New Best!" : "Time's Up!"}
            </h1>

            <div className="bg-card border-2 border-primary rounded-3xl p-6 my-6 shadow-xl">
              <div className="text-muted-foreground font-bold text-sm uppercase tracking-widest mb-1">
                Mice Caught
              </div>
              <div className="font-display font-bold text-7xl text-primary">{caught}</div>
              {best > 0 && !isNewBest && (
                <div className="text-sm text-muted-foreground mt-2">
                  Best: <span className="font-bold">{best}</span>
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
                onClick={handleRestart}
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
      className={`flex flex-col w-full${placingBait ? " cursor-crosshair" : ""}`}
      style={{ height: "100dvh", background: "#fef3c7" }}
      onClick={handleGameClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      <div
        className="flex-none flex items-center justify-between px-4 py-2 bg-card/90 backdrop-blur border-b-2 border-card-border shadow-sm gap-3"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchEnd={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 min-w-[60px]">
          <Timer className="h-4 w-4 text-primary flex-shrink-0" />
          <span
            className="font-display font-bold text-2xl tabular-nums"
            style={{ color: timeLeft <= 10 ? "#ef4444" : undefined }}
          >
            {timeLeft}s
          </span>
        </div>

        <div className="font-display font-bold text-xl text-center">
          🐭 <span className="text-primary">{caught}</span>
          {best > 0 && (
            <span className="text-muted-foreground text-sm ml-1.5">best {best}</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={placingBait ? "default" : "secondary"}
            className="font-bold text-base px-2.5 h-9"
            disabled={cheeseUsed}
            onClick={(e) => {
              e.stopPropagation();
              sfx.click();
              setPlacingBait((p) => !p);
            }}
            title={cheeseUsed ? "Used this wave" : "Drop cheese bait"}
          >
            {cheeseUsed ? "🧀✓" : "🧀"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            className="font-bold h-9"
            onClick={(e) => { e.stopPropagation(); handleEnd(); }}
          >
            End
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {placingBait && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute top-16 inset-x-0 z-20 flex justify-center pointer-events-none"
          >
            <div className="bg-card border-2 border-primary rounded-xl px-4 py-1.5 text-sm font-bold shadow-md">
              🧀 Tap anywhere to drop cheese bait!
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <GameCanvas
          key={canvasKey}
          level={TIME_ATTACK_LEVEL}
          difficultyMul={1}
          paused={false}
          joystick={{ x: 0, y: 0 }}
          catSkin={catSkin}
          controlMode={controlMode}
          tapTargetRef={tapTargetRef}
          cheesePlaceRef={cheesePlaceRef}
          onCatch={handleCatch}
          onTimeUp={() => {}}
          onTrap={() => {}}
          onState={() => {}}
        />
      </div>
    </div>
  );
};
