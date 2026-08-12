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
  master.gain.value = 0.32;

  // Gentle master lowpass so raw oscillator harmonics (esp. saw/square) don't
  // buzz - takes the edge off without making everything sound muffled.
  const masterFilter = ctx.createBiquadFilter();
  masterFilter.type = "lowpass";
  masterFilter.frequency.value = 5400;
  masterFilter.Q.value = 0.3;

  // A short feedback delay adds a bit of space/warmth so notes don't feel
  // like dry, isolated beeps - subtle send, not a big cavernous reverb.
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.27;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.26;
  const delayTone = ctx.createBiquadFilter();
  delayTone.type = "lowpass";
  delayTone.frequency.value = 2200;
  const delaySend = ctx.createGain();
  delaySend.gain.value = 0.2;

  master.connect(masterFilter);
  masterFilter.connect(out);
  masterFilter.connect(delaySend);
  delaySend.connect(delay);
  delay.connect(delayTone);
  delayTone.connect(feedback);
  feedback.connect(delay);
  delayTone.connect(out);

  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;

  // One note = two slightly detuned unison oscillators through a filter whose
  // cutoff opens on attack and eases back down - a small, standard trick that
  // turns a flat single oscillator into something that sounds like an actual
  // instrument voice instead of a test-tone beep.
  const tone = (t: number, freq: number, dur: number, wave: OscillatorType, peak: number) => {
    const filt = ctx.createBiquadFilter();
    filt.type = "lowpass";
    filt.Q.value = 0.7;
    const openHz = Math.min(9000, freq * 5 + 800);
    filt.frequency.setValueAtTime(freq * 1.3, t);
    filt.frequency.linearRampToValueAtTime(openHz, t + Math.min(0.05, dur * 0.25));
    filt.frequency.exponentialRampToValueAtTime(Math.max(220, freq * 1.6), t + dur);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(peak, t + Math.min(0.03, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    filt.connect(g).connect(master);

    // Two unison voices roughly double the summed amplitude, so each gets
    // scaled down rather than letting them stack toward clipping.
    for (const detune of [-6, 6]) {
      const osc = ctx.createOscillator();
      osc.type = wave;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const voiceGain = ctx.createGain();
      voiceGain.gain.value = 0.55;
      osc.connect(voiceGain).connect(filt);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    }
  };

  // Pitch-drop sine "kick" (classic 808-style synthesis) - reads as a punchy,
  // warm thump. Filtered noise alone sounds weak/muddy at kick frequencies.
  const kick = (t: number, dur: number, peak: number) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(46, t + dur * 0.9);
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  };

  const hit = (t: number, dur: number, peak: number, toneHz: number, q = 0.9) => {
    const n = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = "bandpass";
    filt.frequency.value = toneHz;
    filt.Q.value = q;
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
      [0, 2, 4, 7].forEach((deg, i) => tone(loopStart + i * 2, SCALE_MIN[deg] / 2, 3.5, "sine", 0.42));
    } else if (kind === "electro") {
      loopLen = 4;
      const step = loopLen / 8;
      [0, 0, 3, 0, 0, 5, 3, 0].forEach((deg, i) => tone(loopStart + i * step, SCALE_MIN[deg] / 4, step * 0.8, "sawtooth", 0.3));
      for (let i = 0; i < 16; i++) hit(loopStart + i * (loopLen / 16), 0.035, 0.14, 7500, 1.4);
    } else if (kind === "arpeggio") {
      loopLen = 4;
      const arp = [0, 2, 4, 7, 4, 2];
      const step = loopLen / arp.length;
      arp.forEach((deg, i) => tone(loopStart + i * step, SCALE_MAJ[deg], step * 0.9, "triangle", 0.3));
    } else if (kind === "rock") {
      loopLen = 4;
      const step = loopLen / 8;
      for (let i = 0; i < 8; i++) {
        if (i % 2 === 0) tone(loopStart + i * step, SCALE_MIN[0] / 4, step * 0.6, "square", 0.26);
        const accent = i % 4 === 2;
        if (accent) kick(loopStart + i * step, 0.22, 0.5);
        else hit(loopStart + i * step, 0.045, 0.11, 6500, 1.6);
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
      masterFilter.disconnect();
      delay.disconnect();
      feedback.disconnect();
      delayTone.disconnect();
      delaySend.disconnect();
    },
  };
}
