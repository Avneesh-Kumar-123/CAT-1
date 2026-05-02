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
  catch: () => {
    tone(523, 0.1, "square", 0.2, 0);
    tone(659, 0.1, "square", 0.2, 0.08);
    tone(784, 0.16, "square", 0.2, 0.16);
    tone(1046, 0.22, "triangle", 0.18, 0.24);
  },
  squeak: () => {
    tone(1200, 0.08, "sawtooth", 0.12, 0, 1800);
    tone(1500, 0.1, "sawtooth", 0.10, 0.06, 800);
  },
  power: () => {
    tone(800, 0.08, "sine", 0.18, 0, 1400);
    tone(1200, 0.1, "sine", 0.16, 0.06, 1800);
  },
  fail: () => {
    tone(300, 0.18, "sawtooth", 0.18, 0, 80);
    tone(200, 0.24, "sawtooth", 0.16, 0.1, 60);
  },
  win: () => {
    const notes = [523, 659, 784, 1046, 1318];
    notes.forEach((f, i) => tone(f, 0.18, "triangle", 0.18, i * 0.1));
  },
  click: () => {
    tone(700, 0.04, "square", 0.10, 0);
  },
  step: () => {
    tone(180 + Math.random() * 40, 0.04, "triangle", 0.06, 0);
  },
};
