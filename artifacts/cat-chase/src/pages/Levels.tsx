import { motion } from "framer-motion";
import { Link } from "wouter";
import { Lock, Trophy, Clock, Star } from "lucide-react";
import { MenuShell } from "@/components/MenuShell";
import { StarRating } from "@/components/StarRating";
import { LEVELS } from "@/game/levels";
import { sfx } from "@/game/audio";
import type { SaveData } from "@/game/types";

type Props = { save: SaveData };

export const Levels = ({ save }: Props) => {
  const totalStars = Object.values(save.levels).reduce((s, p) => s + (p?.bestStars ?? 0), 0);
  const maxStars = LEVELS.length * 3;
  const completedCount = Object.values(save.levels).filter((p) => p?.bestStars > 0).length;

  return (
    <MenuShell themeBg={["#fce7f3", "#e0e7ff"]}>
      <div className="relative z-10 min-h-screen px-4 sm:px-6 pt-24 pb-10 max-w-5xl mx-auto">
        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="font-display font-bold text-4xl sm:text-5xl text-center mb-2"
        >
          Choose Your <span className="text-primary">Stage</span>
        </motion.h1>
        <p className="text-center text-muted-foreground mb-4 font-bold">
          Catch the mouse in every world to unlock the next.
        </p>

        {/* Overall progress bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card/85 backdrop-blur border-2 border-card-border rounded-2xl p-4 mb-6 shadow-md flex items-center gap-4"
        >
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            <div>
              <div className="font-display font-bold text-lg leading-none">{completedCount}/{LEVELS.length}</div>
              <div className="text-xs text-muted-foreground font-bold">Levels</div>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-muted-foreground">Stars</span>
              <span className="font-display font-bold text-sm text-primary">{totalStars}/{maxStars}</span>
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(totalStars / maxStars) * 100}%` }}
                transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
                className="h-full rounded-full bg-primary"
              />
            </div>
          </div>
          <div className="flex items-center gap-1">
            {[...Array(3)].map((_, i) => (
              <Star
                key={i}
                size={16}
                fill={i < Math.floor(totalStars / LEVELS.length) ? "#facc15" : "transparent"}
                color={i < Math.floor(totalStars / LEVELS.length) ? "#ca8a04" : "#94a3b8"}
                strokeWidth={2.5}
              />
            ))}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {LEVELS.map((lvl, i) => {
            const prog = save.levels[lvl.id];
            const unlocked = prog?.unlocked ?? false;
            const stars = prog?.bestStars ?? 0;
            const bestTime = prog?.bestTimeRemaining ?? 0;
            const bestScore = prog?.bestScore ?? 0;
            const completed = stars > 0;

            const card = (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                whileHover={unlocked ? { y: -6, scale: 1.02 } : undefined}
                className={`relative overflow-hidden rounded-3xl border-4 ${
                  unlocked ? "border-primary cursor-pointer" : "border-muted-border opacity-70"
                } shadow-lg`}
                style={{
                  background: `linear-gradient(135deg, ${lvl.theme.bgGradient[0]}, ${lvl.theme.bgGradient[1]})`,
                  minHeight: 220,
                }}
                onClick={() => unlocked && sfx.click()}
                data-testid={`card-level-${lvl.id}`}
              >
                {/* Level badge */}
                <div className="absolute top-3 right-3 bg-card/90 backdrop-blur rounded-full px-3 py-1 border-2 border-card-border">
                  <span className="font-display font-bold text-sm">Lv {lvl.id}</span>
                </div>

                {/* Completion ribbon */}
                {completed && (
                  <div className="absolute top-3 left-3">
                    <div className="bg-primary text-primary-foreground rounded-full px-2.5 py-0.5 text-xs font-display font-bold shadow-md">
                      ✓ Done
                    </div>
                  </div>
                )}

                <div className="absolute inset-0 p-5 flex flex-col justify-end">
                  <div className="bg-card/90 backdrop-blur rounded-2xl p-4 border-2 border-card-border">
                    <h3 className="font-display font-bold text-xl">{lvl.name}</h3>
                    <p className="text-xs text-muted-foreground mb-2">{lvl.subtitle}</p>

                    {/* Stars row */}
                    <div className="flex items-center justify-between mb-2">
                      <StarRating stars={stars} size={20} />
                      <span className="text-xs font-bold text-muted-foreground">
                        {stars}/3 ⭐
                      </span>
                    </div>

                    {/* Best records */}
                    {completed ? (
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className="bg-muted rounded-xl px-2 py-1.5 text-center">
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Best Time</span>
                          </div>
                          <div className="font-display font-bold text-sm tabular-nums">
                            {bestTime.toFixed(1)}s left
                          </div>
                        </div>
                        <div className="bg-muted rounded-xl px-2 py-1.5 text-center">
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <Trophy className="h-3 w-3 text-muted-foreground" />
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Best Score</span>
                          </div>
                          <div className="font-display font-bold text-sm tabular-nums">
                            {bestScore > 0 ? bestScore.toLocaleString() : "—"}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground font-bold mt-1 opacity-70">
                        {unlocked ? "Not yet completed" : "Complete previous level to unlock"}
                      </div>
                    )}
                  </div>
                </div>

                {!unlocked && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-sm">
                    <div className="bg-card rounded-full p-4 border-4 border-card-border">
                      <Lock className="h-8 w-8" />
                    </div>
                  </div>
                )}
              </motion.div>
            );

            return unlocked ? (
              <Link key={lvl.id} href={`/play/${lvl.id}`}>
                {card}
              </Link>
            ) : (
              <div key={lvl.id}>{card}</div>
            );
          })}
        </div>
      </div>
    </MenuShell>
  );
};
