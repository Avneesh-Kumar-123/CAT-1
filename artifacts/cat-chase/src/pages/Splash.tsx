import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "wouter";
import { Play, Map, BookOpen, Heart, Trophy, Medal, Timer, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MenuShell } from "@/components/MenuShell";
import { SettingsPanel } from "@/components/SettingsPanel";
import { AdBanner } from "@/components/AdBanner";
import { CatSprite, MouseSprite } from "@/game/sprites";
import { sfx } from "@/game/audio";
import { LEVELS } from "@/game/levels";
import type { SaveData } from "@/game/types";

type Props = {
  save: SaveData;
  onSave: (s: SaveData) => void;
};

export const Splash = ({ save, onSave }: Props) => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <MenuShell onSettings={() => setSettingsOpen(true)} showBack={false}>
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-10 sm:py-16">
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

        {/* Cat & mouse animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="relative h-20 sm:h-32 w-full max-w-md mb-5 sm:mb-8"
        >
          <motion.div
            className="absolute top-2"
            animate={{ x: [-20, 320, -20] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            <MouseSprite size={48} />
          </motion.div>
          <motion.div
            className="absolute top-2"
            animate={{ x: [-90, 250, -90] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            <div className="animate-wiggle">
              <CatSprite size={72} />
            </div>
          </motion.div>
          <div className="absolute bottom-0 inset-x-0 h-2 bg-gradient-to-r from-transparent via-foreground/20 to-transparent rounded-full" />
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
            <span className="font-display font-bold text-sm">Level {Math.min(save.highestUnlocked, LEVELS.length)}</span>
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
          <Link href={`/play/${Math.min(save.highestUnlocked, LEVELS.length)}`}>
            <motion.div
              animate={{ scale: [1, 1.07, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Button
                size="lg"
                className="w-full h-20 text-3xl font-display font-bold shadow-2xl game-button"
                onClick={() => sfx.click()}
                data-testid="button-play"
              >
                <Play className="mr-3 h-8 w-8 fill-current" /> PLAY
              </Button>
            </motion.div>
          </Link>

          {/* Secondary grid */}
          <div className="grid grid-cols-2 gap-2">
            <Link href="/levels">
              <Button
                variant="secondary"
                className="w-full h-14 flex-col gap-0.5 font-display font-bold shadow-sm game-button text-sm"
                onClick={() => sfx.click()}
                data-testid="button-levels"
              >
                <Map className="h-5 w-5" />
                Levels
              </Button>
            </Link>
            <Link href="/how-to-play">
              <Button
                variant="secondary"
                className="w-full h-14 flex-col gap-0.5 font-display font-bold shadow-sm game-button text-sm"
                onClick={() => sfx.click()}
                data-testid="button-how"
              >
                <BookOpen className="h-5 w-5" />
                How To
              </Button>
            </Link>
            <Link href="/time-attack">
              <Button
                variant="secondary"
                className="w-full h-14 flex-col gap-0.5 font-display font-bold shadow-sm game-button text-sm"
                onClick={() => sfx.click()}
                data-testid="button-time-attack"
              >
                <Timer className="h-5 w-5" />
                <span className="flex items-center gap-1">
                  Time Attack
                  {(save.timeAttackBest ?? 0) > 0 && (
                    <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1 py-0.5 rounded-full leading-none">
                      {save.timeAttackBest}
                    </span>
                  )}
                </span>
              </Button>
            </Link>
            <Link href="/achievements">
              <Button
                variant="secondary"
                className="w-full h-14 flex-col gap-0.5 font-display font-bold shadow-sm game-button text-sm"
                onClick={() => sfx.click()}
                data-testid="button-achievements"
              >
                <Medal className="h-5 w-5" />
                <span className="flex items-center gap-1">
                  Badges
                  {(save.earnedAchievements ?? []).length > 0 && (
                    <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1 py-0.5 rounded-full leading-none">
                      {save.earnedAchievements.length}
                    </span>
                  )}
                </span>
              </Button>
            </Link>

            <Link href="/survival" className="col-span-2">
              <Button
                variant="secondary"
                className="w-full h-14 flex-row gap-2 font-display font-bold shadow-sm game-button text-sm"
                onClick={() => sfx.click()}
                data-testid="button-survival"
              >
                <Waves className="h-5 w-5" />
                <span className="flex items-center gap-1.5">
                  Survival
                  {(save.survivalBest ?? 0) > 0 && (
                    <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                      W{save.survivalBest}
                    </span>
                  )}
                </span>
              </Button>
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

        <div className="mt-6 mb-2 flex flex-col items-center gap-1.5 text-xs text-foreground/60 font-bold px-4">
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <Link href="/about" className="hover:text-foreground transition-colors" data-testid="link-about">
              About Us
            </Link>
            <span className="opacity-40">·</span>
            <Link href="/contact" className="hover:text-foreground transition-colors" data-testid="link-contact">
              Contact Us
            </Link>
            <span className="opacity-40">·</span>
            <Link href="/privacy" className="hover:text-foreground transition-colors" data-testid="link-privacy">
              Privacy Policy
            </Link>
          </div>
          <p className="opacity-70">v1.0 · Made with paws and pixels</p>
        </div>
      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        save={save}
        onSave={onSave}
      />
    </MenuShell>
  );
};
