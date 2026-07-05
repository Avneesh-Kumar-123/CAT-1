import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Play as PlayIcon, RotateCcw, ChevronRight, Home, Settings as SettingsIcon, Trophy, Coins, Maximize2 } from "lucide-react";
import { useFullscreen, isFullscreenSupported } from "@/hooks/useFullscreen";
import { analytics } from "@/analytics";
import { ACHIEVEMENTS } from "@/game/achievements";
import { GameCanvas } from "@/components/GameCanvas";
import { HUD } from "@/components/HUD";
import { TutorialOverlay } from "@/components/TutorialOverlay";
import { VirtualJoystick } from "@/components/VirtualJoystick";
import { Modal } from "@/components/Modal";
import { StarRating } from "@/components/StarRating";
import { SettingsPanel } from "@/components/SettingsPanel";
import { ShareButton } from "@/components/ShareButton";
import { CountdownOverlay } from "@/components/CountdownOverlay";
import { AchievementToastQueue } from "@/components/AchievementToastQueue";
import { Button } from "@/components/ui/button";
import { LEVELS } from "@/game/levels";
import { sfx, setAudioMuted } from "@/game/audio";
import {
  recordLevelComplete,
  updateSettings,
  saveSave,
  addCoins,
  addAchievementCoins,
  progressDailyChallenge,
  getOrCreateDailyChallenge,
} from "@/game/storage";
import { checkAchievements } from "@/game/achievements";
import type { LevelRewardBreakdown } from "@/game/economy";
import type { PowerUpKind, SaveData } from "@/game/types";

type Props = {
  levelId: number;
  save: SaveData;
  onSave: (s: SaveData) => void;
};

