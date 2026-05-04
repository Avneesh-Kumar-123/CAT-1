import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Play as PlayIcon, RotateCcw, ChevronRight, Home, Settings as SettingsIcon, Trophy } from "lucide-react";
import { GameCanvas } from "@/components/GameCanvas";
import { HUD } from "@/components/HUD";
import { VirtualJoystick } from "@/components/VirtualJoystick";
import { Modal } from "@/components/Modal";
import { StarRating } from "@/components/StarRating";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ShareButton } from "@/components/ShareButton";
import { CountdownOverlay } from "@/components/CountdownOverlay";
import { Button } from "@/components/ui/button";
import { LEVELS } from "@/game/levels";
import { sfx, setAudioMuted } from "@/game/audio";
import { recordLevelComplete, updateSettings } from "@/game/storage";
import type { PowerUpKind, SaveData } from "@/game/types";

type Props = {
  levelId: number;
  save: SaveData;
  onSave: (s: SaveData) => void;
};

type Outcome =
  | null
  | { kind: "win"; stars: number; timeRemaining: number; score: number; isMilestone: boolean }
  | { kind: "lose"; reason: "time" | "trap"; score: number };

const difficultyMul = (d: SaveData["settings"]["difficulty"]) =>
  d === "easy" ? 0.85 : d === "hard" ? 1.18 : 1;

const computeStars = (timeRemaining: number, totalTime: number) => {
  const pct = timeRemaining / totalTime;
  if (pct >= 0.6) return 3;
  if (pct >= 0.3) return 2;
  return 1;
};

