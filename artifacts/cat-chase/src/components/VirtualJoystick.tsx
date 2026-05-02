import { useRef, useState } from "react";

type Props = {
  onChange: (dx: number, dy: number) => void;
};

export const VirtualJoystick = ({ onChange }: Props) => {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const [stick, setStick] = useState<{ x: number; y: number } | null>(null);
  const activeId = useRef<number | null>(null);

  const compute = (clientX: number, clientY: number) => {
    const el = baseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const max = rect.width / 2;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, max);
    const angle = Math.atan2(dy, dx);
    const sx = Math.cos(angle) * clamped;
    const sy = Math.sin(angle) * clamped;
    setStick({ x: sx, y: sy });
    onChange(sx / max, sy / max);
  };

  const release = () => {
    activeId.current = null;
    setStick(null);
    onChange(0, 0);
  };

  return (
    <div
      className="touch-none select-none"
      onTouchStart={(e) => {
        e.preventDefault();
        const t = e.changedTouches[0];
        if (!t) return;
        activeId.current = t.identifier;
        compute(t.clientX, t.clientY);
      }}
      onTouchMove={(e) => {
        e.preventDefault();
        for (const t of Array.from(e.changedTouches)) {
          if (t.identifier === activeId.current) compute(t.clientX, t.clientY);
        }
      }}
      onTouchEnd={(e) => {
        for (const t of Array.from(e.changedTouches)) {
          if (t.identifier === activeId.current) release();
        }
      }}
      onTouchCancel={release}
    >
      <div
        ref={baseRef}
        className="relative h-32 w-32 rounded-full shadow-lg"
        style={{
          border: "3px solid rgba(255,255,255,0.35)",
          background: "rgba(255,255,255,0.18)",
          backdropFilter: "blur(6px)",
        }}
      >
        {/* Direction arrows */}
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: stick ? 0.25 : 0.45 }}>
          <span className="absolute top-1.5 left-1/2 -translate-x-1/2 text-white text-xs font-bold">▲</span>
          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-white text-xs font-bold">▼</span>
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-white text-xs font-bold">◀</span>
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white text-xs font-bold">▶</span>
        </div>
        {/* Stick knob */}
        <div
          className="absolute rounded-full shadow-md"
          style={{
            width: 52,
            height: 52,
            left: `calc(50% - 26px + ${stick?.x ?? 0}px)`,
            top: `calc(50% - 26px + ${stick?.y ?? 0}px)`,
            background: stick
              ? "rgba(255,255,255,0.9)"
              : "rgba(255,255,255,0.75)",
            border: "3px solid rgba(255,255,255,0.95)",
            transition: stick ? "none" : "all 150ms ease-out",
          }}
        />
      </div>
    </div>
  );
};
