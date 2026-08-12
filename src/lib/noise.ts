// Lightweight deterministic value-noise helpers (no dependencies).

function fract(x: number) {
  return x - Math.floor(x);
}

export function hash1(n: number) {
  return fract(Math.sin(n * 127.1) * 43758.5453123);
}

export function hash2(x: number, y: number) {
  return fract(Math.sin(x * 127.1 + y * 311.7) * 43758.5453123);
}

function smooth(t: number) {
  return t * t * (3 - 2 * t);
}

export function valueNoise1(x: number, seed = 0) {
  const i = Math.floor(x);
  const f = smooth(fract(x));
  const a = hash2(i, seed);
  const b = hash2(i + 1, seed);
  return a + (b - a) * f;
}

export function valueNoise2(x: number, y: number, seed = 0) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = smooth(fract(x));
  const fy = smooth(fract(y));
  const a = hash2(ix + seed * 57.3, iy);
  const b = hash2(ix + 1 + seed * 57.3, iy);
  const c = hash2(ix + seed * 57.3, iy + 1);
  const d = hash2(ix + 1 + seed * 57.3, iy + 1);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}

export function fbm1(x: number, octaves = 4, seed = 0) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise1(x * freq, seed + i * 13);
    norm += amp;
    amp *= 0.5;
    freq *= 2.02;
  }
  return sum / norm;
}

export function fbm2(x: number, y: number, octaves = 4, seed = 0) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2(x * freq, y * freq, seed + i * 7);
    norm += amp;
    amp *= 0.5;
    freq *= 2.03;
  }
  return sum / norm;
}

/** #rrggbb -> [r,g,b] */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(rgb: [number, number, number], a: number) {
  return `rgba(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0},${a.toFixed(3)})`;
}

export function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

export function randomPalette(): string[] {
  const baseHue = Math.random() * 360;
  const spread = 40 + Math.random() * 160;
  const out: string[] = [];
  for (let i = 0; i < 5; i++) {
    const h = (baseHue + (i / 4) * spread + (Math.random() - 0.5) * 25 + 360) % 360;
    const s = 70 + Math.random() * 30;
    const l = 55 + Math.random() * 20;
    out.push(hslToHex(h, s, l));
  }
  return out;
}

export function hslToHex(h: number, s: number, l: number) {
  const sn = s / 100;
  const ln = l / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => {
    const c = ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
