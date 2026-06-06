import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const isTouch = () =>
  typeof window !== "undefined" &&
  ("ontouchstart" in window || navigator.maxTouchPoints > 0);

const isPortrait = () =>
  typeof window !== "undefined" && window.innerWidth < window.innerHeight;

export const LandscapePrompt = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isTouch()) return;

    const check = () => setShow(isPortrait());
    check();

    window.addEventListener("resize", check);
    screen.orientation?.addEventListener("change", check);
    return () => {
      window.removeEventListener("resize", check);
      screen.orientation?.removeEventListener("change", check);
    };
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="landscape-prompt"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center"
          style={{ background: "rgba(15,23,42,0.93)", backdropFilter: "blur(8px)" }}
        >
          <motion.div
            animate={{ rotate: [0, 90, 90, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.8 }}
            className="text-7xl mb-6 select-none"
            style={{ display: "inline-block", transformOrigin: "center" }}
          >
            📱
          </motion.div>
          <p className="font-display font-bold text-white text-2xl mb-2 tracking-wide">
            Rotate your phone
          </p>
          <p className="text-white/60 text-base text-center px-8">
            Cat Chase plays best in landscape mode
          </p>
          <div className="mt-8 flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-white/40"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
