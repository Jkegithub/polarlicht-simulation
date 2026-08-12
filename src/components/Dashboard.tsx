import { Metrics } from "../lib/renderer";
import { Settings, VARIATION_PALETTES } from "../types";

interface Props {
  metrics: Metrics;
  history: number[];
  kpHistory: number[];
  settings: Settings;
  time: number;
  duration: number;
  playing: boolean;
  onTogglePlay: () => void;
  onScrub: (t: number) => void;
  onVariation: (palette: string[]) => void;
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`panel rounded-xl px-4 py-3 ${className}`}>
      <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</h4>
      {children}
    </div>
  );
}

function fmt(sec: number) {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function colorName(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let hue = 0;
  if (d !== 0) {
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
  }
  hue = (hue * 60 + 360) % 360;
  if (d < 0.12) return "Weiß";
  if (hue < 15 || hue >= 335) return "Rot";
  if (hue < 45) return "Orange";
  if (hue < 70) return "Gelb";
  if (hue < 160) return "Grün";
  if (hue < 200) return "Türkis";
  if (hue < 250) return "Blau";
  if (hue < 290) return "Lila";
  return "Pink";
}

function Sparkline({ data }: { data: number[] }) {
  const w = 160;
  const h = 46;
  const pts = data.length
    ? data.map((v, i) => `${(i / Math.max(1, data.length - 1)) * w},${h - v * (h - 4) - 2}`).join(" ")
    : `0,${h / 2} ${w},${h / 2}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[46px] w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3dfba2" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#3dfba2" stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline points={`${pts} ${w},${h} 0,${h}`} fill="url(#sparkFill)" stroke="none" />
      <polyline points={pts} fill="none" stroke="#3dfba2" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Bars({ data }: { data: number[] }) {
  return (
    <div className="flex h-[46px] items-end gap-[2px]">
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-[1px] bg-gradient-to-t from-emerald-600/50 to-emerald-300"
          style={{ height: `${Math.max(4, (v / 9) * 100)}%` }}
        />
      ))}
    </div>
  );
}

function Donut({ dist, palette }: { dist: number[]; palette: string[] }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 70 70" className="h-[70px] w-[70px] shrink-0 -rotate-90">
        {dist.map((v, i) => {
          const len = (v / 100) * c;
          const el = (
            <circle
              key={i}
              cx="35"
              cy="35"
              r={r}
              fill="none"
              stroke={palette[i]}
              strokeWidth="11"
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="flex-1 space-y-[3px]">
        {dist.map((v, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px] text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: palette[i] }} />
            <span className="flex-1">{colorName(palette[i])}</span>
            <span className="tabular-nums text-slate-400">{Math.round(v)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard(props: Props) {
  const { metrics, history, kpHistory, settings, time, duration, playing } = props;
  const ovalWidth = Math.round(35 + (settings.activity / 100) * 55);
  const tilt = Math.round(
    (settings.direction === "nord" ? 10 : settings.direction === "sued" ? -12 : settings.direction === "ost" ? 24 : -24) *
      (0.4 + settings.movement / 100),
  );

  return (
    <div className="flex flex-col gap-3">
      {/* timeline */}
      <div className="panel flex items-center gap-4 rounded-xl px-4 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Zeitlinie</span>
        <input
          type="range"
          className="aur flex-1"
          style={{ ["--fill" as string]: `${(time / duration) * 100}%` }}
          min={0}
          max={duration}
          step={0.1}
          value={Math.min(time, duration)}
          onChange={(e) => props.onScrub(parseFloat(e.target.value))}
        />
        <button
          onClick={props.onTogglePlay}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 transition hover:bg-emerald-400/20"
          title={playing ? "Pause" : "Abspielen"}
        >
          {playing ? (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
              <path d="M8 5l11 7-11 7z" />
            </svg>
          )}
        </button>
        <span className="text-[12px] tabular-nums text-slate-300">
          {fmt(time)} / {fmt(duration)}
        </span>
      </div>

      {/* panels */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Card title="Intensität über Zeit">
          <div className="mb-1 text-right text-[13px] font-semibold text-emerald-300">
            {Math.round(metrics.intensity * 100)}%
          </div>
          <Sparkline data={history} />
        </Card>

        <Card title="Aktivität Level (Kp)">
          <div className="mb-1 text-right text-[13px] font-semibold text-emerald-300">{metrics.kp.toFixed(1)}</div>
          <Bars data={kpHistory} />
        </Card>

        <Card title="Farben Verteilung">
          <Donut dist={metrics.distribution} palette={settings.palette} />
        </Card>

        <Card title="Oval Form">
          <svg viewBox="0 0 150 74" className="h-[54px] w-full">
            <g transform={`translate(75 37) rotate(${tilt})`}>
              {[1, 0.72, 0.46, 0.24].map((k, i) => (
                <ellipse
                  key={i}
                  rx={(ovalWidth / 100) * 68 * k}
                  ry={26 * k}
                  fill="none"
                  stroke="#3dfba2"
                  strokeOpacity={0.22 + i * 0.16}
                  strokeWidth="1"
                />
              ))}
              <ellipse rx={(ovalWidth / 100) * 68 * 0.1} ry={2.6} fill="#3dfba2" fillOpacity="0.8" />
            </g>
          </svg>
          <div className="mt-1 text-center text-[10px] leading-tight text-slate-400">
            Breite: {ovalWidth}%<br />
            Neigung: {tilt}°
          </div>
        </Card>

        <Card title="Vorschau Variationen" className="col-span-2 lg:col-span-1">
          <div className="grid grid-cols-3 gap-1.5">
            {VARIATION_PALETTES.map((v) => (
              <button
                key={v.name}
                onClick={() => props.onVariation(v.palette)}
                title={v.name}
                className="group relative h-[38px] overflow-hidden rounded-md ring-1 ring-white/10 transition hover:ring-emerald-400/70"
              >
                <div className={`absolute inset-0 bg-gradient-to-b ${v.hint}`} />
                <div
                  className="absolute inset-x-0 top-1 h-4 opacity-80 blur-[3px]"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${v.palette[0]}, ${v.palette[1]}, transparent)`,
                  }}
                />
                <div
                  className="absolute inset-x-0 top-3.5 h-3 opacity-70 blur-[4px]"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${v.palette[2]}, transparent)`,
                  }}
                />
                <span className="absolute bottom-0 left-0 right-0 bg-black/45 py-[1px] text-[8px] text-slate-200 opacity-0 transition group-hover:opacity-100">
                  {v.name}
                </span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
