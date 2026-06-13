import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ACHIEVEMENTS } from "@/game/achievements";
import { sfx } from "@/game/audio";

type Props = {
  ids: string[];
  onDone: () => void;
};

export const AchievementToastQueue = ({ ids, onDone }: Props) => {
  const [index, setIndex] = useState(0);
  const [showing, setShowing] = useState(true);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  // Play achievement sound when a new toast appears
  useEffect(() => {
    if (showing) sfx.achievement();
  }, [index, showing]);

  // Auto-hide current toast after 2.5 s
  useEffect(() => {
    if (!showing) return;
    const t = setTimeout(() => setShowing(false), 2500);
    return () => clearTimeout(t);
  }, [index, showing]);

  // Called when the exit animation finishes — advance to next or finish
  const advance = () => {
    const next = index + 1;
    if (next >= ids.length) {
      onDoneRef.current();
    } else {
      setIndex(next);
      setShowing(true);
    }
  };

  const id = ids[index];
  if (!id) return null;
  const ach = ACHIEVEMENTS.find((a) => a.id === id);
  if (!ach) {
    advance();
    return null;
  }

  const total = ids.length;

  return (
    <div className="fixed top-3 inset-x-0 z-[400] flex justify-center pointer-events-none px-4">
      <AnimatePresence onExitComplete={advance} mode="wait">
        {showing && (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: -52, scale: 0.88 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -36, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
            className="flex items-center gap-3 bg-card border-2 border-primary rounded-2xl shadow-2xl px-4 py-3 max-w-sm w-full"
          >
            <span className="text-2xl flex-shrink-0">{ach.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-primary leading-tight">
                Achievement Unlocked
              </div>
              <div className="font-display font-bold text-sm truncate">{ach.title}</div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {total > 1 && (
                <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
                  {index + 1}/{total}
                </span>
              )}
              <span className="text-primary text-lg">✓</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
