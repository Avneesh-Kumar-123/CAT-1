import type { CSSProperties } from "react";

type CatProps = {
  size?: number;
  facing?: number;
  bounce?: number;
  color?: string;
  style?: CSSProperties;
};

export const CatSprite = ({ size = 56, facing = 0, bounce = 0, color = "#f97316", style }: CatProps) => {
  const flipX = Math.cos(facing) < 0 ? -1 : 1;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      style={{
        transform: `scaleX(${flipX}) translateY(${-Math.abs(Math.sin(bounce)) * 3}px)`,
        transition: "transform 60ms",
        ...style,
      }}
    >
      {/* Tail */}
      <path
        d={`M10 38 Q -2 30 6 22 Q 10 18 14 22`}
        fill={color}
        stroke="#7c2d12"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Body */}
      <ellipse cx="32" cy="42" rx="18" ry="14" fill={color} stroke="#7c2d12" strokeWidth="2.5" />
      {/* Belly */}
      <ellipse cx="32" cy="46" rx="11" ry="8" fill="#fff7ed" />
      {/* Head */}
      <circle cx="40" cy="28" r="14" fill={color} stroke="#7c2d12" strokeWidth="2.5" />
      {/* Ears */}
      <path d="M30 18 L28 8 L36 16 Z" fill={color} stroke="#7c2d12" strokeWidth="2" strokeLinejoin="round" />
      <path d="M50 18 L52 8 L44 16 Z" fill={color} stroke="#7c2d12" strokeWidth="2" strokeLinejoin="round" />
      <path d="M30 16 L30 11 L34 14 Z" fill="#fda4af" />
      <path d="M50 16 L50 11 L46 14 Z" fill="#fda4af" />
      {/* Eyes */}
      <circle cx="36" cy="27" r="3" fill="#fff" />
      <circle cx="46" cy="27" r="3" fill="#fff" />
      <circle cx="37" cy="28" r="1.6" fill="#0f172a" />
      <circle cx="47" cy="28" r="1.6" fill="#0f172a" />
      {/* Nose & mouth */}
      <path d="M40 31 L41.5 33 L38.5 33 Z" fill="#fb7185" />
      <path d="M40 33 Q38 35 36 34 M40 33 Q42 35 44 34" stroke="#7c2d12" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* Whiskers */}
      <path d="M34 32 L28 31 M34 33 L28 34 M46 32 L52 31 M46 33 L52 34" stroke="#7c2d12" strokeWidth="1" fill="none" strokeLinecap="round" />
      {/* Front legs */}
      <ellipse cx="24" cy="54" rx="4" ry="3" fill={color} stroke="#7c2d12" strokeWidth="2" />
      <ellipse cx="40" cy="55" rx="4" ry="3" fill={color} stroke="#7c2d12" strokeWidth="2" />
    </svg>
  );
};

type MouseProps = {
  size?: number;
  facing?: number;
  bounce?: number;
  variant?: "normal" | "decoy" | "boss";
  style?: CSSProperties;
};

export const MouseSprite = ({ size = 38, facing = 0, bounce = 0, variant = "normal", style }: MouseProps) => {
  const flipX = Math.cos(facing) < 0 ? -1 : 1;
  const body = variant === "boss" ? "#9ca3af" : variant === "decoy" ? "#cbd5e1" : "#d1d5db";
  const stroke = variant === "boss" ? "#1e293b" : "#475569";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      style={{
        transform: `scaleX(${flipX}) translateY(${-Math.abs(Math.sin(bounce)) * 2}px)`,
        transition: "transform 60ms",
        ...style,
      }}
    >
      {/* Tail */}
      <path d="M8 30 Q 0 26 4 18" stroke={stroke} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Body */}
      <ellipse cx="24" cy="30" rx="14" ry="10" fill={body} stroke={stroke} strokeWidth="2" />
      {/* Head */}
      <circle cx="34" cy="22" r="9" fill={body} stroke={stroke} strokeWidth="2" />
      {/* Ears */}
      <circle cx="29" cy="14" r="4.5" fill={body} stroke={stroke} strokeWidth="1.5" />
      <circle cx="29" cy="14" r="2.5" fill="#fda4af" />
      <circle cx="38" cy="14" r="4.5" fill={body} stroke={stroke} strokeWidth="1.5" />
      <circle cx="38" cy="14" r="2.5" fill="#fda4af" />
      {/* Eyes */}
      <circle cx="33" cy="22" r="1.6" fill="#0f172a" />
      <circle cx="38" cy="22" r="1.6" fill="#0f172a" />
      {/* Nose */}
      <circle cx="42" cy="24" r="1.6" fill="#fb7185" />
      {variant === "boss" && (
        <path d="M22 12 L26 6 L30 10 L34 4 L38 10 L42 6 L44 12" stroke="#fbbf24" strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      )}
    </svg>
  );
};
