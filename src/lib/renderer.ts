import { Settings } from "../types";
import { fbm1, fbm2, hash1, hexToRgb, mixRgb, rgba, valueNoise1 } from "./noise";
import { getCached, loadScenery, Scenery } from "./scenery";

export interface Metrics {
  intensity: number;
  kp: number;
  distribution: number[];
  fps: number;
}

interface Star {
  x: number;
  y: number;
  r: number;
  b: number;
  p: number;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;

interface WaveStyle {
  foldK: number;
  foldA: number;
  travel: number;
  chaos: number;
  tight: number;
}

const WAVE_STYLES: Record<string, WaveStyle> = {
  sanft: { foldK: 0.6, foldA: 0.8, travel: 0.5, chaos: 0.25, tight: 0.3 },
  dynamisch: { foldK: 1.15, foldA: 1.5, travel: 1.0, chaos: 0.65, tight: 0.85 },
  chaotisch: { foldK: 1.9, foldA: 1.9, travel: 1.6, chaos: 1.5, tight: 1.3 },
  vorhang: { foldK: 1.4, foldA: 2.2, travel: 0.9, chaos: 0.45, tight: 1.7 },
};

export class AuroraRenderer {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  settings: Settings;
  time = 0;
  seed = 1;

  W = 0;
  H = 0;
  dpr = 1;

  private aur: HTMLCanvasElement;
  private actx: CanvasRenderingContext2D;
  private aurMasked: HTMLCanvasElement;
  private amctx: CanvasRenderingContext2D;
  private bloom: HTMLCanvasElement;
  private bctx: CanvasRenderingContext2D;
  private refl: HTMLCanvasElement;
  private rctx: CanvasRenderingContext2D;

  private aw = 1;
  private ah = 1;

  private stars: Star[] = [];
  private scenery: Scenery | null = null;
  private fit = { dx: 0, dy: 0, scale: 1 };
  horizonY = 0;
  private waterY = 0;

  private bx = new Float32Array(0);
  private by = new Float32Array(0);
  private bh = new Float32Array(0);

  private lastFrame = 0;
  private fps = 60;
  onSceneryReady?: () => void;

  constructor(canvas: HTMLCanvasElement, settings: Settings) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    this.settings = settings;

    this.aur = document.createElement("canvas");
    this.actx = this.aur.getContext("2d")!;
    this.aurMasked = document.createElement("canvas");
    this.amctx = this.aurMasked.getContext("2d")!;
    this.bloom = document.createElement("canvas");
    this.bctx = this.bloom.getContext("2d")!;
    this.refl = document.createElement("canvas");
    this.rctx = this.refl.getContext("2d")!;

    this.loadScene();
  }

  setSettings(s: Settings) {
    const sceneChanged = s.scene !== this.settings.scene;
    const starsChanged = s.stars !== this.settings.stars;
    this.settings = s;
    if (sceneChanged) this.loadScene();
    if (starsChanged) this.buildStars();
  }

  private loadScene() {
    const id = this.settings.scene;
    const res = loadScenery(id);
    if (!res) {
      this.scenery = null;
      this.computeFit();
      return;
    }
    if (res instanceof Promise) {
      const cached = getCached(id);
      if (!cached) this.scenery = null;
      res
        .then((sc) => {
          if (this.settings.scene === sc.id) {
            this.scenery = sc;
            this.computeFit();
            this.onSceneryReady?.();
          }
        })
        .catch((err) => console.error(`Szene "${id}" konnte nicht geladen werden:`, err));
    } else {
      this.scenery = res;
      this.computeFit();
    }
  }

  reseed() {
    this.seed = Math.random() * 1000;
    this.buildStars();
  }

  private computeFit() {
    const sc = this.scenery;
    if (!sc || !this.W) {
      this.horizonY = this.H * 0.99;
      this.waterY = this.H * 1.2;
      return;
    }
    const scale = Math.max(this.W / sc.w, this.H / sc.h);
    this.fit = { dx: (this.W - sc.w * scale) / 2, dy: (this.H - sc.h * scale) / 2, scale };
    const sorted = Array.from(sc.horizon).sort((a, b) => a - b);
    this.horizonY = this.fit.dy + sorted[Math.floor(sorted.length * 0.5)] * scale;
    this.waterY = this.fit.dy + sc.waterTop * scale;
  }

