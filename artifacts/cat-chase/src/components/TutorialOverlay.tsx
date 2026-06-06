import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TUTORIAL_KEY = "cc_tutorial_v1_done";

const STEPS = [
  {
    icon: "🕹️",
    title: "Move your cat",
    joystickBody: "Drag the joystick (bottom-left) to steer.\nDouble-tap anywhere to drop cheese!",
    tapBody: "Tap and hold anywhere to move.\nHold still for 0.5s to drop cheese!",
  },
  {
    icon: "🐭",
    title: "Catch the mouse!",
    joystickBody: "Chase the mouse before time runs out.\nAvoid the traps — they end the round!",
    tapBody: "Chase the mouse before time runs out.\nAvoid the traps — they end the round!",
  },
  {
    icon: "🧀",
    title: "Use cheese bait",
    joystickBody: "Tap 🧀 or double-tap the screen,\nor drag 🧀 anywhere to lure the mouse.",
    tapBody: "Tap 🧀, hold anywhere 0.5s,\nor drag 🧀 to lure the mouse.",
  },
];

type Props = { levelId: number; controlMode: string };

export const TutorialOverlay = ({ levelId, controlMode }: Props) => {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (levelId !== 1) return;
    if (localStorage.getItem(TUTORIAL_KEY)) return;
    const t = setTimeout(() => setVisible(true), 900);
    return () => clearTimeout(t);
  }, [levelId]);

  const dismiss = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      localStorage.setItem(TUTORIAL_KEY, "1");
      setVisible(false);
    }
  };

  const current = STEPS[step]!;
  const body = controlMode === "joystick" ? current.joystickBody : current.tapBody;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="tutorial-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 z-40 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.58)", backdropFilter: "blur(3px)" }}
          onClick={dismiss}
          onTouchStart={(e) => { e.stopPropagation(); }}
          onTouchEnd={(e) => { e.stopPropagation(); dismiss(); }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ scale: 0.82, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.88, y: -12, opacity: 0 }}
              transition={{ type: "spring", stiffness: 340, damping: 26 }}
              className="bg-card border-4 border-card-border rounded-3xl shadow-2xl mx-6 p-7 text-center max-w-xs w-full"
              onClick={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              <div className="text-5xl mb-3">{current.icon}</div>
              <h3 className="font-display font-bold text-2xl mb-2">{current.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed whitespace-pre-line mb-5">
                {body}
              </p>

              <div className="flex items-center gap-2 justify-center mb-4">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                      i === step ? "w-5 h-2.5 bg-primary" : "w-2.5 h-2.5 bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>

              <button
                className="w-full bg-primary text-primary-foreground font-display font-bold py-3 rounded-2xl text-base active:scale-95 transition-transform"
                onClick={(e) => { e.stopPropagation(); dismiss(); }}
                onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); dismiss(); }}
              >
                {step < STEPS.length - 1 ? "Next →" : "Let's go! 🐱"}
              </button>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
