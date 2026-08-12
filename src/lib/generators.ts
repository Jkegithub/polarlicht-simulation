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
  master.gain.value = 0.65;

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

  // +-15% random velocity spread so repeated notes aren't all identically loud.
  const vel = (base: number, spread = 0.15) => base * (1 - spread + Math.random() * spread * 2);

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

  let loopIndex = 0;

  function scheduleLoop(loopStart: number) {
    if (stopped) return;
    let loopLen = 4;
    const li = loopIndex++;

    if (kind === "ambient") {
      loopLen = 8;
      // Alternate between two chord voicings every other loop instead of
      // freezing on one forever, plus a sparse high "shimmer" note that
      // doesn't play every time - small variation reads as alive, not looping.
      const chord = li % 2 === 0 ? [0, 2, 4, 7] : [0, 3, 5, 7];
      chord.forEach((deg, i) => {
        const humanize = (Math.random() - 0.5) * 0.4;
        tone(Math.max(ctx.currentTime, loopStart + i * 2 + humanize), SCALE_MIN[deg] / 2, 3.7, "sine", vel(0.85, 0.25));
      });
      if (li % 3 !== 0) {
        const deg = chord[Math.floor(Math.random() * chord.length)];
        tone(loopStart + 3 + Math.random() * 3.5, SCALE_MIN[deg] * 2, 2.4, "triangle", vel(0.35, 0.3));
      }
    } else if (kind === "electro") {
      loopLen = 4;
      const step = loopLen / 8;
      const bassA = [0, 0, 3, 0, 0, 5, 3, 0];
      const bassB = [0, 3, 0, 5, 0, 3, 7, 5];
      const bass = li % 4 < 2 ? bassA : bassB;
      bass.forEach((deg, i) => tone(loopStart + i * step, SCALE_MIN[deg] / 4, step * 0.8, "sawtooth", vel(0.6)));
      for (let i = 0; i < 16; i++) {
        const accent = i % 4 === 0;
        hit(loopStart + i * (loopLen / 16), 0.035, vel(accent ? 0.36 : 0.16, 0.2), accent ? 9000 : 7000, 1.4);
      }
      // Every 4th loop, a short lead phrase on top so it's not just the same
      // bassline forever.
      if (li % 4 === 3) {
        [4, 7, 6, 4].forEach((deg, i) => tone(loopStart + 2 + i * 0.4, SCALE_MIN[deg], 0.35, "square", vel(0.4)));
      }
    } else if (kind === "arpeggio") {
      loopLen = 4;
      // Rotate through a little 3-part progression across loops instead of
      // arpeggiating the exact same chord forever, with a sustained bass note
      // underneath for harmonic grounding.
      const progressions = [
        { bass: 0, notes: [0, 2, 4, 7, 4, 2] },
        { bass: 3, notes: [3, 5, 7, 5, 3, 1] },
        { bass: 4, notes: [4, 6, 1, 6, 4, 2] },
      ];
      const prog = progressions[li % progressions.length];
      const step = loopLen / prog.notes.length;
      prog.notes.forEach((deg, i) => tone(loopStart + i * step, SCALE_MAJ[deg], step * 0.9, "triangle", vel(0.55)));
      tone(loopStart, SCALE_MAJ[prog.bass] / 2, loopLen * 0.95, "sine", vel(0.3, 0.1));
    } else if (kind === "rock") {
      loopLen = 4;
      const step = loopLen / 8;
      // Alternate a plain groove with a slightly busier "fill" every other
      // loop, and occasionally walk the bass to a different scale degree.
      const fill = li % 2 === 1;
      const bassDeg = li % 8 === 7 ? 3 : 0;
      for (let i = 0; i < 8; i++) {
        if (i % 2 === 0 || (fill && i === 5)) tone(loopStart + i * step, SCALE_MIN[bassDeg] / 4, step * 0.6, "square", vel(0.55));
        const accent = i % 4 === 2;
        if (accent) kick(loopStart + i * step, 0.22, vel(0.85, 0.1));
        else hit(loopStart + i * step, 0.045, vel(0.22, 0.3), 6500, 1.6);
        if (fill && i === 6) hit(loopStart + i * step + step * 0.5, 0.06, 0.3, 3200, 1.1);
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