  private horizonAt(x: number) {
    const sc = this.scenery;
    if (!sc) return this.H * 0.99;
    const fx = (x - this.fit.dx) / this.fit.scale;
    const ix = Math.floor(fx);
    const f = fx - ix;
    const a = sc.horizon[clamp(ix, 0, sc.w - 1)];
    const b = sc.horizon[clamp(ix + 1, 0, sc.w - 1)];
    const y = a + (b - a) * clamp(f, 0, 1);
    return this.fit.dy + y * this.fit.scale;
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = Math.max(320, Math.floor(rect.width));
    this.H = Math.max(240, Math.floor(rect.height));
    this.canvas.width = Math.floor(this.W * this.dpr);
    this.canvas.height = Math.floor(this.H * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.aw = Math.min(1800, Math.round(this.W * 1.4));
    this.ah = Math.round((this.aw * this.H) / this.W);
    this.aur.width = this.aw;
    this.aur.height = this.ah;
    this.aurMasked.width = this.aw;
    this.aurMasked.height = this.ah;
    this.bloom.width = Math.max(32, Math.round(this.aw / 7));
    this.bloom.height = Math.max(24, Math.round(this.ah / 7));
    this.refl.width = Math.max(96, Math.round(this.W / 1.4));
    this.refl.height = Math.max(72, Math.round(this.H / 1.4));

    this.computeFit();
    this.buildStars();
  }

  private buildStars() {
    const count = Math.round((this.settings.stars / 100) * 560);
    const stars: Star[] = [];
    for (let i = 0; i < count; i++) {
      const x = hash1(i * 1.13 + 3) * this.W;
      const y = Math.pow(hash1(i * 2.71 + 7), 1.35) * this.H * 0.9;
      stars.push({
        x,
        y,
        r: 0.35 + hash1(i * 3.37 + 3) * 1.35,
        b: 0.3 + hash1(i * 4.11 + 11) * 0.7,
        p: hash1(i * 5.19 + 5) * TAU,
      });
    }
    this.stars = stars;
  }

  // =========================================================
  //  AURORA – ribbons, then masked to sky region
  // =========================================================
  private drawAurora() {
    const s = this.settings;
    const ctx = this.actx;
    const W = this.aw;
    const H = this.ah;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.globalCompositeOperation = "lighter";

    const t = this.time;
    const intenPow = Math.pow(s.intensity / 100, 0.55);
    const inten = 0.6 + 0.75 * intenPow;
    const act = s.activity / 100;
    const mov = s.movement / 100;
    const rnd = s.randomness / 100;
    const variety = s.colorVariety / 100;
    const st = WAVE_STYLES[s.waveform] ?? WAVE_STYLES.dynamisch;

    const wind = s.direction === "sued" || s.direction === "west" ? -1 : 1;
    const windLateral = s.direction === "ost" || s.direction === "west" ? 1.3 : 0.45;

    const pal = s.palette.map(hexToRgb);
    const N = Math.max(320, Math.min(760, Math.round(W / 1.7)));
    if (this.bx.length < N + 2) {
      this.bx = new Float32Array(N + 2);
      this.by = new Float32Array(N + 2);
      this.bh = new Float32Array(N + 2);
    }
    const bx = this.bx;
    const by = this.by;
    const bh = this.bh;

    // Bottom limit for ribbon centres (never clamp — allow to swing down, mask cuts it later)
    const yLimit = H * 0.98;

    // Coronal high-altitude wash
    this.drawHighAltitudeWash(ctx, W, H, t, pal, inten, variety, mov, rnd, wind);

    for (let c = 0; c < s.bands; c++) {
      const cs = c * 17.31 + this.seed;
      const jit = hash1(cs * 1.7);
      const jit2 = hash1(cs * 3.9 + 2);
      const jit3 = hash1(cs * 5.1 + 7);
      const depth = s.bands === 1 ? 0 : c / (s.bands - 1);
      const persp = 1 - depth * 0.22;

      // ---- Ribbon colour palette per band ----
      const colIdx = c % pal.length;
      const baseGreen = pal[0];
      const baseCyan = pal[3] ?? [0, 231, 255];
      const baseMagenta = pal[1] ?? [255, 29, 143];
      const basePurple = pal[2] ?? [179, 45, 255];

      let bottomColor: [number, number, number];
      let midColor: [number, number, number];
      let topColor: [number, number, number];
      if (c === 0) {
        bottomColor = baseGreen;
        midColor = mixRgb(baseGreen, baseCyan, 0.45);
        topColor = baseMagenta;
      } else if (c === 1) {
        bottomColor = baseMagenta;
        midColor = basePurple;
        topColor = mixRgb(basePurple, baseCyan, 0.5);
      } else {
        bottomColor = mixRgb(pal[colIdx], baseGreen, 1 - variety);
        midColor = mixRgb(pal[(colIdx + 1) % pal.length], baseCyan, 0.5);
        topColor = mixRgb(pal[(colIdx + 2) % pal.length], baseMagenta, 0.6);
      }
      const hotWhite: [number, number, number] = [240, 255, 245];

      // gradient with razor-sharp overbright bottom rim
      const g = ctx.createLinearGradient(0, -1, 0, 0.15);
      const k = (v: number) => (v + 1) / 1.15;
      g.addColorStop(0, rgba(topColor, 0));
      g.addColorStop(k(-0.95), rgba(topColor, 0.14 * inten));
      g.addColorStop(k(-0.75), rgba(midColor, 0.4 * inten));
      g.addColorStop(k(-0.45), rgba(midColor, 0.75 * inten));
      g.addColorStop(k(-0.2), rgba(bottomColor, 1.2 * inten));
      g.addColorStop(k(-0.06), rgba(mixRgb(bottomColor, hotWhite, 0.65), 1.6 * inten));
      g.addColorStop(k(0.0), rgba(bottomColor, 1.75 * inten));
      g.addColorStop(k(0.03), rgba(bottomColor, 0.9 * inten));
      g.addColorStop(1, rgba(bottomColor, 0));

      const span = W * (1.75 + depth * 0.6);
      const yCentre = H * (0.15 + depth * 0.36 + jit * 0.1);
      const yRange = H * (0.34 + jit2 * 0.22);
      const height = H * (0.32 + jit2 * 0.26) * (0.65 + 0.7 * intenPow) * (1 - depth * 0.16);

      const bandDir = jit3 > 0.5 ? 1 : -1;
      const localDir = wind * 0.38 + bandDir * (0.85 + 0.4 * hash1(cs * 9.3));
      const w1 = (0.32 + mov * 1.05) * st.travel;
      const foldAmp = W * 0.2 * st.foldA * (0.4 + act * 1.25) * persp;

      const swim =
        (Math.sin(t * (0.05 + mov * 0.09) * localDir + jit * 6.3) * 0.58 +
          Math.sin(t * (0.028 + mov * 0.045) * localDir + cs * 0.71) * 0.42) *
        W *
        0.09 *
        (0.65 + windLateral) *
        persp;

      // sample path
      for (let i = 0; i <= N + 1; i++) {
        const u = (i - 0.5) / N;

        const packet = 0.35 + 0.95 * fbm1(u * (1.25 + rnd * 1.25) - localDir * t * 0.26 * st.travel + cs, 3, cs);

        let fold =
          Math.sin(u * TAU * (0.95 * st.foldK) - localDir * t * w1 + jit * 6.3) * 1.0 +
          Math.sin(u * TAU * (2.15 * st.foldK) - localDir * t * w1 * 1.55 + jit2 * 6.3) * 0.68 +
          Math.sin(u * TAU * (4.4 * st.foldK) - localDir * t * w1 * 2.35 + cs) * 0.38 * st.tight +
          Math.sin(u * TAU * (8.6 * st.foldK) + localDir * t * w1 * 1.85 + cs * 1.7) * 0.16 * st.tight;
        fold += (fbm1(u * (5 + rnd * 9) - localDir * t * w1 * 0.7 + cs * 2.1, 4, cs + 5) - 0.5) * 2.9 * st.chaos * rnd;
        fold *= packet * foldAmp;

        const x = W * 0.5 + ((u - 0.5) * span + fold) * persp + swim;

        const arc = -Math.cos(clamp(u, 0, 1) * Math.PI) * H * (0.06 + 0.055 * (1 - depth));
        const snake =
          Math.sin(u * TAU * 0.62 * st.foldK - localDir * t * w1 * 0.92 + cs * 2.7) * 0.62 +
          Math.sin(u * TAU * 1.45 * st.foldK - localDir * t * w1 * 1.38 + jit * 3.3) * 0.38 +
          Math.sin(u * TAU * 2.9 * st.foldK + localDir * t * w1 * 0.7 + cs) * 0.16;
        const wobble = (fbm1(u * 1.7 - localDir * t * 0.13 * st.travel + cs * 1.3, 3, cs + 9) - 0.5) * 0.5;
        const curlPhase = clamp((u - 0.58) / 0.32, 0, 1);
        const curl = Math.sin(curlPhase * Math.PI) * Math.sin(t * 0.45 * localDir + cs) * H * 0.09 * (1 - depth * 0.5) * packet;

        let y = yCentre + arc + (snake + wobble) * yRange * 0.52 * (0.6 + 0.85 * mov) + curl;
        y = Math.min(y, yLimit);
        y = Math.max(y, H * 0.02);

        const hn = fbm1(u * (2.2 + rnd * 4.2) - localDir * t * 0.13 * st.travel + cs * 2.7, 4, cs + 3);
        bx[i] = x;
        by[i] = y;
        bh[i] = height * (0.38 + 0.95 * hn) * (0.68 + 0.32 * packet);
      }

      // rasterise
      const refDx = (span * persp) / N;
      const baseA = (1.3 - depth * 0.28) * (0.75 + 0.9 * intenPow);
      for (let i = 1; i <= N; i++) {
        const u = (i - 0.5) / N;
        const x = bx[i];
        const y = by[i];
        const h = bh[i];
        if (x < -20 || x > W + 20 || h < 2) continue;

        const adx = Math.abs(bx[i + 1] - bx[i - 1]) * 0.5;
        const compress = clamp(refDx / (adx + 0.0007), 0.18, 5.8);
        const wCore = Math.max(1.1, adx * 0.9 + 0.7);
        const wHalo = wCore * (2.2 + 0.6 * act);

        const rayF = 68 + rnd * 160;
        const ray =
          0.2 +
          0.8 *
            fbm2(u * rayF, t * (0.3 + mov * 0.9) + cs, 3, cs + 11) *
            (0.5 + 0.5 * valueNoise1(u * rayF * 0.28 - localDir * t * 0.7, cs));

        const envA = fbm1(u * (0.95 + rnd * 1.2) - localDir * t * 0.24 * st.travel + cs * 3.7, 3, cs + 21);
        const envB = fbm1(u * (2.4 + rnd * 2.0) - localDir * t * 0.19 * st.travel + cs * 4.9, 3, cs + 27);
        const raw = clamp((envA * 0.72 + envB * 0.52 - 0.31 - 0.10 * rnd) * 2.4, 0, 1);
        const envelope = Math.pow(raw, 2.1 + rnd * 0.7);

        const pulse = 0.7 + 0.3 * Math.sin(t * (0.5 + act * 2.8) + cs * 1.9 + u * 6);

        const aHalo = baseA * 0.38 * ray * envelope * pulse;
        if (aHalo > 0.008) {
          ctx.globalAlpha = Math.min(0.95, aHalo * 0.55);
          ctx.setTransform(1, 0, 0, h * 1.08, x - wHalo * 0.5, y);
          ctx.fillStyle = g;
          ctx.fillRect(0, -1, wHalo, 1.12);
        }
        const aCore = baseA * compress * ray * envelope * pulse;
        if (aCore > 0.01) {
          ctx.globalAlpha = Math.min(1.45, aCore);
          ctx.setTransform(1, 0, 0, h, x - wCore * 0.5, y);
          ctx.fillStyle = g;
          ctx.fillRect(0, -1, wCore, 1.12);
        }
      }
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // Bloom = blurred small copy
    this.bctx.setTransform(1, 0, 0, 1, 0, 0);
    this.bctx.clearRect(0, 0, this.bloom.width, this.bloom.height);
    this.bctx.drawImage(this.aur, 0, 0, this.bloom.width, this.bloom.height);

    // ===== KEY FIX =====
    // Build a "sky-only" version of the aurora by knocking out everything that lies
    // behind the landscape silhouette – no vertical streaks over mountains anymore.
    const am = this.amctx;
    am.setTransform(1, 0, 0, 1, 0, 0);
    am.clearRect(0, 0, this.aw, this.ah);
    am.drawImage(this.aur, 0, 0);
    if (this.scenery) {
      am.globalCompositeOperation = "destination-in";
      // scale the sky mask (white=sky) into the offscreen buffer, aligned like the scene
      const sc = this.scenery;
      const scaleX = (this.aw / this.W) * this.fit.scale;
      const scaleY = (this.ah / this.H) * this.fit.scale;
      const dx = (this.aw / this.W) * this.fit.dx;
      const dy = (this.ah / this.H) * this.fit.dy;
      am.imageSmoothingEnabled = true;
      am.imageSmoothingQuality = "high";
      am.drawImage(sc.skyMask, dx, dy, sc.w * scaleX, sc.h * scaleY);
      am.globalCompositeOperation = "source-over";
    }
  }

  private drawHighAltitudeWash(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    t: number,
    pal: [number, number, number][],
    inten: number,
    variety: number,
    mov: number,
    rnd: number,
    dir: number,
  ) {
    if (variety < 0.08) return;
    for (let layer = 0; layer < 3; layer++) {
      const ls = layer * 41.7 + this.seed * 1.3;
      const col = pal[(layer * 2 + 1) % pal.length];
      const g = ctx.createLinearGradient(0, 0, 0, 1);
      g.addColorStop(0, rgba(col, 0.45 * inten * variety));
      g.addColorStop(0.45, rgba(col, 0.2 * inten * variety));
      g.addColorStop(0.85, rgba(col, 0.04 * inten * variety));
      g.addColorStop(1, rgba(col, 0));
      const step = 6;
      const ld = layer % 2 === 0 ? dir : -dir;
      for (let x = -step; x < W + step; x += step) {
        const u = x / W;
        const n = fbm1(u * (1.5 + layer * 1.2) - ld * t * 0.05 * (0.4 + mov) + ls, 4, ls);
        const ray = 0.3 + 0.7 * fbm1(u * (20 + rnd * 55) - ld * t * 0.16 + ls * 2, 2, ls + 5);
        const h = H * (0.26 + 0.48 * n) * (0.55 + 0.45 * inten);
        const a = 0.28 * n * ray * (0.3 + 0.7 * inten);
        if (a < 0.005) continue;
        ctx.globalAlpha = a;
        ctx.setTransform(1, 0, 0, h, x, 0);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, step + 1.2, 1);
      }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
  }

  // =========================================================
  //  COMPOSITING
  // =========================================================
  private paintSky() {
    const { ctx, W, H } = this;
    const glow = this.settings.horizonGlow / 100;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#030510");
    g.addColorStop(0.32, "#050a22");
    g.addColorStop(0.62, "#08122c");
    g.addColorStop(0.82, `rgb(${8 + glow * 22},${16 + glow * 30},${40 + glow * 28})`);
    g.addColorStop(1, `rgb(${10 + glow * 26},${20 + glow * 36},${48 + glow * 30})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  private paintStars() {
    const { ctx } = this;
    const t = this.time;
    for (let i = 0; i < this.stars.length; i++) {
      const st = this.stars[i];
      const tw = 0.55 + 0.45 * Math.sin(t * 1.65 + st.p);
      ctx.globalAlpha = st.b * tw * 0.96;
      ctx.fillStyle = i % 13 === 0 ? "#c8dcff" : i % 23 === 0 ? "#ffdfb8" : "#ffffff";
      ctx.beginPath();
      ctx.arc(st.x, st.y, st.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private paintAuroraToScreen() {
    const { ctx, W, H } = this;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    // Bloom halo from the unmasked buffer, but clip to canvas (bloom over sky is fine,
    // over mountains is fine too – it's ONLY the sharp streak artefacts we suppressed).
    // For safety, we bloom the MASKED buffer too so nothing bleeds onto the land.
    ctx.globalAlpha = 0.7;
    if (this.scenery) {
      // downscale masked buffer as bloom source
      const src = this.aurMasked;
      ctx.drawImage(src, -W * 0.012, -H * 0.012, W * 1.024, H * 1.024);
    } else {
      ctx.drawImage(this.bloom, -W * 0.012, -H * 0.012, W * 1.024, H * 1.024);
    }
    ctx.globalAlpha = 1.0;
    ctx.drawImage(this.scenery ? this.aurMasked : this.aur, 0, 0, W, H);
    ctx.restore();
  }

  private paintWaterReflection() {
    const sc = this.scenery;
    if (!sc || sc.waterStrength < 0.05) return;
    const { ctx, W, H } = this;
    const wy = this.waterY;
    if (wy >= H - 3) return;

    const r = this.rctx;
    const rw = this.refl.width;
    const rh = this.refl.height;
    const s = rw / W;

    r.setTransform(1, 0, 0, 1, 0, 0);
    r.clearRect(0, 0, rw, rh);
    // Mirror the MASKED aurora vertically around the water line. Using the masked
    // buffer guarantees we never mirror any mountain leakage into the water.
    r.save();
    r.setTransform(s, 0, 0, -s, 0, s * wy);
    r.drawImage(this.aurMasked, 0, 0, W, H);
    r.restore();

    // Fade with depth
    r.globalCompositeOperation = "destination-in";
    const gv = r.createLinearGradient(0, 0, 0, (H - wy) * s);
    gv.addColorStop(0, `rgba(0,0,0,${0.9 * sc.waterStrength})`);
    gv.addColorStop(0.6, `rgba(0,0,0,${0.45 * sc.waterStrength})`);
    gv.addColorStop(1, "rgba(0,0,0,0)");
    r.fillStyle = gv;
    r.fillRect(0, 0, rw, (H - wy) * s);

    // STRICT LAND/WATER SEPARATION:
    // keep the reflection ONLY where the photo actually shows open water.
    // Shore, rocks, snow, ice floes, cabin – all stay reflection-free.
    const destH = Math.min(rh, (H - wy) * s);
    // exact cover-fit mapping of the water region (screen wy..H) into the buffer
    const srcX = Math.max(0, -this.fit.dx / this.fit.scale);
    const srcY = Math.max(0, (wy - this.fit.dy) / this.fit.scale);
    const srcW = Math.min(sc.w - srcX, this.W / this.fit.scale);
    const srcH = Math.min(sc.h - srcY, (H - wy) / this.fit.scale);
    r.drawImage(sc.waterMask, srcX, srcY, srcW, srcH, 0, 0, srcW * this.fit.scale * s, destH);
    r.globalCompositeOperation = "source-over";

    // Blit only into the water strip below wy. paintScenery will run afterwards and
    // its opaque land pixels will cover any reflection that landed on shore silhouettes.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, wy, W, H - wy);
    ctx.clip();
    ctx.globalCompositeOperation = "lighter";

    // Draw the reflection in horizontal slices with a ripple offset so it looks like water.
    const slice = 2.5;
    const rows = Math.floor((H - wy) / slice);
    for (let j = 0; j < rows; j++) {
      const dyy = wy + j * slice;
      const d = j / Math.max(1, rows);
      const off = Math.sin(dyy * 0.09 + this.time * 1.9) * (0.6 + d * 7) + Math.sin(dyy * 0.31 - this.time * 1.1) * d * 3;
      const stretch = 1 + d * 0.05;
      ctx.drawImage(r.canvas, 0, j * slice * s, rw, slice * s, off - (W * (stretch - 1)) / 2, dyy, W * stretch, slice + 0.7);
    }
    ctx.restore();
  }

  private paintClouds() {
    const s = this.settings;
    if (s.clouds <= 1) return;
    const { ctx, W, H } = this;
    const amount = s.clouds / 100;
    const hy = Math.min(this.horizonY, H);
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (let i = 0; i < 8; i++) {
      const dx = ((hash1(i * 3.7 + 1) * W + this.time * (3 + i * 2.2)) % (W * 1.5)) - W * 0.25;
      const y = hy - H * (0.015 + hash1(i * 9.1) * 0.28);
      const rx = W * (0.12 + hash1(i * 5.5) * 0.22);
      const ry = H * (0.018 + hash1(i * 7.3) * 0.05);
      const a = amount * (0.08 + hash1(i * 2.2) * 0.12);
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, `rgba(148,172,212,${a})`);
      g.addColorStop(0.55, `rgba(104,130,178,${a * 0.42})`);
      g.addColorStop(1, "rgba(84,104,146,0)");
      ctx.save();
      ctx.translate(dx, y);
      ctx.scale(1, ry / rx);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  private paintHorizonGlow() {
    const glow = this.settings.horizonGlow / 100;
    if (glow <= 0.01) return;
    const { ctx, W, H } = this;
    const rgb = hexToRgb(this.settings.palette[0]);
    const rgb2 = mixRgb(rgb, hexToRgb(this.settings.palette[1] ?? this.settings.palette[0]), 0.35);
    const gh = H * 0.2;
    const g = ctx.createLinearGradient(0, -1, 0, 0);
    g.addColorStop(0, rgba(rgb2, 0));
    g.addColorStop(0.58, rgba(rgb2, 0.04 * glow));
    g.addColorStop(0.88, rgba(rgb, 0.15 * glow));
    g.addColorStop(1, rgba(mixRgb(rgb, [255, 255, 255], 0.35), 0.32 * glow));
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = g;
    const step = 6;
    for (let x = 0; x < W; x += step) {
      const hy = Math.min(this.horizonAt(x + step / 2), H);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.translate(x, hy);
      ctx.scale(1, gh);
      ctx.fillRect(0, -1, step + 0.8, 1);
    }
    ctx.restore();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private paintScenery() {
    const sc = this.scenery;
    if (!sc) return;
    const { ctx, W, H } = this;
    const { dx, dy, scale } = this.fit;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(sc.cut, dx, dy, sc.w * scale, sc.h * scale);
    // faint bottom darkening only – no overlay on rocks/snow
    const g = ctx.createLinearGradient(0, this.horizonY + (H - this.horizonY) * 0.55, 0, H);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.2)");
    ctx.fillStyle = g;
    ctx.fillRect(0, this.horizonY, W, H - this.horizonY);
    ctx.restore();
  }

  private paintVignette() {
    const { ctx, W, H } = this;
    const g = ctx.createRadialGradient(W / 2, H * 0.5, Math.min(W, H) * 0.28, W / 2, H * 0.5, Math.max(W, H) * 0.72);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(0,0,0,0.42)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  render(dt: number, now: number): Metrics {
    this.time += dt;
    this.drawAurora();
    this.paintSky();
    this.paintStars();
    this.paintAuroraToScreen();       // aurora clipped to sky region only
    this.paintWaterReflection();      // mirror source is masked -> no shore artefacts
    this.paintClouds();
    this.paintHorizonGlow();
    this.paintScenery();              // opaque photo covers everything on land
    this.paintVignette();
    if (this.lastFrame) {
      const inst = 1000 / Math.max(1, now - this.lastFrame);
      this.fps = this.fps * 0.9 + inst * 0.1;
    }
    this.lastFrame = now;
    return this.metrics();
  }

  metrics(): Metrics {
    const s = this.settings;
    const t = this.time;
    const wob = fbm1(t * (0.35 + (s.activity / 100) * 1.4), 4, 3);
    const intensity = clamp((s.intensity / 100) * (0.72 + 0.42 * wob) + (s.randomness / 100) * (wob - 0.5) * 0.18, 0, 1);
    const kp = clamp((s.activity / 100) * 8.4 * (0.82 + 0.3 * fbm1(t * 0.3 + 9, 3, 5)), 0, 9);
    const variety = s.colorVariety / 100;
    const raw = [1 - variety * 0.55, variety * 0.42, variety * 0.34, variety * 0.14, variety * 0.12 + 0.03];
    const sum = raw.reduce((a, b) => a + b, 0);
    return { intensity, kp, distribution: raw.map((v) => (v / sum) * 100), fps: this.fps };
  }
}
