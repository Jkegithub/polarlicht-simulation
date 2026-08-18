import fjordUrl from "../assets/scene-fjord.jpg";
import waldUrl from "../assets/scene-wald.jpg";
import eismeerUrl from "../assets/scene-eismeer.jpg";
import huetteUrl from "../assets/scene-huette.jpg";
import { SceneId } from "../types";
import { drawSchwarzwald } from "./schwarzwald";

export const SCENE_URLS: Partial<Record<SceneId, string>> = {
  fjord: fjordUrl,
  wald: waldUrl,
  eismeer: eismeerUrl,
  huette: huetteUrl,
};

const WATER_CONFIG: Record<string, { strength: number; alpha: number }> = {
  fjord: { strength: 0.62, alpha: 150 },
  eismeer: { strength: 0.55, alpha: 160 },
  huette: { strength: 0.6, alpha: 155 },
  wald: { strength: 0, alpha: 255 },
  schwarzwald: { strength: 0, alpha: 255 }, // Hoehenzuege, kein Wasser
  himmel: { strength: 0, alpha: 0 },
};

export interface Scenery {
  id: SceneId;
  cut: HTMLCanvasElement; // land = opaque, sky = 0, water = semi
  skyMask: HTMLCanvasElement; // white where sky is, black where land is (soft edge)
  waterMask: HTMLCanvasElement; // white where real water is, black everywhere else
  w: number;
  h: number;
  horizon: Float32Array;
  waterTop: number; // y in image px where reflective water starts
  waterStrength: number;
}

// Vorschaubild der Szenenauswahl: einmalig klein gezeichnet (ca. 1 ms), damit die
// Kachel dasselbe zeigt wie die Fotoszenen - ohne Datei im Build.
if (typeof document !== "undefined") {
  SCENE_URLS.schwarzwald = drawSchwarzwald(320, 180).toDataURL("image/jpeg", 0.82);
}

const cache = new Map<SceneId, Scenery>();
const pending = new Map<SceneId, Promise<Scenery>>();

function lum(d: Uint8ClampedArray, i: number) {
  return 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
}