export const Play = ({ levelId, save, onSave }: Props) => {
  const [, setLoc] = useLocation();
  const level = useMemo(() => LEVELS.find((l) => l.id === levelId) ?? LEVELS[0]!, [levelId]);
  const [paused, setPaused] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [joy, setJoy] = useState({ x: 0, y: 0 });
  const [catchFlash, setCatchFlash] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(true);
  const [countdownKey, setCountdownKey] = useState(0);
  const [showMilestone, setShowMilestone] = useState(false);
  const catchFlashTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const milestoneTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // tap-to-move target ref (shared with GameCanvas)
  const tapTargetRef = useRef<{ x: number; y: number } | null>(null);
  // cheese bait placement ref (shared with GameCanvas)
  const cheesePlaceRef = useRef<{ x: number; y: number } | null>(null);
  // placing mode: next tap on game canvas places cheese
  const [placingBait, setPlacingBait] = useState(false);

  const controlMode = save.settings.controlMode ?? "tap";

  const [hud, setHud] = useState<{
    score: number;
    timeLeft: number;
    activePower: { kind: PowerUpKind; until: number } | null;
    now: number;
    miceLeft: number;
    miceTotal: number;
    combo: number;
    cheeseAvailable: boolean;
  }>({
    score: 0,
    timeLeft: level.time,
    activePower: null,
    now: performance.now(),
    miceLeft: level.mouseCount ?? 1,
    miceTotal: level.mouseCount ?? 1,
    combo: 0,
    cheeseAvailable: true,
  });

  useEffect(() => {
    setAudioMuted(!save.settings.sound);
  }, [save.settings.sound]);

  const handleCatch = useCallback(
    (timeRemaining: number, score: number) => {
      const stars = computeStars(timeRemaining, level.time);
      const prevBestStars = save.levels[level.id]?.bestStars ?? 0;
      const isMilestone = stars === 3 && prevBestStars < 3;

      sfx.win();
      clearTimeout(catchFlashTimer.current);
      setCatchFlash(true);
      catchFlashTimer.current = setTimeout(() => setCatchFlash(false), 350);

      const updated = recordLevelComplete(save, level.id, stars, timeRemaining, score);
      onSave(updated);

      if (isMilestone) {
        setShowMilestone(true);
        milestoneTimer.current = setTimeout(() => {
          setShowMilestone(false);
          setOutcome({ kind: "win", stars, timeRemaining, score, isMilestone: true });
        }, 2200);
      } else {
        setOutcome({ kind: "win", stars, timeRemaining, score, isMilestone: false });
      }
    },
    [level, save, onSave],
  );

  const handleTimeUp = useCallback((score: number) => {
    setOutcome({ kind: "lose", reason: "time", score });
  }, []);

  const handleTrap = useCallback(() => {
    setOutcome({ kind: "lose", reason: "trap", score: 0 });
  }, []);

  const restart = () => {
    sfx.click();
    clearTimeout(milestoneTimer.current);
    tapTargetRef.current = null;
    cheesePlaceRef.current = null;
    setPlacingBait(false);
    setOutcome(null);
    setShowMilestone(false);
    setPaused(false);
    setCatchFlash(false);
    setIsCountingDown(true);
    setCountdownKey((k) => k + 1);
    setKey((k) => k + 1);
  };

  const nextLevel = useMemo(() => LEVELS.find((l) => l.id === level.id + 1), [level.id]);
  const canPlayNext = !!nextLevel && save.highestUnlocked >= (nextLevel?.id ?? Infinity);

  const next = () => {
    sfx.click();
    clearTimeout(milestoneTimer.current);
    tapTargetRef.current = null;
    if (nextLevel) {
      setOutcome(null);
      setShowMilestone(false);
      setPaused(false);
      setCatchFlash(false);
      setLoc(`/play/${nextLevel.id}`);
    } else {
      setLoc("/levels");
    }
  };

  const [key, setKey] = useState(0);

  const toggleSound = () => {
    sfx.click();
    onSave(updateSettings(save, { sound: !save.settings.sound }));
  };

  const catSkin = save.settings.catSkin ?? "orange";

  const effectivelyPaused = isCountingDown || paused || outcome !== null || showMilestone;

  // Hold-and-drag touch handlers — cover the entire screen in tap mode
  const handleTouchMove = (e: React.TouchEvent) => {
    if (controlMode !== "tap") return;
    if (effectivelyPaused) return;
    e.preventDefault();
    const t = e.changedTouches[0];
    if (t) tapTargetRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (effectivelyPaused) return;
    e.preventDefault();
    const t = e.changedTouches[0];
    if (!t) return;
    if (placingBait) {
      cheesePlaceRef.current = { x: t.clientX, y: t.clientY };
      setPlacingBait(false);
      return;
    }
    if (controlMode !== "tap") return;
    tapTargetRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleGameClick = (e: React.MouseEvent) => {
    if (!placingBait || effectivelyPaused) return;
    cheesePlaceRef.current = { x: e.clientX, y: e.clientY };
    setPlacingBait(false);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (controlMode !== "tap") return;
    e.preventDefault();
    // All fingers lifted — stop the cat
    if (e.touches.length === 0) tapTargetRef.current = null;
  };

  return (
    <div
      className={`flex flex-col w-full overflow-hidden${placingBait ? " cursor-crosshair" : ""}`}
      style={{ height: "100dvh", background: level.theme.bgGradient[1] }}
      onClick={handleGameClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Game area */}
      <div
        className="relative flex-1 min-h-0 overflow-hidden"
      >
        {/* Canvas */}
        <div className="absolute inset-0">
          <GameCanvas
            key={key}
            level={level}
            difficultyMul={difficultyMul(save.settings.difficulty)}
            paused={effectivelyPaused}
            joystick={joy}
            catSkin={catSkin}
            controlMode={controlMode}
            tapTargetRef={tapTargetRef}
            cheesePlaceRef={cheesePlaceRef}
            onCatch={handleCatch}
            onTimeUp={handleTimeUp}
            onTrap={handleTrap}
            onState={setHud}
          />
        </div>

        {/* Countdown overlay */}
        <AnimatePresence>
          {isCountingDown && (
            <CountdownOverlay key={countdownKey} onDone={() => setIsCountingDown(false)} />
          )}
        </AnimatePresence>

        {/* Milestone celebration overlay */}
        <AnimatePresence>
          {showMilestone && (
            <motion.div
              key="milestone"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none"
              style={{ background: "radial-gradient(ellipse at center, rgba(250,204,21,0.25) 0%, rgba(0,0,0,0.6) 100%)" }}
            >
              <div className="absolute inset-0 overflow-hidden">
                {Array.from({ length: 48 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ x: "50vw", y: "45vh", scale: 0, opacity: 1 }}
                    animate={{
                      x: `${Math.random() * 100}vw`,
                      y: `${Math.random() * 100}vh`,
                      scale: Math.random() * 1.5 + 0.5,
                      opacity: 0,
                      rotate: Math.random() * 720 - 360,
                    }}
                    transition={{ duration: 1.4 + Math.random() * 0.8, ease: "easeOut", delay: i * 0.02 }}
                    className="absolute w-3 h-4 rounded-sm"
                    style={{
                      background: ["#fde047", "#fb7185", "#a78bfa", "#34d399", "#60a5fa", "#f97316"][i % 6],
                    }}
                  />
                ))}
              </div>
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: [0, 1.4, 1], rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
                className="text-6xl sm:text-7xl mb-3 relative z-10"
              >
                ⭐⭐⭐
              </motion.div>
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 380, damping: 20, delay: 0.3 }}
                className="relative z-10 text-center px-6"
              >
                <div
                  className="font-display font-bold text-white"
                  style={{
                    fontSize: "clamp(36px, 10vw, 68px)",
                    textShadow: "0 0 40px rgba(250,204,21,1), 0 4px 16px rgba(0,0,0,0.6)",
                    lineHeight: 1.1,
                  }}
                >
                  PERFECT!
                </div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.55 }}
                  className="text-yellow-200 font-display font-bold text-xl sm:text-2xl mt-2"
                  style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
                >
                  First 3-star clear! 🏆
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <HUD
          level={level.id}
          levelName={level.name}
          score={hud.score}
          timeLeft={hud.timeLeft}
          totalTime={level.time}
          activePower={hud.activePower}
          now={hud.now}
          miceLeft={hud.miceLeft}
          miceTotal={hud.miceTotal}
          combo={hud.combo}
          sound={save.settings.sound}
          cheeseAvailable={hud.cheeseAvailable}
          placingBait={placingBait}
          onPause={() => {
            sfx.click();
            setPaused(true);
          }}
          onToggleSound={toggleSound}
          onDropBait={() => {
            if (hud.cheeseAvailable && !effectivelyPaused) {
              sfx.click();
              setPlacingBait((p) => !p);
            }
          }}
        />

        {/* Catch flash overlay */}
        <AnimatePresence>
          {catchFlash && (
            <motion.div
              key="flash"
              initial={{ opacity: 0.7 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0 pointer-events-none z-10"
              style={{ background: "radial-gradient(circle, rgba(253,224,71,0.55) 0%, rgba(251,191,36,0.15) 70%, transparent 100%)" }}
            />
          )}
        </AnimatePresence>

        {/* Hint banner */}
        <HintBanner hint={level.hint} levelId={level.id} />
      </div>

      {/* Mobile controls bar — only shown for joystick mode */}
      {controlMode !== "tap" && (
        <div
          className="md:hidden flex-none relative bg-black/25 backdrop-blur-sm"
          style={{
            height: 148,
            paddingBottom: "max(10px, env(safe-area-inset-bottom))",
          }}
        >
          <VirtualJoystick floating onChange={(x, y) => setJoy({ x, y })} />
        </div>
      )}
      {/* Safe-area spacer for hold-and-drag mode so content doesn't hide behind home bar */}
      {controlMode === "tap" && (
        <div
          className="md:hidden flex-none"
          style={{ height: "max(0px, env(safe-area-inset-bottom))" }}
        />
      )}

      {/* Pause modal */}
      <Modal open={paused && !outcome && !settingsOpen && !isCountingDown}>
        <div className="p-6 text-center">
          <h2 className="font-display text-3xl font-bold mb-1">Paused</h2>
          <p className="text-muted-foreground mb-5">Take a breath, then go catch that mouse.</p>
          <div className="grid gap-2">
            <Button
              size="lg"
              className="font-display font-bold"
              onClick={() => {
                sfx.click();
                setPaused(false);
              }}
              data-testid="button-resume"
            >
              <PlayIcon className="mr-2 h-5 w-5 fill-current" /> Resume
            </Button>
            {nextLevel && (
              <Button
                variant="secondary"
                className="font-display font-bold"
                onClick={next}
                disabled={!canPlayNext}
                data-testid="button-next-level"
                title={canPlayNext ? undefined : "Complete this level to unlock"}
              >
                <ChevronRight className="mr-2 h-4 w-4" /> Next Level
              </Button>
            )}
            <Button
              variant="secondary"
              className="font-display font-bold"
              onClick={restart}
              data-testid="button-restart"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Restart Level
            </Button>
            <Button
              variant="secondary"
              className="font-display font-bold"
              onClick={() => {
                sfx.click();
                setSettingsOpen(true);
              }}
              data-testid="button-settings"
            >
              <SettingsIcon className="mr-2 h-4 w-4" /> Settings
            </Button>
            <Link href="/">
              <Button variant="ghost" className="w-full font-display font-bold" data-testid="button-quit">
                <Home className="mr-2 h-4 w-4" /> Quit to Menu
              </Button>
            </Link>
          </div>
        </div>
      </Modal>

      {/* Settings panel */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        save={save}
        onSave={onSave}
      />

      {/* Level Complete modal */}
      <Modal open={outcome?.kind === "win"}>
        {outcome?.kind === "win" && (
          <WinPanel
            outcome={outcome}
            levelId={level.id}
            onRestart={restart}
            onNext={next}
            canPlayNext={canPlayNext}
          />
        )}
      </Modal>

      {/* Game Over modal */}
      <Modal open={outcome?.kind === "lose"}>
        {outcome?.kind === "lose" && (
          <LosePanel reason={outcome.reason} score={outcome.score} onRestart={restart} />
        )}
      </Modal>
    </div>
  );
};

const WinPanel = ({
  outcome,
  levelId,
  onRestart,
  onNext,
  canPlayNext,
}: {
  outcome: { stars: number; timeRemaining: number; score: number; isMilestone: boolean };
  levelId: number;
  onRestart: () => void;
  onNext: () => void;
  canPlayNext: boolean;
}) => {
  const isLast = levelId >= LEVELS.length;
  const confettiCount = outcome.isMilestone ? 48 : 28;

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: confettiCount }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ y: -20, x: Math.random() * 400, rotate: 0, opacity: 1 }}
            animate={{ y: 600, rotate: 360 * (Math.random() > 0.5 ? 1 : -1), opacity: 0 }}
            transition={{ duration: 2 + Math.random(), delay: i * 0.04, ease: "linear" }}
            className="absolute w-2 h-3"
            style={{
              background: ["#fde047", "#fb7185", "#a78bfa", "#34d399", "#60a5fa", "#f97316"][i % 6],
              left: `${Math.random() * 100}%`,
              borderRadius: "2px",
            }}
          />
        ))}
      </div>

      <div
        className="px-6 pt-6 pb-5 text-center text-primary-foreground"
        style={{
          background: outcome.isMilestone
            ? "linear-gradient(135deg, #ca8a04, #fbbf24, #f59e0b)"
            : "linear-gradient(135deg, var(--primary), var(--secondary))",
        }}
      >
        <motion.div
          initial={{ scale: 0, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="text-4xl mb-2"
        >
          {outcome.isMilestone ? "🏆" : "🎉"}
        </motion.div>
        <motion.h2
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
          className="font-display text-3xl sm:text-4xl font-bold drop-shadow-md"
        >
          {outcome.isMilestone ? "PERFECT CLEAR!" : "LEVEL COMPLETE!"}
        </motion.h2>
        <p className="font-bold mt-1 opacity-90">
          {outcome.isMilestone
            ? "First time 3 stars! Incredible! ⭐⭐⭐"
            : isLast
            ? "You beat the Mouse King!"
            : `Level ${levelId} cleared!`}
        </p>
      </div>

      <div className="p-5 text-center space-y-4">
        <div className="flex justify-center">
          <StarRating stars={outcome.stars} size={44} animate />
        </div>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="bg-muted rounded-2xl p-3">
            <div className="text-xs uppercase font-bold text-muted-foreground">Time Left</div>
            <div className="font-display font-bold text-2xl">{outcome.timeRemaining.toFixed(1)}s</div>
          </div>
          <div className="bg-muted rounded-2xl p-3">
            <div className="text-xs uppercase font-bold text-muted-foreground">Score</div>
            <div className="font-display font-bold text-2xl">{outcome.score.toLocaleString()}</div>
          </div>
        </div>
        <div className="grid gap-2 pt-1">
          <motion.div whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }}>
            <Button
              size="lg"
              className="w-full font-display font-bold text-lg h-13"
              onClick={onNext}
              data-testid="button-next"
            >
              {isLast ? (
                <><Trophy className="mr-2 h-5 w-5" /> Back to Levels</>
              ) : (
                <>Next Level <ChevronRight className="ml-2 h-5 w-5" /></>
              )}
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.96 }}>
            <Button
              variant="secondary"
              className="w-full font-display font-bold"
              onClick={onRestart}
              data-testid="button-replay"
            >
              <RotateCcw className="mr-2 h-4 w-4" /> Replay Level
            </Button>
          </motion.div>
          <ShareButton score={outcome.score} />
          <Link href="/">
            <Button variant="ghost" className="w-full font-display font-bold">
              <Home className="mr-2 h-4 w-4" /> Menu
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

