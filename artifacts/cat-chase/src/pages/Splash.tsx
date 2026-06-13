import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Link } from "wouter";
import { Play, Map, BookOpen, Heart, Trophy, Medal, Timer, Waves, Gamepad2, X, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MenuShell } from "@/components/MenuShell";
import { SettingsPanel } from "@/components/SettingsPanel";
import { AdBanner } from "@/components/AdBanner";
import { CatSprite, MouseSprite } from "@/game/sprites";
import { sfx } from "@/game/audio";
import { LEVELS } from "@/game/levels";
import { ACHIEVEMENTS } from "@/game/achievements";
import type { SaveData } from "@/game/types";

type Props = {
  save: SaveData;
  onSave: (s: SaveData) => void;
};

const WORLDS = [
  { name: "Sunny Fields",  emoji: "🌻", color: "#fef3c7", accent: "#f59e0b", from: 1,  to: 10 },
  { name: "Mystic Forest", emoji: "🌲", color: "#d1fae5", accent: "#10b981", from: 11, to: 20 },
  { name: "Sky Kingdom",   emoji: "☁️", color: "#dbeafe", accent: "#3b82f6", from: 21, to: 30 },
];

const DECO_EMOJIS = [
  { emoji: "🧀", top: "12%",  left: "3%",  size: 28, opacity: 0.55 },
  { emoji: "⭐", top: "28%",  left: "8%",  size: 22, opacity: 0.45 },
  { emoji: "🐾", top: "48%",  left: "4%",  size: 20, opacity: 0.40 },
  { emoji: "🧀", top: "66%",  left: "9%",  size: 26, opacity: 0.50 },
  { emoji: "⭐", top: "82%",  left: "3%",  size: 22, opacity: 0.40 },
  { emoji: "🧀", top: "10%",  right: "3%", size: 28, opacity: 0.55 },
  { emoji: "⭐", top: "26%",  right: "7%", size: 22, opacity: 0.45 },
  { emoji: "🐾", top: "46%",  right: "4%", size: 20, opacity: 0.40 },
  { emoji: "🧀", top: "64%",  right: "8%", size: 26, opacity: 0.50 },
  { emoji: "⭐", top: "80%",  right: "3%", size: 22, opacity: 0.40 },
];

