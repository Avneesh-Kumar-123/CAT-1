import { motion } from "framer-motion";
import { useState } from "react";
import { Link } from "wouter";
import { Play, Map, BookOpen, Heart, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MenuShell } from "@/components/MenuShell";
import { SettingsPanel } from "@/components/SettingsPanel";
import { AdBanner } from "@/components/AdBanner";
import { CatSprite, MouseSprite } from "@/game/sprites";
import { sfx } from "@/game/audio";
import type { SaveData } from "@/game/types";

type Props = {
  save: SaveData;
  onSave: (s: SaveData) => void;
};

export const Splash = ({ save, onSave }: Props) => {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <MenuShell onSettings={() => setSettingsOpen(true)} showBack={false}>
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-16">
        {/* Title */}
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 120 }}
          className="text-center mb-8"
        >
          <div className="inline-block bg-card/80 backdrop-blur border-4 border-primary rounded-3xl px-6 py-3 mb-4 shadow-lg rotate-[-2deg]">
            <span className="font-display font-bold text-sm uppercase tracking-widest text-primary">
              An Arcade Adventure
            </span>
          </div>
          <h1 className="font-display font-bold text-6xl sm:text-8xl leading-none">
            <span className="text-primary drop-shadow-[3px_3px_0_hsl(var(--secondary))]">CAT</span>
            <span className="text-foreground"> CHASE</span>
          </h1>
          <p className="mt-2 font-display font-bold text-2xl sm:text-3xl text-secondary">
            Mouse Hunt
          </p>
        </motion.div>

        {/* Cat & mouse animation */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="relative h-32 w-full max-w-md mb-8"
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
          className="flex gap-3 mb-8"
        >
          <div className="bg-card/80 backdrop-blur border-2 border-card-border rounded-2xl px-4 py-2 text-center shadow-md">
            <Trophy className="inline h-4 w-4 text-primary mr-1" />
            <span className="font-display font-bold text-sm">Level {Math.min(save.highestUnlocked, 8)}</span>
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
          className="w-full max-w-xs flex flex-col gap-3"
        >
          <Link href={`/play/${save.highestUnlocked === 1 ? 1 : Math.min(save.highestUnlocked, 8)}`}>
            <Button
              size="lg"
              className="w-full h-16 text-2xl font-display font-bold shadow-lg game-button"
              onClick={() => sfx.click()}
              data-testid="button-play"
            >
              <Play className="mr-2 h-6 w-6 fill-current" /> PLAY
            </Button>
          </Link>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/levels">
              <Button
                variant="secondary"
                className="w-full h-12 font-display font-bold shadow-md game-button"
                onClick={() => sfx.click()}
                data-testid="button-levels"
              >
                <Map className="mr-1 h-4 w-4" /> Levels
              </Button>
            </Link>
            <Link href="/how-to-play">
              <Button
                variant="secondary"
                className="w-full h-12 font-display font-bold shadow-md game-button"
                onClick={() => sfx.click()}
                data-testid="button-how"
              >
                <BookOpen className="mr-1 h-4 w-4" /> How To
              </Button>
            </Link>
          </div>
          <Link href="/credits">
            <Button
              variant="ghost"
              className="w-full font-display font-bold opacity-70 hover:opacity-100"
              onClick={() => sfx.click()}
              data-testid="button-credits"
            >
              Credits
            </Button>
          </Link>
        </motion.div>

        <div className="w-full max-w-md mt-6">
          <AdBanner slot="1234567890" testLabel="splash" />
        </div>

        <div className="static mt-6 mb-2 sm:absolute sm:bottom-4 inset-x-0 flex flex-col items-center gap-1.5 text-xs text-foreground/60 font-bold px-4">
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