function process(id: SceneId, img: CanvasImageSource, w: number, h: number): Scenery {

  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  // --- 1. Sky threshold from top rows ---
  let skySum = 0;
  let skyN = 0;
  for (let y = 0; y < Math.max(2, Math.floor(h * 0.02)); y++) {
    for (let x = 0; x < w; x += 3) {
      skySum += lum(d, (y * w + x) * 4);
      skyN++;
    }
  }
  const skyLum = skySum / Math.max(1, skyN);
  const thr = Math.max(9, skyLum + 12);

  // --- 2. Silhouette (first solid row per column) ---
  const raw = new Float32Array(w);
  const maxScan = Math.floor(h * 0.96);
  for (let x = 0; x < w; x++) {
    let found = -1;
    for (let y = 0; y < maxScan; y++) {
      const i = (y * w + x) * 4;
      if (lum(d, i) > thr) {
        let ok = 0;
        for (let k = 1; k <= 4; k++) {
          if (y + k < h && lum(d, ((y + k) * w + x) * 4) > thr * 0.7) ok++;
        }
        if (ok >= 3) {
          found = y;
          break;
        }
      }
    }
    raw[x] = found < 0 ? h : found;
  }

  const horizon = new Float32Array(w);
  const r = 3;
  const buf: number[] = [];
  for (let x = 0; x < w; x++) {
    buf.length = 0;
    for (let k = -r; k <= r; k++) buf.push(raw[Math.min(w - 1, Math.max(0, x + k))]);
    buf.sort((a, b) => a - b);
    horizon[x] = buf[r];
  }
  const sortedHz = Array.from(horizon).sort((a, b) => a - b);
  const medHz = sortedHz[Math.floor(w / 2)];
  if (medHz < h * 0.15 || medHz > h * 0.9) {
    const flat = h * 0.58;
    for (let x = 0; x < w; x++) horizon[x] = flat;
  }

  // --- 3. WATER LINE detection ---
  // Real water sits below the deepest silhouette valley. Above that, everything is land.
  let deepestHz = 0;
  for (let x = 0; x < w; x++) if (horizon[x] > deepestHz) deepestHz = horizon[x];
  // waterTop = the deepest valley – water is only what lies below this line, so we never
  // accidentally punch holes into bright snow mountains.
  const waterTop = Math.min(h * 0.94, deepestHz + h * 0.005);

  // --- 4. Build masks ---
  // (a) skyMask canvas: white above the horizon, black on land – with a 4px soft edge.
  const maskCv = document.createElement("canvas");
  maskCv.width = w;
  maskCv.height = h;
  const mctx = maskCv.getContext("2d")!;
  const maskImg = mctx.createImageData(w, h);
  const md = maskImg.data;
  const feather = Math.max(2, h * 0.004);
  for (let x = 0; x < w; x++) {
    const hz = horizon[x];
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 4;
      const dist = y - hz;
      const t = clamp01((-dist + feather) / (feather * 2));
      const a = Math.round(t * 255);
      md[i] = 0;
      md[i + 1] = 0;
      md[i + 2] = 0;
      md[i + 3] = a; // alpha encodes sky!
    }
  }
  mctx.putImageData(maskImg, 0, 0);

  // (b) main cutout + (c) dedicated water mask.
  // Land below the horizon stays 100% opaque. Only pixels that are clearly open water
  // become semi-transparent, and the same decision drives the waterMask – so the
  // renderer can mirror the aurora EXCLUSIVELY into real water.
  const waterAlpha = WATER_CONFIG[id]?.alpha ?? 255;
  const waterStrength = WATER_CONFIG[id]?.strength ?? 0;
  const enableWater = waterStrength > 0.02;

  const wm = new Uint8ClampedArray(w * h); // 255 = water, 0 = land/sky

  // --- per-row shore detection for strict land/water separation ---
  // For each row below waterTop, we find the water span – this prevents
  // dark mountain shadows on the sides from being misclassified as water.
  const shoreLeft = new Int16Array(h);
  const shoreRight = new Int16Array(h);
  for (let y = Math.floor(waterTop); y < h; y++) {
    let left = -1;
    let right = -1;
    if (id === "fjord") {
      // fjord: water is the central channel; mountains occupy ~20% on each side
      // Detect actual shore by looking for bright/dark transitions, fallback to fixed band
      const yN = (y - waterTop) / Math.max(1, h - waterTop);
      // shore widens slightly towards the foreground
      const margin = Math.round(w * (0.18 + yN * 0.06));
      left = margin;
      right = w - margin - 1;
      // refine: walk inwards until we hit dark water (skip bright snow-covered shore)
      for (let x = left; x < w * 0.5; x++) {
        const i = (y * w + x) * 4;
        const L = lum(d, i);
        const rV = d[i], bV = d[i + 2];
        if (L < 75 && bV > rV - 8) { left = x; break; }
        if (x > left + w * 0.12) break;
      }
      for (let x = right; x > w * 0.5; x--) {
        const i = (y * w + x) * 4;
        const L = lum(d, i);
        const rV = d[i], bV = d[i + 2];
        if (L < 75 && bV > rV - 8) { right = x; break; }
        if (right - x > w * 0.12) break;
      }
    } else if (id === "eismeer") {
      // eismeer: water everywhere below waterTop except occasional ice floes
      left = 0; right = w - 1;
    } else if (id === "huette") {
      left = Math.round(w * 0.12); right = w - 1;
    } else {
      left = 0; right = -1; // no water
    }
    shoreLeft[y] = left;
    shoreRight[y] = right;
  }

  for (let x = 0; x < w; x++) {
    const hz = horizon[x];
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * 4;
      if (y < hz - 2) {
        d[i + 3] = 0; // sky
      } else if (y < hz) {
        d[i + 3] = 90; // soft ridge edge
      } else {
        let alpha = 255;
        let isWater = false;
        if (enableWater && y > waterTop && shoreLeft[y] >= 0) {
          const inWaterSpan = x >= shoreLeft[y] && x <= shoreRight[y];
          if (inWaterSpan) {
            const rV = d[i];
            const gV = d[i + 1];
            const bV = d[i + 2];
            const L = lum(d, i);
            const isBlueish = bV > rV - 6 && bV > gV - 14;
            const isDarkEnough = L < 115;
            const isNotWarmLight = !(rV > 150 && gV > 90 && bV < 120);
            const isNotSnow = !(L > 135 && rV > 150 && gV > 150 && bV > 150);
            // dark, calm water is darker than sunlit ice
            if (isBlueish && isDarkEnough && isNotWarmLight && isNotSnow && L < 110) {
              isWater = true;
              const depth = clamp01((y - waterTop) / Math.max(1, h - waterTop));
              const t = Math.pow(depth, 0.55);
              alpha = Math.round(255 * (1 - t) + waterAlpha * t);
            }
          }
        }
        d[i + 3] = alpha;
        if (isWater) wm[y * w + x] = 255;
      }
    }
  }

  // smooth the water mask: remove isolated specks, soften the shoreline edge
  const wm2 = new Uint8ClampedArray(wm);
  for (let x = 1; x < w - 1; x++) {
    for (let y = Math.floor(waterTop); y < h - 1; y++) {
      const p = y * w + x;
      const n =
        wm[p] + wm[p - 1] + wm[p + 1] + wm[p - w] + wm[p + w] +
        wm[p - w - 1] + wm[p - w + 1] + wm[p + w - 1] + wm[p + w + 1];
      wm2[p] = n >= 5 * 255 ? 255 : 0; // majority vote → clean shore line
    }
  }
  // feather the top edge of each water column by 2px for a natural shoreline
  for (let x = 0; x < w; x++) {
    let top = -1;
    for (let y = Math.max(0, Math.floor(waterTop) - 2); y < h; y++) {
      if (wm2[y * w + x] === 255) {
        top = y;
        break;
      }
    }
    if (top > 0) {
      wm2[(top - 1) * w + x] = Math.max(wm2[(top - 1) * w + x], 110);
      if (top > 1) wm2[(top - 2) * w + x] = Math.max(wm2[(top - 2) * w + x], 45);
    }
  }

  const waterCv = document.createElement("canvas");
  waterCv.width = w;
  waterCv.height = h;
  const wctx = waterCv.getContext("2d")!;
  const wimg = wctx.createImageData(w, h);
  const wd = wimg.data;
  for (let p = 0; p < w * h; p++) {
    wd[p * 4] = 0;
    wd[p * 4 + 1] = 0;
    wd[p * 4 + 2] = 0;
    wd[p * 4 + 3] = wm2[p]; // alpha encodes water!
  }
  wctx.putImageData(wimg, 0, 0);

  ctx.putImageData(imgData, 0, 0);

  return { id, cut: cv, skyMask: maskCv, waterMask: waterCv, w, h, horizon, waterTop, waterStrength };
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function loadScenery(id: SceneId): Promise<Scenery> | Scenery | null {
  const hit = cache.get(id);
  if (hit) return hit;

  // Der Schwarzwald wird gezeichnet statt geladen - kein Netzweg, kein Warten,
  // deshalb faellt er synchron aus der Funktion. Der Rueckgabetyp deckt das ab.
  if (id === "schwarzwald") {
    const cv = drawSchwarzwald(1600, 900);
    const s = process(id, cv, cv.width, cv.height);
    cache.set(id, s);
    return s;
  }

  const url = SCENE_URLS[id];
  if (!url) return null;
  const inFlight = pending.get(id);
  if (inFlight) return inFlight;
  const p = new Promise<Scenery>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const s = process(id, img, img.naturalWidth, img.naturalHeight);
      cache.set(id, s);
      pending.delete(id);
      resolve(s);
    };
    img.onerror = reject;
    img.src = url;
  });
  pending.set(id, p);
  return p;
}

export function getCached(id: SceneId) {
  return cache.get(id) ?? null;
}
