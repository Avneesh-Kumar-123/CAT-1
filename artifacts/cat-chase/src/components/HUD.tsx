import { memo } from "react";
import { Pause, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PowerUpIcon, powerUpLabel } from "./PowerUpIcon";
import type { PowerUpKind } from "@/game/types";

type HUDProps = {
  level: number;
  levelName: string;
  score: number;
  timeLeft: number;
  totalTime: number;
  activePower: { kind: PowerUpKind; until: number } | null;
  now: number;
  miceLeft: number;
  miceTotal: number;
  combo: number;
  sound: boolean;
  cheeseAvailable: boolean;
  placingBait: boolean;
  onPause: () => void;
  onToggleSound: () => void;
  onDropBait: () => void;
};

const HUDInner = ({
  level,
  levelName,
  score,
  timeLeft,
  totalTime,
  activePower,
  now,
  miceLeft,
  miceTotal,
  combo,
  sound,
  cheeseAvailable,
  placingBait,
  onPause,
  onToggleSound,
  onDropBait,
}: HUDProps) => {
  const pct = Math.max(0, Math.min(1, timeLeft / totalTime));
  const isLow = timeLeft < 10;
  const dash = `${pct * 264} 264`;
  const ringColor = isLow ? "hsl(var(--destructive))" : "hsl(var(--primary))";
  const remaining = activePower ? Math.max(0, (activePower.until - now) / 1000) : 0;

  return (
    <div className="absolute inset-x-0 top-0 z-20 px-2 sm:px-4 pt-2 sm:pt-4 pointer-events-none">
      <div className="max-w-5xl mx-auto flex items-start justify-between gap-1 sm:gap-3">

        {/* Left cluster */}
        <div className="flex items-center gap-1.5 sm:gap-3 pointer-events-auto" onTouchStart={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
          <div className="bg-card/90 backdrop-blur border-2 border-card-border rounded-xl sm:rounded-2xl px-2 sm:px-4 py-1.5 sm:py-2 shadow-md">
            <div className="text-[9px] sm:text-xs uppercase font-bold text-muted-foreground tracking-wider">Lvl</div>
            <div className="font-display text-lg sm:text-2xl font-bold leading-none text-primary">{level}</div>
          </div>
          <div className="hidden sm:block bg-card/90 backdrop-blur border-2 border-card-border rounded-2xl px-4 py-2 shadow-md max-w-[36vw] sm:max-w-none">
            <div className="text-[10px] sm:text-xs uppercase font-bold text-muted-foreground tracking-wider">Stage</div>
            <div className="font-display text-sm sm:text-lg font-bold leading-none truncate">{levelName}</div>
          </div>
        </div>

        {/* Center timer ring */}
        <div className={`relative pointer-events-auto ${isLow ? "animate-pulse" : ""}`}>
          <svg width="72" height="72" viewBox="0 0 100 100" className="drop-shadow-md sm:w-[86px] sm:h-[86px]">
            <circle cx="50" cy="50" r="42" fill="hsl(var(--card))" stroke="hsl(var(--card-border))" strokeWidth="4" />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke={ringColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={dash}
              transform="rotate(-90 50 50)"
            />
            <text
              x="50"
              y="55"
              textAnchor="middle"
              fontFamily="Fredoka, sans-serif"
              fontWeight="700"
              fontSize="28"
              fill={isLow ? "hsl(var(--destructive))" : "hsl(var(--foreground))"}
            >
              {Math.ceil(timeLeft)}
            </text>
          </svg>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-1.5 sm:gap-3 pointer-events-auto" onTouchStart={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
          <div className="bg-card/90 backdrop-blur border-2 border-card-border rounded-xl sm:rounded-2xl px-2 sm:px-4 py-1.5 sm:py-2 shadow-md text-right">
            <div className="text-[9px] sm:text-xs uppercase font-bold text-muted-foreground tracking-wider">Score</div>
            <div className="font-display text-lg sm:text-2xl font-bold leading-none tabular-nums">
              {score.toLocaleString()}
            </div>
            <div className="mt-0.5 flex items-center justify-end gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-primary">
                <ellipse cx="12" cy="15" rx="6" ry="5" fill="currentColor" />
                <circle cx="9" cy="11" r="2" fill="currentColor" />
                <circle cx="15" cy="11" r="2" fill="currentColor" />
                <circle cx="6" cy="7" r="1.6" fill="currentColor" />
                <circle cx="18" cy="7" r="1.6" fill="currentColor" />
              </svg>
              <span className="font-display text-xs font-bold tabular-nums">
                {miceLeft}/{miceTotal}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <Button
              size="icon"
              variant="default"
              className="rounded-full shadow-md h-9 w-9 sm:h-10 sm:w-10"
              onClick={onPause}
              data-testid="button-pause"
            >
              <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full shadow-md h-9 w-9 sm:h-10 sm:w-10"
              onClick={onToggleSound}
              data-testid="button-sound"
            >
              {sound ? <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>
            {/* Cheese bait button */}
            <button
              onClick={onDropBait}
              disabled={!cheeseAvailable}
              title={placingBait ? "Tap game to place bait!" : cheeseAvailable ? "Drop cheese bait (B)" : "Bait used"}
              className={`
                rounded-full shadow-md h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center text-base sm:text-lg
                border-2 transition-all duration-150 select-none
                ${!cheeseAvailable
                  ? "opacity-30 cursor-not-allowed bg-card/60 border-card-border"
                  : placingBait
                    ? "bg-yellow-400 border-yellow-600 animate-pulse scale-110 cursor-crosshair"
                    : "bg-yellow-100 border-yellow-400 hover:bg-yellow-200 hover:scale-105 cursor-pointer"
                }
              `}
              data-testid="button-cheese"
            >
              🧀
            </button>
          </div>
        </div>
      </div>

      {/* Placing bait banner */}
      {placingBait && (
        <div className="max-w-5xl mx-auto mt-2 flex justify-center pointer-events-none">
          <div className="flex items-center gap-2 bg-yellow-400 text-yellow-900 border-2 border-yellow-600 rounded-full px-4 py-1 shadow-lg font-display font-bold text-sm animate-pulse">
            <span>🧀</span>
            <span>Tap anywhere to place your bait!</span>
          </div>
        </div>
      )}

      {/* Combo indicator */}
      {combo >= 2 && (
        <div className="max-w-5xl mx-auto mt-2 flex justify-center pointer-events-none">
          <div className="flex items-center gap-2 bg-amber-500 text-amber-950 border-2 border-amber-700 rounded-full px-3 py-1 shadow-lg font-display font-bold text-sm animate-pulse">
            <span>COMBO</span>
            <span className="text-lg">x{combo}</span>
          </div>
        </div>
      )}

      {/* Active power-up banner */}
      {activePower && remaining > 0 && (
        <div className="max-w-5xl mx-auto mt-2 flex justify-center pointer-events-none">
          <div className="flex items-center gap-2 bg-card/95 backdrop-blur border-2 border-primary rounded-full pl-2 pr-4 py-1 shadow-lg">
            <PowerUpIcon kind={activePower.kind} size={28} />
            <div className="font-display font-bold text-xs sm:text-sm">
              {powerUpLabel[activePower.kind]}
            </div>
            <div className="font-mono text-xs text-muted-foreground">
              {remaining.toFixed(1)}s
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const HUD = memo(HUDInner);
