import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Settings as SettingsIcon, ArrowLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

type Props = {
  children: ReactNode;
  onSettings?: () => void;
  showBack?: boolean;
  themeBg?: [string, string];
};

export const MenuShell = ({ children, onSettings, showBack = true, themeBg }: Props) => {
  const [, setLoc] = useLocation();
  const bg = themeBg ?? (["#fef3c7", "#fbcfe8"] as [string, string]);
  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: `linear-gradient(135deg, ${bg[0]}, ${bg[1]})`,
        }}
      />
      {/* Floating cartoon shapes */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full opacity-20"
            style={{
              width: 60 + i * 30,
              height: 60 + i * 30,
              background: ["#f97316", "#a78bfa", "#34d399", "#fbbf24", "#60a5fa", "#fb7185"][i],
              top: `${10 + i * 13}%`,
              left: `${5 + i * 14}%`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, 15, 0],
            }}
            transition={{
              duration: 6 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.5,
            }}
          />
        ))}
      </div>

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 z-30 px-4 py-4 flex items-center justify-between">
        {showBack ? (
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full shadow-md h-11 w-11"
            onClick={() => setLoc("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : <div />}
        {onSettings && (
          <Button
            size="icon"
            variant="secondary"
            className="rounded-full shadow-md h-11 w-11"
            onClick={onSettings}
            data-testid="button-settings"
          >
            <SettingsIcon className="h-5 w-5" />
          </Button>
        )}
      </div>

      {children}
    </div>
  );
};

export const NavLink = ({ to, children }: { to: string; children: ReactNode }) => (
  <Link href={to} className="font-bold text-foreground/70 hover:text-foreground transition-colors">
    {children}
  </Link>
);
