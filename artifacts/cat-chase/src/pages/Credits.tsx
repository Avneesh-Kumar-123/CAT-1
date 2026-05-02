import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { MenuShell } from "@/components/MenuShell";
import { CatSprite } from "@/game/sprites";

export const Credits = () => {
  return (
    <MenuShell themeBg={["#fce7f3", "#fef3c7"]}>
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 py-20 text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="animate-float mb-6"
        >
          <CatSprite size={140} />
        </motion.div>

        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="font-display font-bold text-4xl sm:text-5xl mb-3"
        >
          <span className="text-primary">Cat Chase:</span> Mouse Hunt
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-lg text-muted-foreground mb-8 max-w-md"
        >
          A small arcade game made with React, Canvas, and a lot of love for cartoon cats.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-card border-2 border-card-border rounded-3xl p-6 max-w-sm w-full shadow-lg space-y-3"
        >
          <div className="flex justify-between font-bold">
            <span className="text-muted-foreground">Game Design</span>
            <span>The Cat</span>
          </div>
          <div className="flex justify-between font-bold">
            <span className="text-muted-foreground">Engineering</span>
            <span>The Cat (also)</span>
          </div>
          <div className="flex justify-between font-bold">
            <span className="text-muted-foreground">Art Direction</span>
            <span>Tail Twitches</span>
          </div>
          <div className="flex justify-between font-bold">
            <span className="text-muted-foreground">Sound</span>
            <span>Web Audio API</span>
          </div>
          <div className="flex justify-between font-bold">
            <span className="text-muted-foreground">Mouse Wrangler</span>
            <span>Squeaky</span>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-8 font-bold text-foreground/70 flex items-center gap-2"
        >
          Made with <Heart className="h-4 w-4 text-destructive fill-current" /> for arcade fans
        </motion.p>
      </div>
    </MenuShell>
  );
};
