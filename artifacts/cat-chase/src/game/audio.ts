let ctx: AudioContext | null = null;
let muted = false;

const getCtx = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const W = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
      const Ctor = W.AudioContext ?? W.webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  if (ctx && ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
};

export const setAudioMuted = (m: boolean) => {
  muted = m;
};

const tone = (
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  vol = 0.18,
  startOffset = 0,
  freqEnd?: number,
) => {
  if (muted) return;
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const g = c.createGain();
  const t = c.currentTime + startOffset;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (freqEnd !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t + duration);
  }
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + duration + 0.05);
};

export const sfx = {
  pounce: () => {
    tone(440, 0.12, "square", 0.18, 0, 880);
    tone(660, 0.18, "triangle", 0.12, 0.05, 1320);
  },

  // Combo-aware catch: pitch steps up each chained catch (C→E→G→high C)
  catchCombo: (combo: number) => {
    const semis = [0, 0, 4, 7, 12, 14];
    const steps = semis[Math.min(combo, semis.length - 1)] ?? 14;
    const shift = Math.pow(2, steps / 12);
    tone(523 * shift, 0.10, "square", 0.20, 0);
    tone(659 * shift, 0.10, "square", 0.20, 0.08);
    tone(784 * shift, 0.16, "square", 0.20, 0.16);
    tone(1046 * shift, 0.22, "triangle", 0.18, 0.24);
  },

  // Legacy alias (kept for safety — nothing calls it now but guards against future imports)
  catch: () => {
    tone(523, 0.10, "square", 0.20, 0);
    tone(659, 0.10, "square", 0.20, 0.08);
    tone(784, 0.16, "square", 0.20, 0.16);
    tone(1046, 0.22, "triangle", 0.18, 0.24);
  },

  squeak: () => {
    tone(1200, 0.08, "sawtooth", 0.12, 0, 1800);
    tone(1500, 0.10, "sawtooth", 0.10, 0.06, 800);
  },

  // Per-type power-up sounds — each has a distinct feel
  powerSpeed: () => {
    tone(400, 0.10, "sawtooth", 0.14, 0, 1000);
    tone(800, 0.12, "sine",     0.16, 0.06, 1600);
    tone(1200, 0.10, "triangle", 0.12, 0.14, 1900);
  },
  powerFreeze: () => {
    tone(1800, 0.14, "triangle", 0.14, 0, 1200);
    tone(1300, 0.16, "triangle", 0.12, 0.07, 900);
    tone(900,  0.20, "sine",     0.10, 0.16, 600);
  },
  powerMagnet: () => {
    tone(120, 0.22, "sine",     0.20, 0, 80);
    tone(380, 0.14, "triangle", 0.14, 0.08, 700);
    tone(680, 0.12, "sine",     0.12, 0.18, 1100);
  },
  powerExtra: () => {
    tone(880,  0.12, "triangle", 0.18, 0);
    tone(1109, 0.16, "triangle", 0.16, 0.10);
    tone(1320, 0.20, "triangle", 0.14, 0.20);
  },

  // Generic fallback (cheese bait + any unlisted power call)
  power: () => {
    tone(800, 0.08, "sine", 0.18, 0, 1400);
    tone(1200, 0.10, "sine", 0.16, 0.06, 1800);
  },

  // Cheese bait deploy — warm satisfying "plonk"
  cheese: () => {
    tone(260, 0.18, "triangle", 0.22, 0, 180);
    tone(520, 0.10, "sine",     0.14, 0.05, 380);
  },

  // One-shot water splash — fires on entry only, never loops
  water: () => {
    tone(900, 0.05, "sine",     0.12, 0, 220);
    tone(650, 0.10, "triangle", 0.10, 0.04, 300);
    tone(420, 0.14, "sine",     0.08, 0.11, 160);
  },

  fail: () => {
    tone(300, 0.18, "sawtooth", 0.18, 0, 80);
    tone(200, 0.24, "sawtooth", 0.16, 0.10, 60);
  },

  // Descending wah-wah — playful life-lost sound (plays after fail snap)
  lifeLost: () => {
    tone(523, 0.20, "sawtooth", 0.16, 0, 392);
    tone(392, 0.22, "sawtooth", 0.14, 0.18, 294);
    tone(294, 0.28, "sawtooth", 0.12, 0.36, 196);
  },

  win: () => {
    const notes = [523, 659, 784, 1046, 1318];
    notes.forEach((f, i) => tone(f, 0.18, "triangle", 0.18, i * 0.10));
  },

  // Warm harp glissando + bell — rarer than win so slightly more elaborate
  achievement: () => {
    const gliss = [523, 659, 784, 880, 1047, 1319];
    gliss.forEach((f, i) => tone(f, 0.20, "triangle", 0.14, i * 0.06));
    tone(1760, 0.40, "sine", 0.16, gliss.length * 0.06);
  },

  click: () => {
    tone(700, 0.04, "square", 0.10, 0);
  },

  step: () => {
    tone(180 + Math.random() * 40, 0.04, "triangle", 0.06, 0);
  },
};
