/**
 * Schwarzwald-Szene — gezeichnet, nicht fotografiert.
 *
 * Warum gezeichnet: Die vier Fotoszenen stammen aus einer KI-Erstfassung, und für
 * jedes weitere Bild aus fremder Quelle müsste die Rechtefrage neu belegt werden.
 * Hier entsteht das Bild im Browser aus Code — dieselbe Linie wie bei den
 * synthetisierten Klang-Loops: kein Fremdmaterial, kein Dateigewicht.
 *
 * Wichtig für die Bildlogik: `process()` in scenery.ts erkennt Land als das, was
 * HELLER ist als der Himmel (die Fotoszenen sind Schneelandschaften vor Nachthimmel).
 * Darum ist hier alles Land deutlich heller als der dunkelste Himmel — verschneite
 * Höhenzüge, schneeschwere Tannen. Die Reihenfolge dunkel→hell darf nicht kippen,
 * sonst rutscht die Horizontlinie in den Himmel.
 */

// Deterministischer Zufall: dieselbe Zeichnung bei jedem Aufruf, sonst wandert der
// Wald bei jedem Szenenwechsel und der Vergleich zweier Stände wird unmöglich.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Eine Tanne: schmal, gestufte Äste, schneeschwer nach unten breiter. */
function fir(ctx: CanvasRenderingContext2D, x: number, baseY: number, height: number, rnd: () => number) {
  const tiers = 5;
  const halfW = height * (0.17 + rnd() * 0.05);
  ctx.beginPath();
  for (let i = 0; i < tiers; i++) {
    const f = i / (tiers - 1); // 0 = Spitze, 1 = unterste Stufe
    const tierTop = baseY - height * (1 - f * 0.78);
    const tierBase = tierTop + height * 0.3;
    const spread = halfW * (0.25 + f * 0.95);
    ctx.moveTo(x, tierTop);
    ctx.lineTo(x + spread, tierBase);
    ctx.lineTo(x + spread * 0.45, tierBase);
    ctx.lineTo(x, tierBase + height * 0.06);
    ctx.lineTo(x - spread * 0.45, tierBase);
    ctx.lineTo(x - spread, tierBase);
    ctx.closePath();
  }
  ctx.fill();
}

/** Eine Höhenzug-Linie: weiche Wellen, keine Zacken — der Schwarzwald ist rund. */
function ridgeLine(w: number, baseY: number, amp: number, rnd: () => number) {
  const pts: number[] = [];
  const p1 = rnd() * Math.PI * 2;
  const p2 = rnd() * Math.PI * 2;
  const p3 = rnd() * Math.PI * 2;
  for (let x = 0; x <= w; x++) {
    const u = x / w;
    const y =
      baseY +
      Math.sin(u * Math.PI * 1.3 + p1) * amp +
      Math.sin(u * Math.PI * 3.1 + p2) * amp * 0.38 +
      Math.sin(u * Math.PI * 6.7 + p3) * amp * 0.13;
    pts.push(y);
  }
  return pts;
}

function fillUnder(ctx: CanvasRenderingContext2D, pts: number[], w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x++) ctx.lineTo(x, pts[x]);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();
}

export function drawSchwarzwald(w: number, h: number): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d")!;
  const rnd = mulberry32(0x5c4a1d);

  // --- Himmel: durchgehend dunkel. Der Schwellenwert der Szenen-Erkennung ergibt
  // sich aus den obersten 2 % Bildzeilen; alles Land muss darüber liegen. ---
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.72);
  sky.addColorStop(0, "#03050c");
  sky.addColorStop(1, "#080d16");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // --- Drei Höhenzüge, hinten hell und diesig, vorne dunkler und näher ---
  const far = ridgeLine(w, h * 0.545, h * 0.034, rnd);
  const mid = ridgeLine(w, h * 0.635, h * 0.042, rnd);
  const near = ridgeLine(w, h * 0.735, h * 0.05, rnd);

  const drawLayer = (pts: number[], color: string, count: number, treeH: number, spread: number) => {
    fillUnder(ctx, pts, w, h, color);
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const x = Math.floor(rnd() * w);
      const hgt = treeH * (0.6 + rnd() * spread);
      fir(ctx, x, pts[x] + hgt * 0.14, hgt, rnd);
    }
  };

  drawLayer(far, "#5d7386", 150, h * 0.05, 0.8);
  drawLayer(mid, "#42586b", 120, h * 0.075, 0.9);
  drawLayer(near, "#2c3e50", 90, h * 0.115, 1.0);

  // --- Nebel in den Tälern: nur UNTERHALB der vordersten Kammlinie, sonst hellt er
  // den Himmel auf und die Horizonterkennung greift daneben. ---
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x++) ctx.lineTo(x, far[x]);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.clip();
  for (let i = 0; i < 5; i++) {
    const y = h * (0.6 + i * 0.07) + (rnd() - 0.5) * h * 0.02;
    const band = ctx.createLinearGradient(0, y - h * 0.05, 0, y + h * 0.05);
    band.addColorStop(0, "rgba(210,228,240,0)");
    band.addColorStop(0.5, `rgba(210,228,240,${0.1 + rnd() * 0.07})`);
    band.addColorStop(1, "rgba(210,228,240,0)");
    ctx.fillStyle = band;
    ctx.fillRect(0, y - h * 0.06, w, h * 0.12);
  }
  ctx.restore();

  // --- Verschneiter Vordergrund ---
  const snow = ctx.createLinearGradient(0, h * 0.82, 0, h);
  snow.addColorStop(0, "#6d8598");
  snow.addColorStop(1, "#8ea6b8");
  ctx.fillStyle = snow;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x++) {
    const u = x / w;
    ctx.lineTo(x, h * 0.86 + Math.sin(u * Math.PI * 2.2 + 1.1) * h * 0.018);
  }
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  return cv;
}