export const Splash = ({ save, onSave }: Props) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [modesOpen, setModesOpen] = useState(false);

  const currentLevel = Math.min(save.highestUnlocked, LEVELS.length);
  const earned = save.earnedAchievements ?? [];
  const totalStars = Object.values(save.levels ?? {}).reduce(
    (sum, lp) => sum + (lp.bestStars ?? 0), 0
  );

  const recentBadges = earned
    .slice(-3)
    .reverse()
    .map((id) => ACHIEVEMENTS.find((a) => a.id === id))
    .filter(Boolean) as typeof ACHIEVEMENTS;

  function worldProgress(w: typeof WORLDS[0]) {
    const done = Math.min(Math.max(0, (save.highestUnlocked ?? 1) - (w.from - 1)), 10);
    return done;
  }

  return (
    <MenuShell onSettings={() => setSettingsOpen(true)} showBack={false}>

      {/* Extra themed decorations (desktop sides) — pointer-events-none, z-0 */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none hidden lg:block">
        {DECO_EMOJIS.map((d, i) => (
          <motion.div
            key={i}
            className="absolute select-none"
            style={{
              fontSize: d.size,
              top: d.top,
              left: (d as any).left,
              right: (d as any).right,
              opacity: d.opacity,
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.10))",
            }}
            animate={{ y: [0, -12, 0] }}
            transition={{ duration: 5 + i * 0.7, repeat: Infinity, ease: "easeInOut", delay: i * 0.4 }}
          >
            {d.emoji}
          </motion.div>
        ))}
      </div>

      {/* ── 3-column grid (desktop) / single column (mobile) ── */}
      <div className="relative z-10 min-h-screen grid grid-cols-1 lg:grid-cols-[300px_1fr_300px] items-center px-2 lg:px-6 pt-16 pb-4">

        {/* ════════════════════════ LEFT PANEL (lg+) ════════════════════════ */}
        <motion.div
          className="hidden lg:flex flex-col gap-4 py-8"
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
        >
          {/* Player stats */}
          <div className="bg-card/80 backdrop-blur border-2 border-card-border rounded-3xl p-5 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-2xl shadow-inner">
                🐱
              </div>
              <div>
                <div className="font-display font-bold text-base leading-tight">Your Stats</div>
                <div className="text-xs text-muted-foreground font-semibold">
                  {currentLevel >= LEVELS.length ? "Champion!" : "Keep it up!"}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Level",   value: String(currentLevel),  icon: <Trophy className="h-3.5 w-3.5 text-primary" /> },
                { label: "Caught",  value: String(save.totalCaught ?? 0), icon: <Heart className="h-3.5 w-3.5 text-destructive" /> },
                { label: "Stars",   value: String(totalStars),            icon: <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" /> },
                { label: "Badges",  value: String(earned.length),         icon: <Medal className="h-3.5 w-3.5 text-secondary" /> },
              ].map((s) => (
                <div key={s.label} className="bg-background/60 rounded-xl px-3 py-2 text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">{s.icon}</div>
                  <div className="font-display font-bold text-xl leading-none">{s.value}</div>
                  <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Overall progress */}
          {(() => {
            const completed = Math.max(0, (save.highestUnlocked ?? 1) - 1);
            const pct = Math.round((completed / LEVELS.length) * 100);
            const maxStars = LEVELS.length * 3;
            return (
              <div className="bg-card/80 backdrop-blur border-2 border-card-border rounded-3xl p-5 shadow-lg">
                <div className="font-display font-bold text-xs uppercase tracking-widest text-primary mb-3">
                  Overall Progress
                </div>
                <div className="flex items-end gap-3 mb-3">
                  <motion.div
                    className="font-display font-bold leading-none"
                    style={{ fontSize: 48 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <span className="text-primary">{pct}</span>
                    <span className="text-2xl text-muted-foreground">%</span>
                  </motion.div>
                  <div className="pb-1 text-xs text-muted-foreground font-semibold leading-snug">
                    <div>{completed} / {LEVELS.length} levels</div>
                    <div>⭐ {totalStars} / {maxStars} stars</div>
                  </div>
                </div>
                {/* Bar */}
                <div className="w-full bg-foreground/10 rounded-full h-3 overflow-hidden">
                  <motion.div
                    className="h-3 rounded-full"
                    style={{ background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.7, duration: 1, ease: "easeOut" }}
                  />
                </div>
                {pct === 100 && (
                  <div className="mt-2 text-center text-xs font-bold text-primary">
                    🏆 Champion! All levels complete!
                  </div>
                )}
                {pct === 0 && (
                  <div className="mt-2 text-center text-xs font-bold text-muted-foreground">
                    Start playing to track your progress!
                  </div>
                )}
              </div>
            );
          })()}

          {/* World progress */}
          <div className="bg-card/80 backdrop-blur border-2 border-card-border rounded-3xl p-5 shadow-lg">
            <div className="font-display font-bold text-xs uppercase tracking-widest text-secondary mb-3">
              World Progress
            </div>
            <div className="flex flex-col gap-3">
              {WORLDS.map((w) => {
                const done = worldProgress(w);
                const isUnlocked = (save.highestUnlocked ?? 1) >= w.from;
                return (
                  <div key={w.name} className="flex items-center gap-3" style={{ opacity: isUnlocked ? 1 : 0.5 }}>
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm flex-shrink-0"
                      style={{ background: w.color, border: `2px solid ${w.accent}` }}
                    >
                      {isUnlocked ? w.emoji : "🔒"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold text-xs mb-1 truncate">{w.name}</div>
                      <div className="w-full bg-foreground/10 rounded-full h-2">
                        <motion.div
                          className="h-2 rounded-full"
                          style={{ background: w.accent }}
                          initial={{ width: 0 }}
                          animate={{ width: `${(done / 10) * 100}%` }}
                          transition={{ delay: 0.6, duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                    <div className="text-[10px] font-bold text-muted-foreground flex-shrink-0">{done}/10</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent badges */}
          {recentBadges.length > 0 && (
            <div className="bg-card/80 backdrop-blur border-2 border-card-border rounded-3xl p-4 shadow-lg">
              <div className="font-display font-bold text-xs uppercase tracking-widest text-yellow-600 mb-3">
                Recent Badges
              </div>
              <div className="flex flex-col gap-1.5">
                {recentBadges.map((a) => (
                  <div key={a.id} className="flex items-center gap-3 py-1">
                    <div className="w-9 h-9 rounded-xl bg-yellow-50 border-2 border-yellow-200 flex items-center justify-center text-lg flex-shrink-0">
                      🏅
                    </div>
                    <div className="min-w-0">
                      <div className="font-display font-bold text-xs truncate">{a.title}</div>
                      <div className="text-[10px] text-muted-foreground font-semibold truncate">{a.description}</div>
                    </div>
                    <span className="text-yellow-500 font-bold flex-shrink-0 text-sm">✓</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state — prompt to play */}
          {recentBadges.length === 0 && (
            <div className="bg-card/80 backdrop-blur border-2 border-card-border rounded-3xl p-4 shadow-lg text-center">
              <div className="text-2xl mb-1">🏅</div>
              <div className="font-display font-bold text-xs text-muted-foreground">
                Play to earn your first badge!
              </div>
              <div className="text-[10px] text-muted-foreground mt-0.5">24 achievements waiting</div>
            </div>
          )}
        </motion.div>

        {/* ════════════════════════ CENTER (all viewports) ════════════════════════ */}
        <div className="flex flex-col items-center justify-center py-8 px-4">
          {/* Title */}
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 120 }}
            className="text-center mb-5 sm:mb-8"
          >
            <div className="inline-block bg-card/80 backdrop-blur border-4 border-primary rounded-3xl px-4 py-2 sm:px-6 sm:py-3 mb-3 sm:mb-4 shadow-lg rotate-[-2deg]">
              <span className="font-display font-bold text-xs sm:text-sm uppercase tracking-widest text-primary">
                An Arcade Adventure
              </span>
            </div>
            <h1 className="font-display font-bold text-5xl sm:text-8xl leading-none">
              <span className="text-primary drop-shadow-[3px_3px_0_hsl(var(--secondary))]">CAT</span>
              <span className="text-foreground"> CHASE</span>
            </h1>
            <p className="mt-1 sm:mt-2 font-display font-bold text-xl sm:text-3xl text-secondary">
              Mouse Hunt
            </p>
            <p className="mt-2 sm:mt-3 max-w-xs mx-auto leading-snug text-center">
              <span className="block font-display font-bold text-base sm:text-2xl text-primary">
                Chase mice. Beat levels.
              </span>
              <span className="block font-display font-bold text-base sm:text-2xl text-secondary">
                Unlock achievements.
              </span>
              <span className="block text-xs sm:text-sm text-muted-foreground font-semibold mt-1.5 sm:mt-2">
                30 levels · 3 worlds · 24 achievements
              </span>
              <span className="inline-flex items-center gap-1.5 mt-1.5 sm:mt-2 bg-green-100 text-green-700 text-xs font-bold px-3 py-1 rounded-full">
                ✅ Free · No download · No login
              </span>
            </p>
          </motion.div>

          {/* Cat & mouse animation — larger + paw-print trail */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="relative h-32 sm:h-40 w-full max-w-lg mb-5 sm:mb-8 overflow-hidden"
          >
            {/* Cheese bait at the right edge — what the mouse is racing toward */}
            <motion.span
              className="absolute right-4 top-3 text-3xl select-none pointer-events-none"
              animate={{ rotate: [-8, 8, -8], y: [0, -4, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              🧀
            </motion.span>

            {/* Paw-print trail — each synced to when the cat passes that spot */}
            {/* Cat center reaches xPos at time (xPos + 42) / 85 s (340 px / 4 s = 85 px/s) */}
            {[10, 65, 120, 175, 230].map((xPos) => (
              <motion.span
                key={xPos}
                className="absolute bottom-8 text-base select-none pointer-events-none"
                style={{ left: xPos }}
                animate={{ opacity: [0, 0.65, 0], scale: [0.3, 1, 0.7], y: [4, 0, 2] }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  repeatDelay: 2.8,          // 1.2 + 2.8 = 4 s total, stays in sync
                  delay: (xPos + 42) / 85,   // initial offset so paw appears right as cat passes
                  ease: "easeOut",
                }}
              >
                🐾
              </motion.span>
            ))}

            {/* Mouse — slightly ahead, bigger */}
            <motion.div
              className="absolute top-1"
              animate={{ x: [-10, 290, -10] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              <MouseSprite size={68} />
            </motion.div>

            {/* Cat — bigger, wiggling */}
            <motion.div
              className="absolute top-0"
              animate={{ x: [-100, 210, -100] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            >
              <div className="animate-wiggle">
                <CatSprite size={100} />
              </div>
            </motion.div>

            {/* Ground shadow */}
            <div className="absolute bottom-4 inset-x-0 h-2 bg-gradient-to-r from-transparent via-foreground/20 to-transparent rounded-full" />
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex gap-2 sm:gap-3 mb-5 sm:mb-8"
          >
            <div className="bg-card/80 backdrop-blur border-2 border-card-border rounded-2xl px-4 py-2 text-center shadow-md">
              <Trophy className="inline h-4 w-4 text-primary mr-1" />
              <span className="font-display font-bold text-sm">Level {currentLevel}</span>
            </div>
            <div className="bg-card/80 backdrop-blur border-2 border-card-border rounded-2xl px-4 py-2 text-center shadow-md">
              <Heart className="inline h-4 w-4 text-destructive mr-1" />
              <span className="font-display font-bold text-sm">{save.totalCaught} caught</span>
            </div>
          </motion.div>

          {/* Buttons */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="w-full max-w-xs flex flex-col gap-4"
          >
            {/* PLAY — hero button */}
            <Link href={`/play/${currentLevel}`}>
              <motion.div
                animate={{ scale: [1, 1.07, 1] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Button
                  size="lg"
                  className="w-full h-20 text-3xl font-display font-bold shadow-2xl game-button"
                  style={{ boxShadow: "0 8px 32px rgba(249,115,22,0.40)" }}
                  onClick={() => sfx.click()}
                  data-testid="button-play"
                >
                  <Play className="mr-3 h-8 w-8 fill-current" /> PLAY
                </Button>
              </motion.div>
            </Link>

            {/* Secondary grid — purple card style matching canvas mockup */}
            <div className="grid grid-cols-2 gap-2.5">
              <Link href="/levels" onClick={() => sfx.click()}>
                <motion.div
                  whileTap={{ scale: 0.93 }}
                  data-testid="button-levels"
                  className="h-16 flex flex-col items-center justify-center gap-1 bg-violet-100 border-2 border-violet-200 rounded-2xl shadow-sm cursor-pointer hover:bg-violet-200 transition-colors select-none"
                >
                  <span className="text-2xl leading-none">🗺️</span>
                  <span className="font-display font-bold text-xs text-violet-700">Levels</span>
                </motion.div>
              </Link>
              <Link href="/how-to-play" onClick={() => sfx.click()}>
                <motion.div
                  whileTap={{ scale: 0.93 }}
                  data-testid="button-how"
                  className="h-16 flex flex-col items-center justify-center gap-1 bg-violet-100 border-2 border-violet-200 rounded-2xl shadow-sm cursor-pointer hover:bg-violet-200 transition-colors select-none"
                >
                  <span className="text-2xl leading-none">📖</span>
                  <span className="font-display font-bold text-xs text-violet-700">How to Play</span>
                </motion.div>
              </Link>
              <motion.button
                whileTap={{ scale: 0.93 }}
                data-testid="button-modes"
                onClick={() => { sfx.click(); setModesOpen(true); }}
                className="h-16 flex flex-col items-center justify-center gap-1 bg-violet-100 border-2 border-violet-200 rounded-2xl shadow-sm cursor-pointer hover:bg-violet-200 transition-colors select-none"
              >
                <span className="text-2xl leading-none">🎮</span>
                <span className="font-display font-bold text-xs text-violet-700">Modes</span>
              </motion.button>
              <Link href="/achievements" onClick={() => sfx.click()}>
                <motion.div
                  whileTap={{ scale: 0.93 }}
                  data-testid="button-achievements"
                  className="relative h-16 flex flex-col items-center justify-center gap-1 bg-violet-100 border-2 border-violet-200 rounded-2xl shadow-sm cursor-pointer hover:bg-violet-200 transition-colors select-none"
                >
                  <span className="text-2xl leading-none">🏅</span>
                  <span className="font-display font-bold text-xs text-violet-700 flex items-center gap-1">
                    Badges
                    {earned.length > 0 && (
                      <span className="bg-primary text-primary-foreground text-[10px] font-black rounded-full w-4 h-4 flex items-center justify-center leading-none">
                        {earned.length}
                      </span>
                    )}
                  </span>
                </motion.div>
              </Link>
            </div>

            <Link href="/credits">
              <Button
                variant="ghost"
                className="w-full font-display font-bold opacity-60 hover:opacity-100 text-sm"
                onClick={() => sfx.click()}
                data-testid="button-credits"
              >
                Credits
              </Button>
            </Link>
          </motion.div>

          <div className="w-full max-w-md mt-6">
            <AdBanner slot="1234567890" />
          </div>

          <div className="mt-6 mb-2 flex flex-col items-center gap-2.5 px-4">
            <div className="w-full max-w-xs h-px bg-foreground/10 rounded-full" />
            <div className="flex items-center gap-2 flex-wrap justify-center">
              {[
                { href: "/about",   icon: "👋", label: "About Us",       testId: "link-about" },
                { href: "/contact", icon: "💬", label: "Contact Us",      testId: "link-contact" },
                { href: "/privacy", icon: "🔒", label: "Privacy Policy",  testId: "link-privacy" },
              ].map((l) => (
                <Link key={l.href} href={l.href} data-testid={l.testId}>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-foreground/5 hover:bg-foreground/10 border border-foreground/10 text-[11px] font-bold text-foreground/55 hover:text-foreground/80 transition-all cursor-pointer">
                    <span className="text-sm leading-none">{l.icon}</span>
                    {l.label}
                  </span>
                </Link>
              ))}
            </div>
            <p className="text-[11px] text-foreground/45 font-semibold">v1.0 · Made with paws and pixels 🐾</p>
          </div>
        </div>

        {/* ════════════════════════ RIGHT PANEL (lg+) ════════════════════════ */}
        <motion.div
          className="hidden lg:flex flex-col gap-4 py-8"
          initial={{ x: 40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
        >
          {/* World cards */}
          <div className="bg-card/80 backdrop-blur border-2 border-card-border rounded-3xl p-5 shadow-lg">
            <div className="font-display font-bold text-xs uppercase tracking-widest text-primary mb-3">
              Worlds
            </div>
            <div className="flex flex-col gap-2">
              {WORLDS.map((w, i) => {
                const isUnlocked = (save.highestUnlocked ?? 1) >= w.from;
                const isActive = (save.highestUnlocked ?? 1) >= w.from && (save.highestUnlocked ?? 1) <= w.to;
                return (
                  <div
                    key={w.name}
                    className="relative rounded-2xl p-3 flex items-center gap-3 transition-all"
                    style={{
                      background: w.color,
                      border: `2px solid ${w.accent}`,
                      opacity: isUnlocked ? 1 : 0.55,
                    }}
                  >
                    <div className="text-2xl">{isUnlocked ? w.emoji : "🔒"}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-bold text-sm truncate">{w.name}</div>
                      <div className="text-[11px] font-bold" style={{ color: w.accent }}>
                        Levels {w.from}–{w.to}
                      </div>
                    </div>
                    {isActive && (
                      <div className="flex-shrink-0 bg-green-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                        ACTIVE
                      </div>
                    )}
                    {!isUnlocked && (
                      <div className="absolute right-3 top-3 text-base opacity-60">🔒</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pro tip */}
          <div className="bg-card/80 backdrop-blur border-2 border-card-border rounded-3xl p-5 shadow-lg">
            <div className="font-display font-bold text-xs uppercase tracking-widest text-green-600 mb-2">
              💡 Pro Tip
            </div>
            <p className="text-sm text-muted-foreground font-semibold leading-snug">
              Drop <strong>cheese bait</strong> to lure mice to one spot — then pounce for an easy catch!
            </p>
          </div>

          {/* Special modes teaser — clicking opens the modes modal */}
          <div className="bg-card/80 backdrop-blur border-2 border-card-border rounded-3xl p-5 shadow-lg">
            <div className="font-display font-bold text-xs uppercase tracking-widest text-destructive mb-3">
              🔥 Special Modes
            </div>
            <div className="flex flex-col gap-2">
              <Link href="/time-attack" onClick={() => sfx.click()}>
                <div className="flex items-center gap-3 bg-primary/5 hover:bg-primary/10 transition-colors rounded-xl px-3 py-2.5 cursor-pointer border border-primary/10">
                  <div className="bg-primary/20 rounded-xl p-1.5 flex-shrink-0">
                    <Timer className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-sm flex items-center gap-1.5">
                      Time Attack
                      {(save.timeAttackBest ?? 0) > 0 && (
                        <span className="bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                          {save.timeAttackBest}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-semibold">60s · Catch as many as you can</div>
                  </div>
                </div>
              </Link>
              <Link href="/survival" onClick={() => sfx.click()}>
                <div className="flex items-center gap-3 bg-secondary/10 hover:bg-secondary/20 transition-colors rounded-xl px-3 py-2.5 cursor-pointer border border-secondary/10">
                  <div className="bg-secondary/30 rounded-xl p-1.5 flex-shrink-0">
                    <Waves className="h-5 w-5 text-secondary-foreground" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-sm flex items-center gap-1.5">
                      Survival
                      {(save.survivalBest ?? 0) > 0 && (
                        <span className="bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                          W{save.survivalBest}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-semibold">Survive endless waves</div>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Overlays — completely unchanged ── */}
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        save={save}
        onSave={onSave}
      />

      <AnimatePresence>
        {modesOpen && (
          <>
            <motion.div
              key="modes-backdrop"
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setModesOpen(false)}
            />
            <motion.div
              key="modes-panel"
              className="fixed z-50 bottom-0 inset-x-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-80"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="bg-card border-4 border-primary rounded-t-3xl sm:rounded-3xl shadow-2xl px-6 pt-6 pb-10 sm:pb-6">
                <div className="w-10 h-1.5 bg-foreground/20 rounded-full mx-auto mb-5 sm:hidden" />
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2">
                    <Gamepad2 className="h-6 w-6 text-primary" />
                    <h2 className="font-display font-bold text-2xl">Game Modes</h2>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-full h-9 w-9 opacity-60 hover:opacity-100"
                    onClick={() => setModesOpen(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="flex flex-col gap-3">
                  <Link href="/time-attack" onClick={() => { sfx.click(); setModesOpen(false); }}>
                    <motion.div whileTap={{ scale: 0.97 }}>
                      <Button
                        variant="secondary"
                        className="w-full h-16 justify-start gap-4 font-display font-bold shadow-sm game-button text-base"
                        data-testid="button-time-attack"
                      >
                        <div className="bg-primary/20 rounded-xl p-2">
                          <Timer className="h-6 w-6 text-primary" />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            Time Attack
                            {(save.timeAttackBest ?? 0) > 0 && (
                              <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                {save.timeAttackBest}
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-normal text-muted-foreground">Catch as many as you can</div>
                        </div>
                      </Button>
                    </motion.div>
                  </Link>
                  <Link href="/survival" onClick={() => { sfx.click(); setModesOpen(false); }}>
                    <motion.div whileTap={{ scale: 0.97 }}>
                      <Button
                        variant="secondary"
                        className="w-full h-16 justify-start gap-4 font-display font-bold shadow-sm game-button text-base"
                        data-testid="button-survival"
                      >
                        <div className="bg-secondary/40 rounded-xl p-2">
                          <Waves className="h-6 w-6 text-secondary-foreground" />
                        </div>
                        <div className="text-left">
                          <div className="flex items-center gap-2">
                            Survival
                            {(save.survivalBest ?? 0) > 0 && (
                              <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                                W{save.survivalBest}
                              </span>
                            )}
                          </div>
                          <div className="text-xs font-normal text-muted-foreground">Survive endless waves</div>
                        </div>
                      </Button>
                    </motion.div>
                  </Link>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </MenuShell>
  );
};
