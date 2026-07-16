import { motion } from "framer-motion";
import { MenuShell } from "@/components/MenuShell";
import { MouseSprite } from "@/game/sprites";
import { MOUSE_PERSONALITIES } from "@/game/mousePersonalities";
import { MOUSE_COIN_VALUES, KING_MOUSE_COINS, BOSS_MOUSE_COINS } from "@/game/economy";
import type { SaveData, MouseKind } from "@/game/types";

type Props = {
  save: SaveData;
};

const coinValue = (id: MouseKind): number => {
  if (id === "boss") return BOSS_MOUSE_COINS;
  if (id === "golden") return KING_MOUSE_COINS;
  return MOUSE_COIN_VALUES[id as keyof typeof MOUSE_COIN_VALUES] ?? 5;
};

const spriteVariant = (id: MouseKind): "normal" | "boss" | "decoy" => {
  if (id === "boss") return "boss";
  return "normal";
};

export const MouseAlmanac = ({ save }: Props) => {
  const caught = new Set<string>(save.caughtMouseKinds ?? []);
  const caughtCount = MOUSE_PERSONALITIES.filter((p) => caught.has(p.id)).length;

  return (
    <MenuShell showBack>
      <div className="relative z-10 min-h-screen px-4 py-12 max-w-xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-6"
        >
          <h1 className="font-display font-bold text-4xl sm:text-5xl mb-1">
            Mouse Almanac
          </h1>
          <p className="text-muted-foreground font-bold">
            {caughtCount} / {MOUSE_PERSONALITIES.length} discovered
          </p>
          <div className="mt-3 h-2.5 bg-muted rounded-full overflow-hidden max-w-xs mx-auto">
            <motion.div
              className="h-full rounded-full bg-violet-500"
              initial={{ width: 0 }}
              animate={{ width: `${(caughtCount / MOUSE_PERSONALITIES.length) * 100}%` }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Catch each type for the first time to earn +15 🪙
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-2 gap-3">
          {MOUSE_PERSONALITIES.map((personality, i) => {
            const unlocked = caught.has(personality.id);
            const coins = coinValue(personality.id);
            return (
              <motion.div
                key={personality.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`relative flex flex-col items-center text-center rounded-2xl px-3 py-4 border-2 transition-colors ${
                  unlocked
                    ? "bg-card border-violet-300 shadow-md"
                    : "bg-card/50 border-card-border opacity-50"
                }`}
              >
                {/* Discovered checkmark */}
                {unlocked && (
                  <div className="absolute top-2 right-2 text-violet-500 text-sm font-bold leading-none">
                    ✦
                  </div>
                )}

                {/* Mouse sprite or locked icon */}
                <div
                  className={`w-16 h-16 flex items-center justify-center rounded-xl mb-2 relative ${
                    unlocked ? "bg-violet-50" : "bg-muted grayscale"
                  }`}
                >
                  {unlocked ? (
                    <>
                      <MouseSprite size={44} variant={spriteVariant(personality.id)} />
                      {/* Personality badge overlay */}
                      <span className="absolute bottom-0.5 right-0.5 text-base leading-none">
                        {personality.icon}
                      </span>
                    </>
                  ) : (
                    <span className="text-3xl">🔒</span>
                  )}
                </div>

                {/* Name */}
                <div className="font-display font-bold text-sm leading-tight mb-1">
                  {personality.title}
                </div>

                {/* Description — only when unlocked */}
                {unlocked ? (
                  <div className="text-[11px] text-muted-foreground leading-snug mb-2">
                    {personality.description}
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground leading-snug mb-2 italic">
                    Catch one to reveal
                  </div>
                )}

                {/* Coin value */}
                <div
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    unlocked ? "bg-yellow-100 text-yellow-700" : "bg-muted text-muted-foreground"
                  }`}
                >
                  🪙 {coins} per catch
                </div>
              </motion.div>
            );
          })}
        </div>

        {caughtCount === MOUSE_PERSONALITIES.length && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6 text-center bg-violet-100 border-2 border-violet-300 rounded-2xl px-4 py-5"
          >
            <div className="text-3xl mb-2">🏆</div>
            <div className="font-display font-bold text-lg">Complete Collection!</div>
            <div className="text-sm text-muted-foreground mt-1">
              You've encountered every mouse in the game. Legendary!
            </div>
          </motion.div>
        )}
      </div>
    </MenuShell>
  );
};