const LosePanel = ({
  reason,
  score,
  onRestart,
}: {
  reason: "time" | "trap";
  score: number;
  onRestart: () => void;
}) => (
  <div>
    <div className="bg-gradient-to-br from-destructive to-rose-700 px-6 pt-6 pb-5 text-center text-destructive-foreground">
      <motion.div
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 16 }}
        className="text-4xl mb-2"
      >
        {reason === "trap" ? "🪤" : "⏰"}
      </motion.div>
      <motion.div
        initial={{ rotate: 0 }}
        animate={{ rotate: [0, -8, 8, -6, 0] }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="font-display text-4xl font-bold drop-shadow-md">GAME OVER</h2>
      </motion.div>
      <p className="font-bold mt-1 opacity-90 text-sm">
        {reason === "trap" ? "You stepped in a trap! 🪤" : "Time's up — the mouse got away! 🐭"}
      </p>
    </div>
    <div className="p-5 grid gap-2">
      {score > 0 && (
        <div className="bg-muted rounded-2xl p-3 text-center mb-1">
          <div className="text-xs uppercase font-bold text-muted-foreground">Final Score</div>
          <div className="font-display font-bold text-2xl">{score.toLocaleString()}</div>
        </div>
      )}
      <motion.div whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }}>
        <Button
          size="lg"
          className="w-full font-display font-bold text-lg"
          onClick={onRestart}
          data-testid="button-retry"
        >
          <RotateCcw className="mr-2 h-5 w-5" /> Restart Level
        </Button>
      </motion.div>
      <ShareButton score={score} />
      <Link href="/levels">
        <Button variant="secondary" className="w-full font-display font-bold">
          Choose Level
        </Button>
      </Link>
      <Link href="/">
        <Button variant="ghost" className="w-full font-display font-bold">
          <Home className="mr-2 h-4 w-4" /> Quit to Menu
        </Button>
      </Link>
    </div>
  </div>
);

const HintBanner = ({ hint, levelId }: { hint: string; levelId: number }) => {
  const [show, setShow] = useState(true);
  useEffect(() => {
    setShow(true);
    const t = setTimeout(() => setShow(false), 4500);
    return () => clearTimeout(t);
  }, [levelId]);
  return (
    <div
      className="absolute bottom-3 inset-x-0 flex justify-center pointer-events-none z-10 px-4 transition-all duration-500 ease-out"
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(50px)",
      }}
    >
      <div className="bg-card/95 backdrop-blur border-2 border-primary rounded-full px-5 py-2 shadow-lg max-w-sm text-center">
        <span className="font-display font-bold text-sm">{hint}</span>
      </div>
    </div>
  );
};
