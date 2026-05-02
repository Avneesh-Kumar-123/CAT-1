import { Zap, Snowflake, Magnet, Heart } from "lucide-react";
import type { PowerUpKind } from "@/game/types";

const colors: Record<PowerUpKind, { bg: string; ring: string; icon: string }> = {
  speed: { bg: "#fde047", ring: "#ca8a04", icon: "#854d0e" },
  freeze: { bg: "#bae6fd", ring: "#0369a1", icon: "#0c4a6e" },
  magnet: { bg: "#fecaca", ring: "#dc2626", icon: "#7f1d1d" },
  extra: { bg: "#bbf7d0", ring: "#16a34a", icon: "#14532d" },
};

export const PowerUpIcon = ({ kind, size = 36 }: { kind: PowerUpKind; size?: number }) => {
  const c = colors[kind];
  const Icon = kind === "speed" ? Zap : kind === "freeze" ? Snowflake : kind === "magnet" ? Magnet : Heart;
  return (
    <div
      className="rounded-full flex items-center justify-center shadow-md"
      style={{
        width: size,
        height: size,
        background: c.bg,
        border: `3px solid ${c.ring}`,
      }}
    >
      <Icon size={size * 0.55} color={c.icon} strokeWidth={2.5} />
    </div>
  );
};

export const powerUpLabel: Record<PowerUpKind, string> = {
  speed: "Speed Boost",
  freeze: "Freeze Mouse",
  magnet: "Mouse Magnet",
  extra: "+5 Seconds",
};
