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
  if (ctx && ctx.state === "suspended") void ctx.resume();
  return ctx;
};

export const setAudioMuted = (m: boolean) => {
  muted = m;
  // When unmuting, reset all voice clocks so notes don't burst all at once
  if (!m) {
    const c = getCtx();
    if (c && _bgRunning) {
      const now = c.currentTime + 0.1;
      _voices.forEach(v => { v.nextTime = now; });
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Background music engine — world-aware, no audio files, pure Web Audio API
// ─────────────────────────────────────────────────────────────────────────────

type NoteSeq = [number, number][]; // [freq Hz, duration beats]
type InstrFn = (c: AudioContext, freq: number, start: number, beats: number, vol: number) => void;
interface MusicVoice { seq: NoteSeq; vol: number; play: InstrFn; idx: number; nextTime: number; }

let _bgRunning = false;
let _bgTimer: ReturnType<typeof setTimeout> | null = null;
let _bgBeat = 60 / 76;
let _voices: MusicVoice[] = [];

// ── Instrument synthesizers ──────────────────────────────────────────────────

// Marimba: triangle oscillator, fast percussive decay
function _marimba(c: AudioContext, freq: number, start: number, beats: number, vol: number) {
  const dur = beats * _bgBeat;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(0.05, dur * 0.60));
  osc.connect(g).connect(c.destination);
  osc.start(start); osc.stop(start + dur + 0.02);
}

// Flute: sine with gentle vibrato LFO, soft attack, full sustain
function _flute(c: AudioContext, freq: number, start: number, beats: number, vol: number) {
  const dur = beats * _bgBeat;
  const osc = c.createOscillator();
  const vib = c.createOscillator();
  const vibG = c.createGain();
  const g = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, start);
  // Vibrato: 5.5 Hz, fades in at ~30% of note
  vib.frequency.setValueAtTime(5.5, start);
  vibG.gain.setValueAtTime(0, start);
  vibG.gain.linearRampToValueAtTime(freq * 0.013, start + Math.max(0.06, dur * 0.28));
  vib.connect(vibG).connect(osc.frequency);
  // Flute envelope: soft 32ms attack, sustained body, 80ms release
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.032);
  g.gain.setValueAtTime(vol, start + Math.max(0.05, dur - 0.10));
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur + 0.01);
  osc.connect(g).connect(c.destination);
  osc.start(start); vib.start(start);
  osc.stop(start + dur + 0.06); vib.stop(start + dur + 0.06);
}

// Bell: sine fundamental + inharmonic partials, instant attack, long ring
function _bell(c: AudioContext, freq: number, start: number, _beats: number, vol: number) {
  const partials: [number, number][] = [
    [freq, 1.0], [freq * 2.76, 0.30], [freq * 5.4, 0.09],
  ];
  for (const [f, rel] of partials) {
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(f, start);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol * rel, start + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 1.8 * rel + 0.25);
    osc.connect(g).connect(c.destination);
    osc.start(start); osc.stop(start + 2.3);
  }
}

// Pad: soft sine bass note, slow attack, full sustain
function _pad(c: AudioContext, freq: number, start: number, beats: number, vol: number) {
  const dur = beats * _bgBeat;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(vol, start + 0.08);
  g.gain.setValueAtTime(vol, start + Math.max(0.10, dur - 0.12));
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g).connect(c.destination);
  osc.start(start); osc.stop(start + dur + 0.05);
}

// ── World melody configs ─────────────────────────────────────────────────────
// Each has independent voices that loop at their own pace (no sync needed).
// Note counts don't need to match — LCM creates natural variation over time.

const WORLD_MUSIC: Record<1 | 2 | 3, { bpm: number; voices: Pick<MusicVoice, "seq" | "vol" | "play">[] }> = {

  // 🌻 Sunny Fields — C major, bright marimba lead, energetic arpeggio, 80 BPM
  1: {
    bpm: 80,
    voices: [
      { play: _marimba, vol: 0.088, seq: [
        [784, 0.5], [659, 0.5], [523, 0.5], [659, 0.5],  // G5 E5 C5 E5
        [784, 0.5], [880, 0.5], [784, 1.0],               // G5 A5 G5
        [659, 0.5], [698, 0.5], [784, 0.5], [659, 0.5],  // E5 F5 G5 E5
        [587, 0.5], [659, 0.5], [523, 1.0],               // D5 E5 C5
      ]},
      { play: _marimba, vol: 0.040, seq: [  // xylophone arpeggio accompaniment
        [523, 0.5], [659, 0.5], [784, 0.5], [659, 0.5],
        [523, 0.5], [659, 0.5], [784, 0.5], [659, 0.5],
        [440, 0.5], [523, 0.5], [659, 0.5], [523, 0.5],
        [392, 0.5], [494, 0.5], [587, 0.5], [494, 0.5],
      ]},
      { play: _pad, vol: 0.030, seq: [      // soft bass pedal
        [131, 2.0], [175, 2.0], [110, 2.0], [196, 2.0],  // C3 F3 A2 G3
      ]},
    ],
  },

  // 🌲 Mystic Forest — A minor, gentle flute lead, sparse bell accents, 66 BPM
  2: {
    bpm: 66,
    voices: [
      { play: _flute, vol: 0.078, seq: [
        [659, 1.0], [587, 0.5], [523, 0.5],               // E5 D5 C5
        [494, 0.5], [440, 1.0], [523, 0.5],               // B4 A4 C5
        [440, 0.5], [494, 0.5], [523, 0.5], [587, 0.5],  // A4 B4 C5 D5
        [659, 2.0],                                        // E5 (long hold)
      ]},
      { play: _bell, vol: 0.052, seq: [     // magical bell accents — sparse
        [880, 4.0], [1047, 4.0],             // A5 C6, one per 4 beats
      ]},
      { play: _pad, vol: 0.026, seq: [      // A minor / C bass
        [110, 4.0], [131, 4.0],             // A2 C3
      ]},
    ],
  },

  // ☁️ Sky Kingdom — G major, adventurous flute, sparkle bells, 76 BPM
  3: {
    bpm: 76,
    voices: [
      { play: _flute, vol: 0.082, seq: [
        [587, 0.5], [784, 0.5], [988, 0.5], [880, 0.5],  // D5 G5 B5 A5  (leap up)
        [784, 0.5], [740, 0.5], [784, 1.0],               // G5 F#5 G5
        [659, 0.5], [587, 0.5], [494, 0.5], [587, 0.5],  // E5 D5 B4 D5
        [784, 0.5], [880, 0.5], [784, 1.0],               // G5 A5 G5
      ]},
      { play: _bell, vol: 0.058, seq: [     // sparkle bells — high register
        [1175, 2.0], [1319, 2.0],            // D6 E6
        [1175, 2.0], [1047, 2.0],            // D6 C6
      ]},
      { play: _pad, vol: 0.028, seq: [      // G / D bass
        [196, 4.0], [147, 4.0],             // G3 D3
      ]},
    ],
  },
};

