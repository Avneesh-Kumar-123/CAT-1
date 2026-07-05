import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pause, Volume2, VolumeX, Coins, Maximize2, Minimize2 } from "lucide-react";
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
  coins?: number;
  coinPops?: { id: number; amount: number }[];
  coinPulseKey?: number;
  isFullscreen?: boolean;
  fullscreenSupported?: boolean;
  onPause: () => void;
  onToggleSound: () => void;
  onToggleFullscreen?: () => void;
  onDropBait: () => void;
  onCheeseDragStart?: (x: number, y: number, touchId: number) => void;
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
  coins,
  coinPops,
  coinPulseKey,
  isFullscreen = false,
  fullscreenSupported = false,
  onPause,
  onToggleSound,
  onToggleFullscreen,
  onDropBait,
  onCheeseDragStart,
}: HUDProps) => {
  const pct = Math.max(0, Math.min(1, timeLeft / totalTime));
  const isLow = timeLeft < 10;
  const dash = `${pct * 264} 264`;
  const ringColor = isLow ? "hsl(var(--destructive))" : "hsl(var(--primary))";
  const remaining = activePower ? Math.max(0, (activePower.until - now) / 1000) : 0;

  return (
    <div
      className="absolute inset-x-0 top-0 z-20 px-2 sm:px-4 pointer-events-none"
      style={{ paddingTop: "max(0.375rem, env(safe-area-inset-top))" }}
    >
      <div className="max-w-5xl mx-auto flex items-start justify-between gap-1 sm:gap-3">

        {/* Left cluster */}
        <div className="flex items-center gap-1 sm:gap-3 pointer-events-auto" onTouchStart={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
          <div className="bg-card/90 backdrop-blur border-2 border-card-border rounded-lg sm:rounded-2xl px-1.5 sm:px-4 py-1 sm:py-2 shadow-md">
            <div className="text-[8px] sm:text-xs uppercase font-bold text-muted-foreground tracking-wider">Lvl</div>
            <div className="font-display text-sm sm:text-2xl font-bold leading-none text-primary">{level}</div>
          </div>
          <div className="hidden sm:block bg-card/90 backdrop-blur border-2 border-card-border rounded-2xl px-4 py-2 shadow-md max-w-[36vw] sm:max-w-none">
            <div className="text-[10px] sm:text-xs uppercase font-bold text-muted-foreground tracking-wider">Stage</div>
            <div className="font-display text-sm sm:text-lg font-bold leading-none truncate">{levelName}</div>
          </div>
          {coins !== undefined && (
            <div className="relative">
              <motion.div
                key={coinPulseKey}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.22, 1] }}
                transition={{ duration: 0.35 }}
                className="flex items-center gap-1 bg-yellow-100 border-2 border-yellow-400 rounded-lg sm:rounded-2xl px-1.5 sm:px-4 py-1 sm:py-2 shadow-md"
                data-testid="text-hud-coins"
              >
                <Coins className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-yellow-500 fill-yellow-400" />
                <span className="font-display text-sm sm:text-2xl font-bold leading-none tabular-nums text-yellow-700">
                  {coins.toLocaleString()}
                </span>
              </motion.div>
              <AnimatePresence>
                {(coinPops ?? []).map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 1, y: 0, x: "-50%" }}
                    animate={{ opacity: 0, y: -32 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.85, ease: "easeOut" }}
                    className="absolute left-1/2 -top-1 font-display font-bold text-xs sm:text-sm text-yellow-500 pointer-events-none whitespace-nowrap"
                    style={{ textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}
                  >
                    +{p.amount}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Center timer ring — kept as the largest HUD element on mobile */}
        <div className={`relative pointer-events-auto ${isLow ? "animate-pulse" : ""}`}>
          <svg width="68" height="68" viewBox="0 0 100 100" className="drop-shadow-md sm:w-[86px] sm:h-[86px]">
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
        <div className="flex items-center gap-1 sm:gap-3 pointer-events-auto" onTouchStart={(e) => e.stopPropagation()} onTouchEnd={(e) => e.stopPropagation()}>
          <div className="bg-card/90 backdrop-blur border-2 border-card-border rounded-lg sm:rounded-2xl px-1.5 sm:px-4 py-1 sm:py-2 shadow-md text-right">
            <div className="text-[8px] sm:text-xs uppercase font-bold text-muted-foreground tracking-wider">Score</div>
            <div className="font-display text-sm sm:text-2xl font-bold leading-none tabular-nums">
              {score.toLocaleString()}
            </div>
            <div className="mt-0.5 flex items-center justify-end gap-1">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" className="text-primary sm:w-3 sm:h-3">
                <ellipse cx="12" cy="15" rx="6" ry="5" fill="currentColor" />
                <circle cx="9" cy="11" r="2" fill="currentColor" />
                <circle cx="15" cy="11" r="2" fill="currentColor" />
                <circle cx="6" cy="7" r="1.6" fill="currentColor" />
                <circle cx="18" cy="7" r="1.6" fill="currentColor" />
              </svg>
              <span className="font-display text-[10px] sm:text-xs font-bold tabular-nums">
                {miceLeft}/{miceTotal}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-1 sm:gap-2">
            <Button
              size="icon"
              variant="default"
              className="rounded-full shadow-md h-11 w-11 sm:h-10 sm:w-10"
              onClick={onPause}
              data-testid="button-pause"
            >
              <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              className="rounded-full shadow-md h-11 w-11 sm:h-10 sm:w-10"
              onClick={onToggleSound}
              data-testid="button-sound"
            >
              {sound ? <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" /> : <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />}
            </Button>
            {/* Cheese bait button — tap OR drag onto game canvas */}
            <button
              onClick={onDropBait}
              disabled={!cheeseAvailable}
              title={placingBait ? "Tap game to place bait!" : cheeseAvailable ? "Tap or drag 🧀 to place bait" : "Bait used"}
              onTouchStart={(e) => {
                if (!cheeseAvailable) return;
                e.stopPropagation();
                const t = e.changedTouches[0];
                if (t && onCheeseDragStart) onCheeseDragStart(t.clientX, t.clientY, t.identifier);
              }}
              className={`
                rounded-full shadow-md h-11 w-11 sm:h-10 sm:w-10 flex items-center justify-center text-base sm:text-lg
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
            {/* Fullscreen button */}
            {fullscreenSupported && onToggleFullscreen && (
              <Button
                size="icon"
                variant="secondary"
                className="rounded-full shadow-md h-11 w-11 sm:h-10 sm:w-10 transition-transform active:scale-90"
                onClick={onToggleFullscreen}
                title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
                data-testid="button-fullscreen"
              >
                {isFullscreen
                  ? <Minimize2 className="h-4 w-4 sm:h-5 sm:w-5" />
                  : <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5" />
                }
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Placing bait banner */}
      {placingBait && (
        <div className="max-w-5xl mx-auto mt-1 sm:mt-2 flex justify-center pointer-events-none">
          <div className="flex items-center gap-2 bg-yellow-400 text-yellow-900 border-2 border-yellow-600 rounded-full px-4 py-1 shadow-lg font-display font-bold text-xs sm:text-sm animate-pulse">
            <span>🧀</span>
            <span>Tap anywhere to place your bait!</span>
          </div>
        </div>
      )}

      {/* Combo indicator */}
      {combo >= 2 && (
        <div className="max-w-5xl mx-auto mt-1 sm:mt-2 flex justify-center pointer-events-none">
          <div className="flex items-center gap-2 bg-amber-500 text-amber-950 border-2 border-amber-700 rounded-full px-3 py-1 shadow-lg font-display font-bold text-xs sm:text-sm animate-pulse">
            <span>COMBO</span>
            <span className="text-base sm:text-lg">x{combo}</span>
          </div>
        </div>
      )}

      {/* Active power-up banner — sits directly under the timer on mobile */}
      {activePower && remaining > 0 && (
        <div className="max-w-5xl mx-auto mt-1 sm:mt-2 flex justify-center pointer-events-none">
          <div className="flex items-center gap-1.5 sm:gap-2 bg-card/95 backdrop-blur border-2 border-primary rounded-full pl-1.5 pr-3 sm:pl-2 sm:pr-4 py-0.5 sm:py-1 shadow-lg">
            <PowerUpIcon kind={activePower.kind} size={22} />
            <div className="font-display font-bold text-[11px] sm:text-sm">
              {powerUpLabel[activePower.kind]}
            </div>
            <div className="font-mono text-[10px] sm:text-xs text-muted-foreground">
              {remaining.toFixed(1)}s
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const HUD = memo(HUDInner);
