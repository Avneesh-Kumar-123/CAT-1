import { useRef, useState } from "react";

type Props = {
  onChange: (dx: number, dy: number) => void;
  floating?: boolean;
};

const RADIUS = 64;
const KNOB = 52;

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
            style={{
              left: base.x,
              top: base.y,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div
              className="relative rounded-full"
              style={{
                width: RADIUS * 2,
                height: RADIUS * 2,
                border: "3px solid rgba(255,255,255,0.45)",
                background: "rgba(255,255,255,0.18)",
                backdropFilter: "blur(6px)",
              }}
            >
              <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.35 }}>
                <span className="absolute top-1.5 left-1/2 -translate-x-1/2 text-white text-xs font-bold">▲</span>
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-white text-xs font-bold">▼</span>
                <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-white text-xs font-bold">◀</span>
                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white text-xs font-bold">▶</span>
              </div>
              <div
                className="absolute rounded-full shadow-md"
                style={{
                  width: KNOB,
                  height: KNOB,
                  left: `calc(50% - ${KNOB / 2}px + ${stick?.x ?? 0}px)`,
                  top: `calc(50% - ${KNOB / 2}px + ${stick?.y ?? 0}px)`,
                  background: "rgba(255,255,255,0.92)",
                  border: "3px solid rgba(255,255,255,0.95)",
                  transition: stick ? "none" : "all 150ms ease-out",
                }}
              />
            </div>
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

  return (
    <div
      className="touch-none select-none"
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
      <div
        ref={baseRef}
        className="relative rounded-full shadow-lg"
        style={{
          width: RADIUS * 2,
          height: RADIUS * 2,
          border: "3px solid rgba(255,255,255,0.35)",
          background: "rgba(255,255,255,0.18)",
          backdropFilter: "blur(6px)",
        }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: stick ? 0.25 : 0.45 }}>
          <span className="absolute top-1.5 left-1/2 -translate-x-1/2 text-white text-xs font-bold">▲</span>
          <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 text-white text-xs font-bold">▼</span>
          <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-white text-xs font-bold">◀</span>
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-white text-xs font-bold">▶</span>
        </div>
        <div
          className="absolute rounded-full shadow-md"
          style={{
            width: KNOB,
            height: KNOB,
            left: `calc(50% - ${KNOB / 2}px + ${stick?.x ?? 0}px)`,
            top: `calc(50% - ${KNOB / 2}px + ${stick?.y ?? 0}px)`,
            background: stick ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.75)",
            border: "3px solid rgba(255,255,255,0.95)",
            transition: stick ? "none" : "all 150ms ease-out",
          }}
        />
      </div>
    </div>
  );
};
