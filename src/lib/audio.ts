export interface AudioLevels {
  bass: number;
  mid: number;
  treble: number;
  overall: number;
  punch: number;
}

// Wraps a single, persistent <audio> element in a Web Audio analyser graph.
// createMediaElementSource may only be called once per element, so one
// AudioReactor is bound to one element for its whole lifetime; changing
// tracks just swaps el.src.
export class AudioReactor {
  private ctx: AudioContext;
  private analyser: AnalyserNode;
  private freq: Uint8Array<ArrayBuffer>;
  private smoothed: AudioLevels = { bass: 0, mid: 0, treble: 0, overall: 0, punch: 0 };
  private prevBass = 0;

  constructor(el: HTMLMediaElement) {
    this.ctx = new AudioContext();
    const source = this.ctx.createMediaElementSource(el);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0.8;
    source.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    this.freq = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
  }

  resume() {
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  update(): AudioLevels {
    this.analyser.getByteFrequencyData(this.freq);
    const n = this.freq.length;
    const bassEnd = Math.max(1, Math.floor(n * 0.08));
    const midEnd = Math.max(bassEnd + 1, Math.floor(n * 0.35));

    let bass = 0;
    for (let i = 0; i < bassEnd; i++) bass += this.freq[i];
    bass /= bassEnd * 255;

    let mid = 0;
    for (let i = bassEnd; i < midEnd; i++) mid += this.freq[i];
    mid /= (midEnd - bassEnd) * 255;

    let treble = 0;
    for (let i = midEnd; i < n; i++) treble += this.freq[i];
    treble /= (n - midEnd) * 255;

    const overall = (bass + mid + treble) / 3;

    const onset = Math.max(0, bass - this.prevBass * 1.08);
    this.prevBass = bass;
    const punch = Math.max(this.smoothed.punch * 0.82, Math.min(1, onset * 3.2));

    const a = 0.35;
    this.smoothed.bass += (bass - this.smoothed.bass) * a;
    this.smoothed.mid += (mid - this.smoothed.mid) * a;
    this.smoothed.treble += (treble - this.smoothed.treble) * a;
    this.smoothed.overall += (overall - this.smoothed.overall) * a;
    this.smoothed.punch = punch;

    return this.smoothed;
  }

  dispose() {
    this.analyser.disconnect();
    this.ctx.close();
  }
}