// ── Scheduler loop ───────────────────────────────────────────────────────────

function _bgSchedule() {
  if (!_bgRunning) return;
  const c = getCtx();

  if (muted || !c) {
    // Keep clocks current while muted — no burst of notes when unmuted
    if (c) {
      const now = c.currentTime + 0.1;
      _voices.forEach(v => { v.nextTime = now; });
    }
  } else {
    const LOOKAHEAD = 0.18;
    for (const v of _voices) {
      while (v.nextTime < c.currentTime + LOOKAHEAD) {
        const [freq, beats] = v.seq[v.idx % v.seq.length];
        v.play(c, freq, v.nextTime, beats, v.vol);
        v.nextTime += beats * _bgBeat;
        v.idx++;
      }
    }
  }

  _bgTimer = setTimeout(_bgSchedule, 25);
}

export const startBgMusic = (world: 1 | 2 | 3 = 1) => {
  if (_bgRunning) return;
  const c = getCtx();
  if (!c) return;
  const cfg = WORLD_MUSIC[world];
  _bgBeat = 60 / cfg.bpm;
  const t0 = c.currentTime + 0.3;
  _voices = cfg.voices.map(v => ({ ...v, idx: 0, nextTime: t0 }));
  _bgRunning = true;
  _bgSchedule();
};

export const stopBgMusic = () => {
  _bgRunning = false;
  if (_bgTimer !== null) { clearTimeout(_bgTimer); _bgTimer = null; }
  _voices = [];
  // Already-scheduled short notes trail off naturally within one beat
};

// ─────────────────────────────────────────────────────────────────────────────
// SFX — game sound effects (all one-shot, respect mute toggle)
// ─────────────────────────────────────────────────────────────────────────────

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

  // Combo-aware catch: pitch steps up each chained catch (A4 → C#5 → E5 → A5)
  catchCombo: (combo: number) => {
    const semis = [0, 0, 4, 7, 12, 14];
    const steps = semis[Math.min(combo, semis.length - 1)] ?? 14;
    const shift = Math.pow(2, steps / 12);
    tone(523 * shift, 0.10, "square",   0.20, 0);
    tone(659 * shift, 0.10, "square",   0.20, 0.08);
    tone(784 * shift, 0.16, "square",   0.20, 0.16);
    tone(1046 * shift, 0.22, "triangle", 0.18, 0.24);
  },

  // Legacy alias kept for safety
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

  power: () => {
    tone(800, 0.08, "sine", 0.18, 0, 1400);
    tone(1200, 0.10, "sine", 0.16, 0.06, 1800);
  },

  cheese: () => {
    tone(260, 0.18, "triangle", 0.22, 0, 180);
    tone(520, 0.10, "sine",     0.14, 0.05, 380);
  },

  water: () => {
    tone(900, 0.05, "sine",     0.12, 0, 220);
    tone(650, 0.10, "triangle", 0.10, 0.04, 300);
    tone(420, 0.14, "sine",     0.08, 0.11, 160);
  },

  fail: () => {
    tone(300, 0.18, "sawtooth", 0.18, 0, 80);
    tone(200, 0.24, "sawtooth", 0.16, 0.10, 60);
  },

  lifeLost: () => {
    tone(523, 0.20, "sawtooth", 0.16, 0, 392);
    tone(392, 0.22, "sawtooth", 0.14, 0.18, 294);
    tone(294, 0.28, "sawtooth", 0.12, 0.36, 196);
  },

  win: () => {
    const notes = [523, 659, 784, 1046, 1318];
    notes.forEach((f, i) => tone(f, 0.18, "triangle", 0.18, i * 0.10));
  },

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
