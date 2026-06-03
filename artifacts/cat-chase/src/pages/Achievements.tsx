import { motion } from "framer-motion";
import { MenuShell } from "@/components/MenuShell";
import { ACHIEVEMENTS } from "@/game/achievements";
import type { SaveData } from "@/game/types";

type Props = {
  save: SaveData;
};

export const Achievements = ({ save }: Props) => {
  const earned = new Set(save.earnedAchievements ?? []);
  const earnedCount = ACHIEVEMENTS.filter((a) => earned.has(a.id)).length;

  return (
    <MenuShell showBack>
      <div className="relative z-10 min-h-screen px-4 py-12 max-w-xl mx-auto">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-6"
        >
          <h1 className="font-display font-bold text-4xl sm:text-5xl mb-1">Achievements</h1>
          <p className="text-muted-foreground font-bold">
            {earnedCount} / {ACHIEVEMENTS.length} unlocked
          </p>
          <div className="mt-3 h-2.5 bg-muted rounded-full overflow-hidden max-w-xs mx-auto">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${(earnedCount / ACHIEVEMENTS.length) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            />
          </div>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          {ACHIEVEMENTS.map((ach, i) => {
            const unlocked = earned.has(ach.id);
            return (
              <motion.div
                key={ach.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`relative flex flex-col items-center text-center rounded-2xl px-3 py-4 border-2 transition-colors ${
                  unlocked
                    ? "bg-card border-primary shadow-md"
                    : "bg-card/50 border-card-border opacity-50"
                }`}
              >
                {unlocked && (
                  <div className="absolute top-2 right-2 text-primary text-sm font-bold leading-none">
                    ✓
                  </div>
                )}
                <div
                  className={`text-3xl w-14 h-14 flex items-center justify-center rounded-xl mb-2 ${
                    unlocked ? "bg-primary/10" : "bg-muted grayscale"
                  }`}
                >
                  {unlocked ? ach.icon : "🔒"}
                </div>
                <div className="font-display font-bold text-sm leading-tight mb-1">
                  {ach.title}
                </div>
                <div className="text-[11px] text-muted-foreground leading-snug">
                  {ach.description}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </MenuShell>
  );
};
