import fjordUrl from "../assets/scene-fjord.jpg";
import waldUrl from "../assets/scene-wald.jpg";
import eismeerUrl from "../assets/scene-eismeer.jpg";
import huetteUrl from "../assets/scene-huette.jpg";
import swNebelUrl from "../assets/scene-sw-nebel.jpg";
import swOktoberUrl from "../assets/scene-sw-oktober.jpg";
import swRheinUrl from "../assets/scene-sw-rhein.jpg";
import { SceneId } from "../types";

export const SCENE_URLS: Partial<Record<SceneId, string>> = {
  fjord: fjordUrl,
  wald: waldUrl,
  eismeer: eismeerUrl,
  huette: huetteUrl,
  swnebel: swNebelUrl,
  swoktober: swOktoberUrl,
  swrhein: swRheinUrl,
};

const WATER_CONFIG: Record<string, { strength: number; alpha: number }> = {
  fjord: { strength: 0.62, alpha: 150 },
  eismeer: { strength: 0.55, alpha: 160 },
  huette: { strength: 0.6, alpha: 155 },
  wald: { strength: 0, alpha: 255 },
  // Die drei Schwarzwald-Aufnahmen laufen vorerst ohne Wasserspiegelung: Nebelmeer
  // ist kein Wasser, und beim Rheinbogen liesse sich die Spiegelung erst nach einem
  // Blick aufs fertige Bild verantworten. Zahl hier hochsetzen, wenn gewuenscht.
  swnebel: { strength: 0, alpha: 255 },
  swoktober: { strength: 0, alpha: 255 },
  swrhein: { strength: 0, alpha: 255 },
  himmel: { strength: 0, alpha: 0 },
};

// Wie stark eine Aufnahme ins Naechtliche gezogen wird (0 = unveraendert lassen).
// Die vier Erstfassungs-Szenen sind bereits Nachtbilder. Die drei eigenen Fotos sind
// bei Tageslicht entstanden - ohne Umstimmung staende ein gruenes Polarlicht ueber
// blauem Nachmittagshimmel.
// Feste Horizontlinie fuer Bilder, bei denen keine Helligkeitsregel taugt.
// Beim Nebelmeer liegt das Nebelband HELLER als der Himmel darueber - Land ist dort
// weder durchgehend heller noch durchgehend dunkler, beide Suchrichtungen scheitern.
// Gemessenes Zeilenprofil dieser Aufnahme: Himmel 142-167 bis 40 % Bildhoehe, bei 44 %
// der Einbruch auf 127 (die Kammlinie), darunter das Nebelmeer wieder bei 129-142.
// Die Linie gehoert also auf 43 % - das ist gemessen, nicht geschaetzt.
const HORIZON_HINT: Partial<Record<SceneId, number>> = {
  swnebel: 0.43, // Kammlinie laut Zeilenprofil
  swoktober: 0.38, // knapp ueber den Alpengipfeln - dort soll die Aurora ansetzen
  swrhein: 0.25, // knapp ueber dem Huegelkamm, der Kuehlturm bleibt darunter
};

// Echte Himmelserkennung fuer die drei Fotoszenen: Die Trennung zwischen Polarlicht und
// Landschaft soll der Silhouette folgen - Kamm, Huegel, Baum -, nicht einer waagerechten
// Linie. Zwei Schritte: erst je Bildpunkt entscheiden, ob er Himmel SEIN KOENNTE, dann
// vom oberen Bildrand aus fluten. Nur was mit dem oberen Rand zusammenhaengt, ist Himmel.
//
// Das Fluten ist der wichtige Teil. Ohne es waere jede blaue Wasserflaeche Himmel (der
// Rhein!) und jede helle Stelle ein Loch in der Landschaft - genau der "Riss", der vorher
// durchs Wasser lief. Mit ihm bleibt unten alles geschlossen, weil es vom Kamm abgeriegelt
// wird.
//
// Je Bild eine eigene Regel, weil die drei Himmel nichts gemeinsam haben:
type SkyRule = (r: number, g: number, b: number, L: number) => boolean;
const SKY_RULE: Partial<Record<SceneId, SkyRule>> = {
  // Abendhimmel ueber dem Nebelmeer ist warm bis weiss - Farbe hilft nicht, Helligkeit
  // schon: Himmel 142-167, die Kammlinie faellt auf 127. Das Nebelmeer darunter ist zwar
  // ebenso hell, haengt aber nicht mit dem oberen Rand zusammen.
  swnebel: (_r, _g, _b, L) => L > 132,
  // Herbsttag: blaeulich oder helle Wolke ist Himmel, warmes Laub und dunkles Nadelholz
  // nicht. So bleibt die Buche ganz und das Polarlicht scheint zwischen den Blaettern.
  swoktober: (r, _g, b, L) => b >= r - 6 && L > 95,
  // Mittagsblau: hier muss die Regel enger sein, sonst verschluckt sie den Kuehlturm und
  // seine Dampffahne (beide hell, aber nicht blau). Deutlicher Blauueberschuss verlangt.
  swrhein: (r, _g, b, L) => b > r + 12 && L > 90,
};

