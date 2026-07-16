import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MOUSE_PERSONALITIES } from "@/game/mousePersonalities";
import { sfx } from "@/game/audio";
import type { MouseKind } from "@/game/types";

type Props = {
  kinds: MouseKind[];
  onDone: () => void;
};

export const MouseDiscoveryToast = ({ kinds, onDone }: Props) => {
  const [index, setIndex] = useState(0);
  const [showing, setShowing] = useState(true);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  // Play achievement chime for each new discovery
  useEffect(() => {
    if (showing) sfx.achievement();
  }, [index, showing]);

  // Auto-hide after 2.5 s
  useEffect(() => {
    if (!showing) return;
    const t = setTimeout(() => setShowing(false), 2500);
    return () => clearTimeout(t);
  }, [index, showing]);

  const advance = () => {
    const next = index + 1;
    if (next >= kinds.length) {
      onDoneRef.current();
    } else {
      setIndex(next);
      setShowing(true);
    }
  };

  const kind = kinds[index];
  if (!kind) return null;
  const personality = MOUSE_PERSONALITIES.find((p) => p.id === kind);
  if (!personality) { advance(); return null; }

  const total = kinds.length;

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
            className="flex items-center gap-3 bg-card border-2 border-violet-400 rounded-2xl shadow-2xl px-4 py-3 max-w-sm w-full"
          >
            <span className="text-2xl flex-shrink-0">{personality.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold uppercase tracking-widest text-violet-500 leading-tight">
                Mouse Discovered · +15 🪙
              </div>
              <div className="font-display font-bold text-sm truncate">{personality.title}</div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {total > 1 && (
                <span className="text-[10px] font-bold text-muted-foreground tabular-nums">
                  {index + 1}/{total}
                </span>
              )}
              <span className="text-violet-500 text-lg">✦</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