type Outcome =
  | null
  | {
      kind: "win";
      stars: number;
      timeRemaining: number;
      score: number;
      isMilestone: boolean;
      coinsEarned: number;
      breakdown: LevelRewardBreakdown;
    }
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

  // Auto-hide HUD on mobile after 3s of inactivity
  const [hudVisible, setHudVisible] = useState(true);
  const hudTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Tutorial active → pause the game so touch events don't bleed through
  const [tutorialActive, setTutorialActive] = useState(false);

  // Achievement tracking
  const sessionWinsRef = useRef(0);
  const usedPowerUpRef = useRef(false);
  const [toastAchievements, setToastAchievements] = useState<string[]>([]);

  // Fullscreen
  const gameRootRef = useRef<HTMLDivElement>(null);
  const { isFullscreen, toggle: toggleFullscreen } = useFullscreen(gameRootRef);
  const fsSupported = isFullscreenSupported();
  const [showFsPrompt, setShowFsPrompt] = useState(false);

  // Double-tap to place cheese (joystick mode)
  const lastTapRef = useRef<number>(0);

  // Long-press to place cheese (tap mode)
  const longPressRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const longPressStartRef = useRef<{ x: number; y: number } | null>(null);

  // Drag-from-cheese-button state
  const [cheeseDragPos, setCheeseDragPos] = useState<{ x: number; y: number } | null>(null);
  const cheeseAvailableRef = useRef(true);

  const controlMode = save.settings.controlMode ?? "tap";

  // Always-fresh ref to the current save, for callbacks fired from inside GameCanvas's game loop
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  // Ensure today's daily challenge exists and fire level_start when gameplay begins
  useEffect(() => {
    onSave(getOrCreateDailyChallenge(saveRef.current));
    analytics.levelStart(level.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show fullscreen prompt once (only if supported + not already answered)
  useEffect(() => {
    if (!fsSupported || isFullscreen) return;
    const answered = localStorage.getItem("cat-chase-fs-prompted");
    if (answered) return;
    const t = setTimeout(() => setShowFsPrompt(true), 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFsPromptEnter = () => {
    localStorage.setItem("cat-chase-fs-prompted", "yes");
    setShowFsPrompt(false);
    toggleFullscreen();
    sfx.click();
  };

  const handleFsPromptLater = () => {
    localStorage.setItem("cat-chase-fs-prompted", "later");
    setShowFsPrompt(false);
    sfx.click();
  };

  // Live coin pop animations flying toward the HUD coin counter
  const [coinPops, setCoinPops] = useState<{ id: number; amount: number }[]>([]);
  const [coinPulseKey, setCoinPulseKey] = useState(0);
  const coinPopIdRef = useRef(0);
  const cheeseUsedTrackedRef = useRef(false);

  const handleMouseCoins = useCallback((amount: number) => {
    const withCoins = addCoins(saveRef.current, amount);
    const withProgress = progressDailyChallenge(withCoins, "catch_mice", 1);
    onSave(withProgress);
    analytics.coinsEarned(amount, "mouse_catch");
    const id = coinPopIdRef.current++;
    setCoinPops((p) => [...p, { id, amount }]);
    setCoinPulseKey((k) => k + 1);
    setTimeout(() => setCoinPops((p) => p.filter((c) => c.id !== id)), 900);
  }, []);

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
    (timeRemaining: number, score: number, tookDamage: boolean) => {
      const stars = computeStars(timeRemaining, level.time);
      const prevBestStars = save.levels[level.id]?.bestStars ?? 0;
      const isMilestone = stars === 3 && prevBestStars < 3;

      sfx.win();
      clearTimeout(catchFlashTimer.current);
      setCatchFlash(true);
      catchFlashTimer.current = setTimeout(() => setCatchFlash(false), 350);

      const prev = saveRef.current;
      const { data: recorded, breakdown } = recordLevelComplete(
        prev,
        level.id,
        stars,
        timeRemaining,
        score,
        hud.miceTotal,
        tookDamage,
      );
      let updated = progressDailyChallenge(recorded, "finish_levels", 1);
      if (!tookDamage) updated = progressDailyChallenge(updated, "no_damage_clear", 1);

      sessionWinsRef.current += 1;
      const newAchIds = checkAchievements(prev, updated, {
        timeRemaining,
        totalTime: level.time,
        sessionWins: sessionWinsRef.current,
        usedPowerUp: usedPowerUpRef.current,
      });
      if (newAchIds.length > 0) {
        const withAchs = addAchievementCoins(
          { ...updated, earnedAchievements: [...(updated.earnedAchievements ?? []), ...newAchIds] },
          newAchIds,
        );
        saveSave(withAchs);
        onSave(withAchs);
        setToastAchievements(newAchIds);
        newAchIds.forEach((id) => {
          const ach = ACHIEVEMENTS.find((a) => a.id === id);
          analytics.achievementUnlocked(ach?.title ?? id);
        });
        updated = withAchs;
      } else {
        onSave(updated);
      }

      const coinsEarned = updated.coins - (prev.coins ?? 0);
      analytics.levelComplete(level.id, stars, score, coinsEarned);
      if (coinsEarned > 0) analytics.coinsEarned(coinsEarned, "level_complete");

      if (isMilestone) {
        setShowMilestone(true);
        milestoneTimer.current = setTimeout(() => {
          setShowMilestone(false);
          setOutcome({ kind: "win", stars, timeRemaining, score, isMilestone: true, coinsEarned, breakdown });
        }, 2200);
      } else {
        setOutcome({ kind: "win", stars, timeRemaining, score, isMilestone: false, coinsEarned, breakdown });
      }
    },
    [level, save, onSave],
  );

  const handleTimeUp = useCallback((score: number) => {
    analytics.levelFailed(level.id);
    setOutcome({ kind: "lose", reason: "time", score });
  }, [level.id]);

  const handleTrap = useCallback(() => {
    analytics.levelFailed(level.id);
    setOutcome({ kind: "lose", reason: "trap", score: 0 });
  }, [level.id]);

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
    cheeseUsedTrackedRef.current = false;
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
    const newSound = !save.settings.sound;
    setAudioMuted(!newSound);
    if (newSound) sfx.click();
    onSave(updateSettings(save, { sound: newSound }));
  };

  const catSkin = save.settings.catSkin ?? "orange";

  const effectivelyPaused = isCountingDown || paused || outcome !== null || showMilestone || tutorialActive;

  // Keep a ref so the cheese-drag document listener can read the latest value
  const effectivelyPausedRef = useRef(effectivelyPaused);
  useEffect(() => { effectivelyPausedRef.current = effectivelyPaused; }, [effectivelyPaused]);

  // Reset HUD visibility timer on any interaction (auto-hide after 3s on mobile)
  const resetHudTimer = useCallback(() => {
    setHudVisible(true);
    clearTimeout(hudTimerRef.current);
    hudTimerRef.current = setTimeout(() => setHudVisible(false), 3000);
  }, []);

  // Start a drag from the cheese button — tracks finger via document listeners
  const startCheeseDrag = useCallback((startX: number, startY: number, touchId: number) => {
    if (!cheeseAvailableRef.current || effectivelyPausedRef.current) return;
    setCheeseDragPos({ x: startX, y: startY });
    let dragged = false;

    const onMove = (ev: TouchEvent) => {
      for (const t of Array.from(ev.changedTouches)) {
        if (t.identifier === touchId) {
          setCheeseDragPos({ x: t.clientX, y: t.clientY });
          if (Math.hypot(t.clientX - startX, t.clientY - startY) > 12) dragged = true;
        }
      }
    };

    const onEnd = (ev: TouchEvent) => {
      for (const t of Array.from(ev.changedTouches)) {
        if (t.identifier === touchId) {
          if (dragged) {
            cheesePlaceRef.current = { x: t.clientX, y: t.clientY };
            sfx.click();
          }
          setCheeseDragPos(null);
          document.removeEventListener("touchmove", onMove);
          document.removeEventListener("touchend", onEnd);
          document.removeEventListener("touchcancel", onEnd);
          break;
        }
      }
    };

    document.addEventListener("touchmove", onMove, { passive: true });
    document.addEventListener("touchend", onEnd);
    document.addEventListener("touchcancel", onEnd);
  }, []);

  // Hold-and-drag touch handlers — cover the entire screen in tap mode
  const handleTouchMove = (e: React.TouchEvent) => {
    resetHudTimer();
    if (effectivelyPaused) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, [role="button"]')) return;
    if (controlMode !== "tap") return;
    e.preventDefault();
    const t = e.changedTouches[0];
    if (!t) return;
    // Cancel long-press if finger moved significantly
    if (longPressStartRef.current) {
      const dx = t.clientX - longPressStartRef.current.x;
      const dy = t.clientY - longPressStartRef.current.y;
      if (Math.hypot(dx, dy) > 12) {
        clearTimeout(longPressRef.current);
        longPressStartRef.current = null;
      }
    }
    tapTargetRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    resetHudTimer();
    if (effectivelyPaused) return;
    // Let button/link touches through so onClick still fires on mobile
    const target = e.target as HTMLElement;
    if (target.closest('button, a, [role="button"]')) return;
    e.preventDefault();
    const t = e.changedTouches[0];
    if (!t) return;

    // Placing bait mode — any tap places it
    if (placingBait) {
      cheesePlaceRef.current = { x: t.clientX, y: t.clientY };
      setPlacingBait(false);
      return;
    }

    if (controlMode !== "tap") {
      // Joystick mode: double-tap anywhere to place cheese
      if (cheeseAvailableRef.current) {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          cheesePlaceRef.current = { x: t.clientX, y: t.clientY };
          sfx.click();
          lastTapRef.current = 0;
          return;
        }
        lastTapRef.current = now;
      }
      return;
    }

    // Tap mode: start movement + long-press-to-cheese timer
    tapTargetRef.current = { x: t.clientX, y: t.clientY };
    if (cheeseAvailableRef.current) {
      longPressStartRef.current = { x: t.clientX, y: t.clientY };
      longPressRef.current = setTimeout(() => {
        if (longPressStartRef.current) {
          cheesePlaceRef.current = { ...longPressStartRef.current };
          sfx.click();
          longPressStartRef.current = null;
        }
      }, 480);
    }
  };

  const handleGameClick = (e: React.MouseEvent) => {
    if (!placingBait || effectivelyPaused) return;
    cheesePlaceRef.current = { x: e.clientX, y: e.clientY };
    setPlacingBait(false);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    clearTimeout(longPressRef.current);
    longPressStartRef.current = null;
    if (controlMode !== "tap") return;
    e.preventDefault();
    // All fingers lifted — stop the cat
    if (e.touches.length === 0) tapTargetRef.current = null;
  };

  return (
    <div
      ref={gameRootRef}
      className={`flex flex-col w-full overflow-hidden${placingBait ? " cursor-crosshair" : ""}`}
      style={{ height: "100dvh", background: level.theme.bgGradient[1], overscrollBehavior: "none" }}
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
            equippedHat={save.settings.equippedHat}
            equippedTrail={save.settings.equippedTrail}
            equippedPaw={save.settings.equippedPaw}
            controlMode={controlMode}
            tapTargetRef={tapTargetRef}
            cheesePlaceRef={cheesePlaceRef}
            onCatch={handleCatch}
            onTimeUp={handleTimeUp}
            onTrap={handleTrap}
            onMouseCoins={handleMouseCoins}
            onState={(s) => {
              if (cheeseAvailableRef.current && !s.cheeseAvailable && !cheeseUsedTrackedRef.current) {
                cheeseUsedTrackedRef.current = true;
                const withCheese: SaveData = { ...saveRef.current, cheeseUsedTotal: (saveRef.current.cheeseUsedTotal ?? 0) + 1 };
                onSave(progressDailyChallenge(withCheese, "collect_cheese", 1));
              }
              cheeseAvailableRef.current = s.cheeseAvailable;
              if (s.activePower) usedPowerUpRef.current = true;
              setHud(s);
            }}
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

        {/* HUD — auto-hides on mobile after 3s; always visible on desktop */}
        <div
          className="transition-opacity duration-700 md:!opacity-100 md:!pointer-events-auto"
          style={{ opacity: hudVisible ? 1 : 0, pointerEvents: hudVisible ? undefined : "none" }}
        >
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
            coins={save.coins ?? 0}
            coinPops={coinPops}
            coinPulseKey={coinPulseKey}
            onPause={() => {
              sfx.click();
              setPaused(true);
            }}
            onToggleSound={toggleSound}
            isFullscreen={isFullscreen}
            fullscreenSupported={fsSupported}
            onToggleFullscreen={toggleFullscreen}
            onDropBait={() => {
              if (hud.cheeseAvailable && !effectivelyPaused) {
                sfx.click();
                setPlacingBait((p) => !p);
              }
            }}
            onCheeseDragStart={startCheeseDrag}
          />
        </div>

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

        {/* Level 1 tutorial coach marks */}
        <TutorialOverlay
          levelId={level.id}
          controlMode={controlMode}
          onActiveChange={setTutorialActive}
        />
      </div>

      {/* Cheese drag ghost — follows finger when dragging from button */}
      {cheeseDragPos && (
        <div
          className="fixed z-[200] pointer-events-none select-none"
          style={{ left: cheeseDragPos.x, top: cheeseDragPos.y, transform: "translate(-50%, -50%)", fontSize: 40, filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))" }}
        >
          🧀
        </div>
      )}

      {/* Fixed joystick overlay — bottom-left corner, always visible, mobile only.
          Raised closer to the arena (reclaimed by the mobile camera/upward-shift tweaks)
          while staying comfortably reachable by the thumb. */}
      {controlMode !== "tap" && (
        <div
          className="md:hidden absolute z-20 pointer-events-none"
          style={{
            bottom: "max(36px, calc(env(safe-area-inset-bottom) + 28px))",
            left: 12,
          }}
        >
          <div className="pointer-events-auto">
            <VirtualJoystick onChange={(x, y) => setJoy({ x, y })} />
          </div>
        </div>
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

      {/* Achievement toasts — queued one at a time, top-center */}
      {toastAchievements.length > 0 && (
        <AchievementToastQueue
          key={toastAchievements.join(",")}
          ids={toastAchievements}
          onDone={() => setToastAchievements([])}
        />
      )}

      {/* One-time fullscreen prompt */}
      <Modal open={showFsPrompt}>
        <div className="flex flex-col items-center gap-4 p-2">
          <div className="text-4xl select-none">
            <Maximize2 className="h-10 w-10 text-primary" />
          </div>
          <h2 className="font-display text-xl font-bold text-center">
            Play in Fullscreen?
          </h2>
          <p className="text-sm text-muted-foreground text-center leading-snug max-w-xs">
            Get the full Cat Chase experience — no browser chrome, just the hunt!
          </p>
          <div className="flex gap-3 mt-1 w-full">
            <Button
              className="flex-1 font-display font-bold"
              onClick={handleFsPromptEnter}
              data-testid="button-fs-go"
            >
              Go Fullscreen
            </Button>
            <Button
              variant="ghost"
              className="flex-1 font-display"
              onClick={handleFsPromptLater}
              data-testid="button-fs-later"
            >
              Not Now
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const COUNTDOWN_TOTAL = 3;
const COUNTDOWN_DELAY = 1200;

const WinPanel = ({
  outcome,
  levelId,
  onRestart,
  onNext,
  canPlayNext,
}: {
  outcome: {
    stars: number;
    timeRemaining: number;
    score: number;
    isMilestone: boolean;
    coinsEarned: number;
    breakdown: LevelRewardBreakdown;
  };
  levelId: number;
  onRestart: () => void;
  onNext: () => void;
  canPlayNext: boolean;
}) => {
  const isLast = levelId >= LEVELS.length;
  const shouldAutoAdvance = canPlayNext && !isLast;
  const [secsLeft, setSecsLeft] = useState(COUNTDOWN_TOTAL);
  const [countdownActive, setCountdownActive] = useState(false);
  const confettiCount = outcome.isMilestone ? 48 : 28;

  // Grace delay before countdown starts
  useEffect(() => {
    if (!shouldAutoAdvance) return;
    const t = setTimeout(() => setCountdownActive(true), COUNTDOWN_DELAY);
    return () => clearTimeout(t);
  }, [shouldAutoAdvance]);

  // Tick the countdown down
  useEffect(() => {
    if (!countdownActive || !shouldAutoAdvance) return;
    if (secsLeft <= 0) { onNext(); return; }
    const t = setInterval(() => setSecsLeft(s => Math.max(0, +(s - 0.1).toFixed(1))), 100);
    return () => clearInterval(t);
  }, [countdownActive, shouldAutoAdvance, secsLeft, onNext]);

  // Any key → advance immediately
  useEffect(() => {
    if (!shouldAutoAdvance) return;
    const handler = (e: KeyboardEvent) => {
      if (["Tab", "Escape"].includes(e.key)) return;
      onNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [shouldAutoAdvance, onNext]);

  const pct = countdownActive ? secsLeft / COUNTDOWN_TOTAL : 1;

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
        className="px-6 pt-6 pb-5 text-center text-white"
        style={{
          background: outcome.isMilestone
            ? "linear-gradient(135deg, #ca8a04, #fbbf24, #f59e0b)"
            : "linear-gradient(135deg, #f97316, #a855f7)",
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
        {outcome.breakdown.total > 0 && (
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 250 }}
            className="bg-yellow-50 border-2 border-yellow-400 rounded-2xl px-4 py-3 text-left"
            data-testid="text-coins-earned"
          >
            <div className="flex items-center gap-2 mb-2 justify-center">
              <Coins className="h-5 w-5 text-yellow-500 fill-yellow-400" />
              <span className="font-display font-bold text-sm uppercase tracking-wide text-yellow-700">
                {outcome.breakdown.isReplay ? "Replay Reward" : "Rewards"}
              </span>
            </div>
            <div className="space-y-1">
              {outcome.breakdown.lines.map((line, i) => (
                <motion.div
                  key={line.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.12 }}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-yellow-900/80">{line.label}</span>
                  <span className="font-display font-bold text-yellow-700">+{line.amount}</span>
                </motion.div>
              ))}
            </div>
            <div className="border-t border-yellow-300 mt-2 pt-2 flex items-center justify-between">
              <span className="font-display font-bold text-yellow-900">Total</span>
              <motion.span
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + outcome.breakdown.lines.length * 0.12 + 0.1, type: "spring", stiffness: 300 }}
                className="font-display font-bold text-lg text-yellow-700"
              >
                +{outcome.coinsEarned}
              </motion.span>
            </div>
          </motion.div>
        )}
        <div className="grid gap-2 pt-1">
          <motion.div whileTap={{ scale: 0.96 }} whileHover={{ scale: 1.02 }}>
            <Button
              size="lg"
              className="relative w-full font-display font-bold text-lg h-13 overflow-hidden"
              onClick={onNext}
              data-testid="button-next"
            >
              {/* Countdown drain bar — fills button from left, drains right */}
              {shouldAutoAdvance && (
                <span
                  className="absolute inset-0 bg-white/20 origin-left transition-none"
                  style={{ transform: `scaleX(${pct})`, transformOrigin: "left" }}
                />
              )}
              <span className="relative flex items-center justify-center gap-1">
                {isLast ? (
                  <><Trophy className="h-5 w-5" /> Back to Levels</>
                ) : (
                  <>Next Level <ChevronRight className="h-5 w-5" /></>
                )}
                {shouldAutoAdvance && countdownActive && (
                  <span className="ml-1 opacity-75 text-sm font-normal tabular-nums">
                    {Math.ceil(secsLeft)}s
                  </span>
                )}
              </span>
            </Button>
          </motion.div>
          {shouldAutoAdvance && (
            <p className="text-center text-xs text-muted-foreground -mt-1">
              Press any key or tap to advance now
            </p>
          )}
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
}) => {
  const [secsLeft, setSecsLeft] = useState(COUNTDOWN_TOTAL);
  const [countdownActive, setCountdownActive] = useState(false);

  // Grace delay before countdown starts
  useEffect(() => {
    const t = setTimeout(() => setCountdownActive(true), COUNTDOWN_DELAY);
    return () => clearTimeout(t);
  }, []);

  // Tick down then restart
  useEffect(() => {
    if (!countdownActive) return;
    if (secsLeft <= 0) { onRestart(); return; }
    const t = setInterval(() => setSecsLeft(s => Math.max(0, +(s - 0.1).toFixed(1))), 100);
    return () => clearInterval(t);
  }, [countdownActive, secsLeft, onRestart]);

  // Any key → restart immediately
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (["Tab", "Escape"].includes(e.key)) return;
      onRestart();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onRestart]);

  const pct = countdownActive ? secsLeft / COUNTDOWN_TOTAL : 1;

  return (
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
            className="relative w-full font-display font-bold text-lg overflow-hidden"
            onClick={onRestart}
            data-testid="button-retry"
          >
            <span
              className="absolute inset-0 bg-white/20"
              style={{ transform: `scaleX(${pct})`, transformOrigin: "left" }}
            />
            <span className="relative flex items-center justify-center gap-1">
              <RotateCcw className="h-5 w-5" /> Restart Level
              {countdownActive && (
                <span className="ml-1 opacity-75 text-sm font-normal tabular-nums">
                  {Math.ceil(secsLeft)}s
                </span>
              )}
            </span>
          </Button>
        </motion.div>
        <p className="text-center text-xs text-muted-foreground -mt-1">
          Press any key or tap to restart now
        </p>
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
};

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