// Tiefste Zeile, bis zu der ueberhaupt Himmel sein darf. Ohne diese Grenze laeuft die
// Flutung an der Silhouette vorbei in die Landschaft: Beim Nebelmeer wurde der Nebel zu
// Himmel (er beruehrt seitlich am Kamm vorbei den Abendhimmel und ist genauso hell), beim
// Rheinbogen der Kuehlturm (der Dunst faerbt ihn blau genug fuer die Regel). Beides waere
// hinter dem Polarlicht verschwunden. Oberhalb der Grenze folgt die Trennung weiter der
// Kontur - die Grenze schneidet nichts ab, sie verhindert nur das Ueberlaufen.
const SKY_MAX_DEPTH: Partial<Record<SceneId, number>> = {
  swnebel: 0.46, // Kamm liegt bei 43 %
  swoktober: 0.37, // knapp UEBER den Alpengipfeln (ab 39 %) - der Dunst um sie herum
  //                  erfuellt die Himmelsregel, sonst verschwaende die Kette dahinter
  swrhein: 0.3, // Huegelkamm 27-30 %, Kuehlturmspitze bei 33 %
};

const NIGHT_GRADE: Partial<Record<SceneId, number>> = {
  swnebel: 0.62, // schon Daemmerung, braucht am wenigsten
  swoktober: 0.18, // Oktoberfarben sollen Oktoberfarben bleiben
  swrhein: 0.22, // echtes Rheinbild, nur leicht gedaempft
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

  // Gegenprobe aus den untersten Bildzeilen: Nachtaufnahmen mit Schnee haben helles
  // Land vor dunklem Himmel, Tagesaufnahmen genau umgekehrt. Ohne diese Unterscheidung
  // sucht die Silhouettensuche im falschen Kontrast und findet den Horizont im Himmel.
  let landSum = 0;
  let landN = 0;
  for (let y = Math.floor(h * 0.88); y < h; y++) {
    for (let x = 0; x < w; x += 3) {
      landSum += lum(d, (y * w + x) * 4);
      landN++;
    }
  }
  const landLum = landSum / Math.max(1, landN);
  const brightLand = landLum >= skyLum;
  const thr = brightLand ? Math.max(9, skyLum + 12) : Math.min(246, skyLum - 14);
  const isLand = (v: number) => (brightLand ? v > thr : v < thr);
  // Bestaetigung der darunterliegenden Zeilen, etwas nachsichtiger als die Schwelle.
  const isLandLoose = (v: number) => (brightLand ? v > thr * 0.7 : v < thr * 1.35);

  // --- 2. Silhouette (first solid row per column) ---
  const raw = new Float32Array(w);
  const maxScan = Math.floor(h * 0.96);

  const hint = HORIZON_HINT[id];
  if (hint !== undefined) {
    raw.fill(h * hint);
  } else if (brightLand) {
    // Nachtaufnahmen mit hellem Schnee: von oben herab die erste feste Zeile suchen.
    // Bewaehrter Weg der vier Erstfassungs-Szenen, unveraendert.
    for (let x = 0; x < w; x++) {
      let found = -1;
      for (let y = 0; y < maxScan; y++) {
        const i = (y * w + x) * 4;
        if (isLand(lum(d, i))) {
          let ok = 0;
          for (let k = 1; k <= 4; k++) {
            if (y + k < h && isLandLoose(lum(d, ((y + k) * w + x) * 4))) ok++;
          }
          if (ok >= 3) {
            found = y;
            break;
          }
        }
      }
      raw[x] = found < 0 ? h : found;
    }
  } else {
    // Tagesaufnahmen: Land ist dunkler als der Himmel - und dunkel ist im Himmel
    // leider auch manches andere. Ein Ast am oberen Bildrand, eine dunkle Wolke, eine
    // beschattete Ecke: von oben gesucht endet der Horizont dort sofort bei y=0.
    // Darum von UNTEN herauf, solange das Land zusammenhaengt. Der Boden ist die
    // sichere Bank; wo der Zusammenhang abreisst, ist der Horizont. Kleine Luecken
    // (heller Weg, Hausdach, Wasserglanz) werden ueberbrueckt.
    const gapMax = Math.max(3, Math.floor(h * 0.02));
    const minY = Math.floor(h * 0.04);
    for (let x = 0; x < w; x++) {
      let gap = 0;
      let lastLand = h - 1;
      let y = h - 1;
      for (; y >= minY; y--) {
        if (isLandLoose(lum(d, (y * w + x) * 4))) {
          gap = 0;
          lastLand = y;
        } else if (++gap > gapMax) {
          break;
        }
      }
      raw[x] = lastLand;
    }
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

  // Himmel je Bildpunkt: Kandidaten nach Bildregel, dann vom oberen Rand aus fluten.
  const rule = SKY_RULE[id];
  let skyPixel: Uint8Array | null = null;
  if (rule) {
    const cand = new Uint8Array(w * h);
    const maxY = Math.floor(h * (SKY_MAX_DEPTH[id] ?? 0.5));
    for (let y = 0; y < maxY; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (rule(d[i], d[i + 1], d[i + 2], lum(d, i))) cand[y * w + x] = 1;
      }
    }

    // Flutung mit eigenem Stapel statt Rekursion - bei 1920x1116 waere der Aufrufstapel
    // sonst laengst uebergelaufen.
    const flood = new Uint8Array(w * h);
    const stack: number[] = [];
    for (let x = 0; x < w; x++) {
      if (cand[x] && !flood[x]) {
        flood[x] = 1;
        stack.push(x);
      }
    }
    while (stack.length) {
      const p = stack.pop()!;
      const x = p % w;
      const y = (p - x) / w;
      if (x > 0 && cand[p - 1] && !flood[p - 1]) { flood[p - 1] = 1; stack.push(p - 1); }
      if (x < w - 1 && cand[p + 1] && !flood[p + 1]) { flood[p + 1] = 1; stack.push(p + 1); }
      if (y > 0 && cand[p - w] && !flood[p - w]) { flood[p - w] = 1; stack.push(p - w); }
      if (y < h - 1 && cand[p + w] && !flood[p + w]) { flood[p + w] = 1; stack.push(p + w); }
    }

    // Notbremse: Faellt die Erkennung offensichtlich um - fast alles oder fast nichts
    // Himmel -, dann lieber die feste Linie als ein zerrissenes Bild.
    let n = 0;
    for (let p = 0; p < flood.length; p++) n += flood[p];
    const share = n / (w * h);
    if (share > 0.05 && share < 0.95) skyPixel = flood;
  }

  // Horizontlinie aus der Silhouette nachziehen: oberster Landpunkt je Spalte. Der
  // Renderer braucht sie fuer Horizontleuchten und Wasserkante - stuende dort noch die
  // gerade Linie, saesse das Leuchten neben dem Kamm statt auf ihm.
  if (skyPixel) {
    for (let x = 0; x < w; x++) {
      let y = 0;
      while (y < h && skyPixel[y * w + x] === 1) y++;
      horizon[x] = y;
    }
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
      const a = skyPixel ? (skyPixel[y * w + x] === 1 ? 255 : 0) : Math.round(t * 255);
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
      const isSky = skyPixel ? skyPixel[y * w + x] === 1 : y < hz - 2;
      if (isSky) {
        d[i + 3] = 0; // sky
      } else if (!skyPixel && y < hz) {
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

  // Nachtstimmung: Helligkeit stark zurueck, Farbe fast raus, Rest ins Blaue. Die
  // Struktur des Bildes bleibt, die Tageszeit nicht. Laeuft bewusst erst hier - die
  // Horizonterkennung oben muss die Originalpixel sehen.
  const night = NIGHT_GRADE[id] ?? 0;
  if (night > 0) {
    for (let i = 0; i < d.length; i += 4) {
      const L = lum(d, i);
      const nr = L * 0.26 + 6;
      const ng = L * 0.32 + 11;
      const nb = L * 0.44 + 20;
      d[i] += (nr - d[i]) * night;
      d[i + 1] += (ng - d[i + 1]) * night;
      d[i + 2] += (nb - d[i + 2]) * night;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  return { id, cut: cv, skyMask: maskCv, waterMask: waterCv, w, h, horizon, waterTop, waterStrength };
}

function clamp01(v: number) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function loadScenery(id: SceneId): Promise<Scenery> | Scenery | null {
  const hit = cache.get(id);
  if (hit) return hit;

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
