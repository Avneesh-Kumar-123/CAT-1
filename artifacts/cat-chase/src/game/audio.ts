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
  // When unmuting, reset the music clock so notes don't burst all at once
  if (!m) {
    const c = getCtx();
    if (c && _bgRunning) _bgNextNoteTime = c.currentTime + 0.1;
  }
};

// ── Background music ────────────────────────────────────────────────────────
// Procedural marimba-style loop — no audio files, pure Web Audio API synthesis

const BPM = 72;
const BEAT = 60 / BPM; // ~0.833s per beat

// 12-beat melody in C major — pleasant, unhurried, loops seamlessly
// [frequency Hz, duration in beats]
const BG_MELODY: [number, number][] = [
  [784, 0.5], [659, 0.5], [523, 1.0],   // G5 E5 C5(hold)
  [659, 0.5], [784, 0.5], [880, 1.0],   // E5 G5 A5(hold)
  [784, 0.5], [659, 0.5], [523, 0.5], [587, 0.5], // G5 E5 C5 D5
  [659, 1.0], [523, 2.0],               // E5 C5(long hold)
];
// Soft bass pedal notes under the melody — C and A roots
const BG_BASS: [number, number][] = [
  [130, 4.0], [110, 4.0], [130, 4.0],  // C3 A2 C3
];

let _bgRunning = false;
let _bgTimer: ReturnType<typeof setTimeout> | null = null;
let _bgMelIdx = 0;
let _bgBassIdx = 0;
let _bgNextNoteTime = 0;
let _bgNextBassTime = 0;

function _scheduleMarimba(c: AudioContext, freq: number, start: number, beats: number, vol: number) {
  const osc = c.createOscillator();
  const g = c.createGain();
  const dur = beats * BEAT;
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.008);
  // Marimba decays quickly — fade out at 60% of the note duration
  g.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(0.05, dur * 0.65));
  osc.connect(g).connect(c.destination);
  osc.start(start);
  osc.stop(start + dur);
}

function _bgSchedule() {
  if (!_bgRunning) return;
  const c = getCtx();

  if (muted || !c) {
    // Muted: keep clock current so unmuting never causes a note burst
    if (c) {
      _bgNextNoteTime = c.currentTime + 0.1;
      _bgNextBassTime = c.currentTime + 0.1;
    }
  } else {
    const LOOKAHEAD = 0.18; // seconds of notes to pre-schedule each tick

    // Melody voice
    while (_bgNextNoteTime < c.currentTime + LOOKAHEAD) {
      const [freq, beats] = BG_MELODY[_bgMelIdx % BG_MELODY.length];
      _scheduleMarimba(c, freq, _bgNextNoteTime, beats, 0.09);
      _bgNextNoteTime += beats * BEAT;
      _bgMelIdx++;
    }
    // Bass voice (softer, longer notes)
    while (_bgNextBassTime < c.currentTime + LOOKAHEAD) {
      const [freq, beats] = BG_BASS[_bgBassIdx % BG_BASS.length];
      _scheduleMarimba(c, freq, _bgNextBassTime, beats, 0.04);
      _bgNextBassTime += beats * BEAT;
      _bgBassIdx++;
    }
  }

  _bgTimer = setTimeout(_bgSchedule, 25);
}

export const startBgMusic = () => {
  if (_bgRunning) return; // already playing
  const c = getCtx();
  if (!c) return;
  _bgRunning = true;
  _bgMelIdx = 0;
  _bgBassIdx = 0;
  _bgNextNoteTime = c.currentTime + 0.3;
  _bgNextBassTime = c.currentTime + 0.3;
  _bgSchedule();
};

export const stopBgMusic = () => {
  _bgRunning = false;
  if (_bgTimer !== null) {
    clearTimeout(_bgTimer);
    _bgTimer = null;
  }
  // Already-scheduled short notes trail off naturally within one beat
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

  // Countdown: each number steps up a major third (A4 → C#5 → E5), building tension
  countdownTick: (n: 3 | 2 | 1) => {
    const freqs: Record<number, number> = { 3: 440, 2: 554, 1: 659 };
    const f = freqs[n] ?? 440;
    tone(f,     0.10, "square",   0.22, 0);
    tone(f * 2, 0.08, "triangle", 0.10, 0.07, f * 1.6);
  },
  // GO! — bright C major triad stab + rising sparkle
  countdownGo: () => {
    tone(523,  0.30, "triangle", 0.18, 0);       // C5
    tone(659,  0.30, "triangle", 0.16, 0);       // E5
    tone(784,  0.34, "triangle", 0.14, 0);       // G5
    tone(1046, 0.22, "triangle", 0.12, 0.05, 1400); // sparkle tail
  },

  click: () => {
    tone(700, 0.04, "square", 0.10, 0);
  },

  step: () => {
    tone(180 + Math.random() * 40, 0.04, "triangle", 0.06, 0);
  },
};
