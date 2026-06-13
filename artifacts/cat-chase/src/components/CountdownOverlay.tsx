import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { sfx } from "@/game/audio";

type Props = {
  onDone: () => void;
};

const STEPS = [3, 2, 1, "GO!"] as const;
type Step = (typeof STEPS)[number];

// Each step duration in ms
const DURATION: Record<string, number> = {
  "3": 900,
  "2": 900,
  "1": 900,
  "GO!": 650,
};

export const CountdownOverlay = ({ onDone }: Props) => {
  const [idx, setIdx] = useState(0);

  // Stable ref so onDone never causes the effect to re-run
  const onDoneRef = useRef(onDone);
  useLayoutEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    const step = STEPS[idx];
    if (step === undefined) {
      onDoneRef.current();
      return;
    }
    if (step === "GO!") sfx.countdownGo();
    else sfx.countdownTick(step);
    const delay = DURATION[String(step)] ?? 900;
    const t = setTimeout(() => setIdx((i) => i + 1), delay);
    return () => clearTimeout(t);
  }, [idx]);

  const step: Step | undefined = STEPS[idx];
  if (step === undefined) return null;

  const isGo = step === "GO!";

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
      {/* Dim background */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Single animated element — key forces full remount per step */}
      <motion.div
        key={idx}
        initial={{ scale: 2.2, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="relative flex flex-col items-center z-10"
      >
        <span
          className="font-display font-bold select-none"
          style={{
            fontSize: isGo ? "clamp(64px, 18vw, 120px)" : "clamp(80px, 22vw, 160px)",
            color: isGo ? "#4ade80" : "#ffffff",
            textShadow: isGo
              ? "0 0 60px rgba(74,222,128,0.9), 0 4px 24px rgba(0,0,0,0.5)"
              : "0 0 40px rgba(255,255,255,0.5), 0 4px 24px rgba(0,0,0,0.6)",
            lineHeight: 1,
          }}
        >
          {step}
        </span>

        {isGo && (
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.2 }}
            className="font-display font-bold text-white/80 text-lg sm:text-2xl mt-2"
            style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}
          >
            Catch the mouse! 🐱
          </motion.span>
        )}
      </motion.div>
    </div>
  );
};
