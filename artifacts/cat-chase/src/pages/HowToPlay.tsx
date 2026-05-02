import { motion } from "framer-motion";
import { Keyboard, Hand, Zap, Snowflake, Magnet, Heart, AlertTriangle, Droplet } from "lucide-react";
import { MenuShell } from "@/components/MenuShell";

const cards = [
  {
    icon: Keyboard,
    title: "Desktop Controls",
    desc: "Use arrow keys or WASD to move your cat around.",
    color: "#f97316",
  },
  {
    icon: Hand,
    title: "Mobile Controls",
    desc: "Drag the on-screen joystick at the bottom-left to chase.",
    color: "#a855f7",
  },
  {
    icon: AlertTriangle,
    title: "Mousetraps",
    desc: "Yellow-bar traps end your run instantly. Don't step on them!",
    color: "#dc2626",
  },
  {
    icon: Droplet,
    title: "Water",
    desc: "Walking through water slows your cat by half. Go around when you can.",
    color: "#3b82f6",
  },
  {
    icon: Zap,
    title: "Speed Boost",
    desc: "Yellow power-up. Sprint 60% faster for 5 seconds with a glowing trail.",
    color: "#ca8a04",
  },
  {
    icon: Snowflake,
    title: "Freeze",
    desc: "Blue power-up. Stop the mouse in its tracks for 3 seconds.",
    color: "#0369a1",
  },
  {
    icon: Magnet,
    title: "Magnet",
    desc: "Red power-up. Pulls the mouse toward your cat for 4 seconds.",
    color: "#dc2626",
  },
  {
    icon: Heart,
    title: "Bonus Time",
    desc: "Green power-up. Adds 5 seconds to your timer.",
    color: "#16a34a",
  },
];

export const HowToPlay = () => {
  return (
    <MenuShell themeBg={["#dbeafe", "#fef3c7"]}>
      <div className="relative z-10 min-h-screen px-6 pt-20 pb-10 max-w-4xl mx-auto">
        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="font-display font-bold text-4xl sm:text-5xl text-center mb-2"
        >
          How To <span className="text-primary">Play</span>
        </motion.h1>
        <p className="text-center text-muted-foreground mb-8 font-bold">
          Catch the mouse before time runs out. Faster = more stars.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {cards.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="bg-card border-2 border-card-border rounded-2xl p-5 flex gap-4 items-start shadow-md"
            >
              <div
                className="rounded-full p-3 flex-shrink-0"
                style={{ background: c.color + "22", color: c.color }}
              >
                <c.icon className="h-6 w-6" strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg leading-tight">{c.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{c.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-primary/10 border-2 border-primary rounded-3xl p-6 text-center"
        >
          <h3 className="font-display font-bold text-2xl mb-2">Star Ratings</h3>
          <p className="text-sm text-muted-foreground mb-3">Three stars for the fastest catches.</p>
          <div className="flex justify-center gap-6 text-sm font-bold">
            <div>★ — caught in time</div>
            <div>★★ — &gt;30% time left</div>
            <div>★★★ — &gt;60% time left</div>
          </div>
        </motion.div>
      </div>
    </MenuShell>
  );
};
