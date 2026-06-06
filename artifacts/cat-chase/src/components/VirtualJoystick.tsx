import { useRef, useState } from "react";

type Props = {
  onChange: (dx: number, dy: number) => void;
  floating?: boolean;
};

const RADIUS = 82;
const KNOB = 66;

export const VirtualJoystick = ({ onChange, floating = false }: Props) => {
  const activeId = useRef<number | null>(null);
  const [base, setBase] = useState<{ x: number; y: number } | null>(null);
  const [stick, setStick] = useState<{ x: number; y: number } | null>(null);
  const baseRef = useRef<HTMLDivElement | null>(null);

  const computeFixed = (clientX: number, clientY: number) => {
    const el = baseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    apply(clientX, clientY, cx, cy);
  };

  const apply = (clientX: number, clientY: number, cx: number, cy: number) => {
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, RADIUS);
    const angle = Math.atan2(dy, dx);
    const sx = Math.cos(angle) * clamped;
    const sy = Math.sin(angle) * clamped;
    setStick({ x: sx, y: sy });
    onChange(sx / RADIUS, sy / RADIUS);
  };

  const release = () => {
    activeId.current = null;
    setStick(null);
    setBase(null);
    onChange(0, 0);
  };

  if (floating) {
    return (
      <div
        className="touch-none select-none absolute inset-0"
        style={{ touchAction: "none" }}
        onTouchStart={(e) => {
          e.preventDefault();
          const t = e.changedTouches[0];
          if (!t) return;
          activeId.current = t.identifier;
          setBase({ x: t.clientX, y: t.clientY });
          setStick({ x: 0, y: 0 });
          onChange(0, 0);
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          for (const t of Array.from(e.changedTouches)) {
            if (t.identifier === activeId.current && base) {
              apply(t.clientX, t.clientY, base.x, base.y);
            }
          }
        }}
        onTouchEnd={(e) => {
          for (const t of Array.from(e.changedTouches)) {
            if (t.identifier === activeId.current) release();
          }
        }}
        onTouchCancel={release}
      >
        {base && (
          <div
            className="pointer-events-none absolute"
            style={{ left: base.x, top: base.y, transform: "translate(-50%, -50%)" }}
          >
            <JoystickBase stick={stick} radius={RADIUS} knob={KNOB} />
          </div>
        )}
        {!base && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-1 text-white/40 text-xs font-bold select-none">
              <span className="text-2xl leading-none">👆</span>
              <span>Touch anywhere to steer</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  /* ── Fixed joystick: always-visible base, bottom-left ── */
  return (
    <div
      className="touch-none select-none"
      style={{ touchAction: "none" }}
      onTouchStart={(e) => {
        e.preventDefault();
        const t = e.changedTouches[0];
        if (!t) return;
        activeId.current = t.identifier;
        computeFixed(t.clientX, t.clientY);
      }}
      onTouchMove={(e) => {
        e.preventDefault();
        for (const t of Array.from(e.changedTouches)) {
          if (t.identifier === activeId.current) computeFixed(t.clientX, t.clientY);
        }
      }}
      onTouchEnd={(e) => {
        for (const t of Array.from(e.changedTouches)) {
          if (t.identifier === activeId.current) release();
        }
      }}
      onTouchCancel={release}
    >
      <div ref={baseRef}>
        <JoystickBase stick={stick} radius={RADIUS} knob={KNOB} fixed />
      </div>
    </div>
  );
};

/* ── Shared visual base ── */
const JoystickBase = ({
  stick,
  radius,
  knob,
  fixed = false,
}: {
  stick: { x: number; y: number } | null;
  radius: number;
  knob: number;
  fixed?: boolean;
}) => {
  const active = !!stick;
  return (
    <div
      className="relative rounded-full"
      style={{
        width: radius * 2,
        height: radius * 2,
        background: fixed
          ? "rgba(0,0,0,0.38)"
          : "rgba(255,255,255,0.18)",
        border: `3.5px solid ${active ? "rgba(249,115,22,0.85)" : "rgba(255,255,255,0.42)"}`,
        backdropFilter: "blur(8px)",
        boxShadow: active
          ? "0 0 0 4px rgba(249,115,22,0.25), 0 4px 20px rgba(0,0,0,0.45)"
          : "0 4px 20px rgba(0,0,0,0.4)",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      {/* Direction indicators */}
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: active ? 0.2 : 0.5 }}>
        <span className="absolute top-2 left-1/2 -translate-x-1/2 text-white font-bold text-sm leading-none">▲</span>
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-white font-bold text-sm leading-none">▼</span>
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-white font-bold text-sm leading-none">◀</span>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-white font-bold text-sm leading-none">▶</span>
      </div>

      {/* Knob */}
      <div
        className="absolute rounded-full"
        style={{
          width: knob,
          height: knob,
          left: `calc(50% - ${knob / 2}px + ${stick?.x ?? 0}px)`,
          top: `calc(50% - ${knob / 2}px + ${stick?.y ?? 0}px)`,
          background: active
            ? "radial-gradient(circle at 35% 35%, #fbbf24, #f97316)"
            : "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.95), rgba(255,255,255,0.75))",
          border: active ? "3px solid rgba(255,255,255,0.9)" : "3px solid rgba(255,255,255,0.85)",
          boxShadow: active
            ? "0 2px 12px rgba(249,115,22,0.6), inset 0 1px 2px rgba(255,255,255,0.5)"
            : "0 3px 10px rgba(0,0,0,0.35), inset 0 1px 2px rgba(255,255,255,0.6)",
          transition: stick ? "none" : "all 180ms cubic-bezier(0.34,1.56,0.64,1)",
        }}
      />
    </div>
  );
};
