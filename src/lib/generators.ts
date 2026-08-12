import { GeneratorId } from "./demoTracks";

export interface RunningGenerator {
  stop: () => void;
}

// A minor-ish and C major-ish pitch sets (Hz), enough for simple procedural loops.
const SCALE_MIN = [220, 246.94, 261.63, 293.66, 329.63, 349.23, 392, 440];
const SCALE_MAJ = [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25];

// Starts a short, looping, purely synthesized pattern (oscillators + filtered
// noise bursts) feeding into `out`, so it can be analysed exactly like a real
// track. Entirely original per-run audio - no sample or recording involved.
export function startGenerator(ctx: AudioContext, out: AudioNode, kind: GeneratorId): RunningGenerator {
  const master = ctx.createGain();
  master.gain.value = 0.35;
  master.connect(out);

  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;

  const tone = (t: number, freq: number, dur: number, wave: OscillatorType, peak: number) => {
    const osc = ctx.createOscillator();
    osc.type = wave;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + Math.min(0.03, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  };

  const hit = (t: number, dur: number, peak: number, lowpassHz: number) => {
    const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.frequency.value = lowpassHz;
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filt).connect(g).connect(master);
    src.start(t);
  };

  function scheduleLoop(loopStart: number) {
    if (stopped) return;
    let loopLen = 4;

    if (kind === "ambient") {
      loopLen = 8;
      [0, 2, 4, 7].forEach((deg, i) => tone(loopStart + i * 2, SCALE_MIN[deg] / 2, 3.5, "sine", 0.5));
    } else if (kind === "electro") {
      loopLen = 4;
      const step = loopLen / 8;
      [0, 0, 3, 0, 0, 5, 3, 0].forEach((deg, i) => tone(loopStart + i * step, SCALE_MIN[deg] / 4, step * 0.8, "sawtooth", 0.4));
      for (let i = 0; i < 16; i++) hit(loopStart + i * (loopLen / 16), 0.04, 0.25, 8000);
    } else if (kind === "arpeggio") {
      loopLen = 4;
      const arp = [0, 2, 4, 7, 4, 2];
      const step = loopLen / arp.length;
      arp.forEach((deg, i) => tone(loopStart + i * step, SCALE_MAJ[deg], step * 0.9, "triangle", 0.35));
    } else if (kind === "rock") {
      loopLen = 4;
      const step = loopLen / 8;
      for (let i = 0; i < 8; i++) {
        if (i % 2 === 0) tone(loopStart + i * step, SCALE_MIN[0] / 4, step * 0.6, "square", 0.4);
        const accent = i % 4 === 2;
        hit(loopStart + i * step, accent ? 0.15 : 0.05, accent ? 0.5 : 0.2, accent ? 500 : 6000);
      }
    }

    const delayMs = Math.max(50, (loopLen - 0.3) * 1000);
    timer = setTimeout(() => scheduleLoop(ctx.currentTime + 0.05), delayMs);
  }

  scheduleLoop(ctx.currentTime + 0.05);

  return {
    stop() {
      stopped = true;
      clearTimeout(timer);
      master.disconnect();
    },
  };
}
