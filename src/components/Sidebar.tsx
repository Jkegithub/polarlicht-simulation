import { SCENE_URLS } from "../lib/scenery";
import { DIRECTIONS, Direction, SCENES, SceneId, Settings, WAVEFORMS, Waveform } from "../types";

function SceneGrid({ value, onChange }: { value: SceneId; onChange: (v: SceneId) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {SCENES.map((sc) => {
        const url = SCENE_URLS[sc.id];
        const active = value === sc.id;
        return (
          <button
            key={sc.id}
            onClick={() => onChange(sc.id)}
            title={sc.label}
            className={`group relative h-[52px] overflow-hidden rounded-lg ring-1 transition ${
              active ? "ring-2 ring-emerald-400" : "ring-white/10 hover:ring-emerald-400/50"
            } ${sc.id === "himmel" ? "col-span-2 h-[34px]" : ""}`}
          >
            {url ? (
              <img src={url} alt={sc.label} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-linear-to-r from-emerald-500/40 via-fuchsia-500/30 to-indigo-600/40" />
            )}
            <div className="absolute inset-0 bg-linear-to-t from-black/85 via-black/25 to-transparent" />
            <span
              className={`absolute inset-x-1 bottom-1 truncate text-left text-[9px] leading-tight ${
                active ? "text-emerald-300" : "text-slate-200"
              }`}
            >
              {sc.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

interface Props {
  settings: Settings;
  patch: (p: Partial<Settings>) => void;
  applyPreset: (name: string) => void;
  activePreset: string;
  randomPalette: () => void;
  audioName: string | null;
  audioPlaying: boolean;
  onAudioFile: (file: File) => void;
  onToggleAudioPlay: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-white/6 px-5 py-4">
      <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{title}</h3>
      {children}
    </div>
  );
}

function Slider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  suffix = "%",
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[12px] text-slate-300">{label}</span>
        <span className="text-[12px] font-medium tabular-nums text-emerald-300">
          {suffix === "%" ? Math.round(value) : value.toFixed(1)}
          {suffix}
        </span>
      </div>
      <input
        type="range"
        className="aur"
        style={{ ["--fill" as string]: `${fill}%` }}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
    </div>
  );
}

function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className={label ? "mb-2 flex items-center justify-between gap-3" : ""}>
      {label && <span className="text-[12px] text-slate-300">{label}</span>}
      <div className={`relative ${label ? "w-[165px]" : "w-full"}`}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
          className="w-full cursor-pointer appearance-none rounded-md border border-white/10 bg-white/4 px-3 py-2 pr-8 text-[12px] text-slate-100 outline-none transition hover:border-emerald-400/40 focus:border-emerald-400/60"
        >
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

export default function Sidebar({
  settings,
  patch,
  applyPreset,
  activePreset,
  randomPalette,
  audioName,
  audioPlaying,
  onAudioFile,
  onToggleAudioPlay,
}: Props) {
  const s = settings;
  return (
    <aside className="panel scrollbar-thin flex h-full w-[310px] shrink-0 flex-col overflow-y-auto rounded-2xl">
      <div className="border-b border-white/6 px-5 pb-4 pt-5">
        <h1 className="text-[26px] font-bold leading-none tracking-[0.06em] text-white">POLARLICHT</h1>
        <p className="mt-1 text-[15px] font-semibold tracking-[0.22em] text-emerald-400">SIMULATION</p>
      </div>

      <Section title="Szene">
        <SceneGrid value={s.scene} onChange={(v) => patch({ scene: v })} />
      </Section>

      <Section title="Variabilität Steuerung">
        <Slider label="Intensität" value={s.intensity} onChange={(v) => patch({ intensity: v })} />
        <Slider label="Aktivität" value={s.activity} onChange={(v) => patch({ activity: v })} />
        <Slider label="Farbvielfalt" value={s.colorVariety} onChange={(v) => patch({ colorVariety: v })} />
        <Slider label="Bewegung" value={s.movement} onChange={(v) => patch({ movement: v })} />
        <Slider label="Zufälligkeit" value={s.randomness} onChange={(v) => patch({ randomness: v })} />
        <Slider
          label="Bänder"
          value={s.bands}
          min={2}
          max={10}
          step={1}
          suffix=""
          onChange={(v) => patch({ bands: v })}
        />
      </Section>

      <Section title="Farben">
        <div className="mb-3 flex gap-2.5">
          {s.palette.map((c, i) => (
            <label
              key={i}
              className="relative h-8 w-8 cursor-pointer rounded-full ring-1 ring-white/20 transition hover:scale-110"
              style={{ background: c, boxShadow: `0 0 12px ${c}66` }}
              title={`Farbe ${i + 1}: ${c}`}
            >
              <input
                type="color"
                value={c}
                onChange={(e) => {
                  const p = [...s.palette];
                  p[i] = e.target.value;
                  patch({ palette: p });
                }}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
            </label>
          ))}
        </div>
        <button
          onClick={randomPalette}
          className="rounded-md border border-white/10 bg-white/4 px-3 py-1.5 text-[12px] text-slate-200 transition hover:border-emerald-400/50 hover:text-emerald-300"
        >
          Zufällige Palette
        </button>
      </Section>

      <Section title="Zeit & Bewegung">
        <Slider
          label="Geschwindigkeit"
          value={s.speed}
          min={0.1}
          max={3}
          step={0.1}
          suffix="x"
          onChange={(v) => patch({ speed: v })}
        />
        <Select<Direction>
          label="Richtung"
          value={s.direction}
          options={DIRECTIONS}
          onChange={(v) => patch({ direction: v })}
        />
        <Select<Waveform>
          label="Wellenform"
          value={s.waveform}
          options={WAVEFORMS}
          onChange={(v) => patch({ waveform: v })}
        />
      </Section>

      <Section title="Musik-Synchronisation">
        <label className="flex cursor-pointer items-center gap-2 rounded-md border border-white/10 bg-white/4 px-3 py-2 text-[12px] text-slate-200 transition hover:border-emerald-400/40 hover:text-emerald-200">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M9 18V5l11-2v13" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <span className="truncate">{audioName ?? "Musikdatei wählen…"}</span>
          <input
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onAudioFile(file);
              e.target.value = "";
            }}
          />
        </label>

        {audioName && (
          <button
            onClick={onToggleAudioPlay}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-[12px] text-emerald-300 transition hover:bg-emerald-400/20"
          >
            {audioPlaying ? (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                <path d="M8 5l11 7-11 7z" />
              </svg>
            )}
            {audioPlaying ? "Pause" : "Abspielen"}
          </button>
        )}

        <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
          Bass, Mitten und Höhen der geladenen Datei steuern live Helligkeit, Verwirbelung und Tempo der Girlanden.
        </p>
      </Section>

      <Section title="Himmelsbedingungen">
        <Slider label="Sterne" value={s.stars} onChange={(v) => patch({ stars: v })} />
        <Slider label="Wolken" value={s.clouds} onChange={(v) => patch({ clouds: v })} />
        <Slider label="Horizont-Leuchten" value={s.horizonGlow} onChange={(v) => patch({ horizonGlow: v })} />
      </Section>

      <Section title="Voreinstellungen">
        <div className="flex flex-wrap gap-2">
          {["Sanft", "Dynamisch", "Sturm", "Zufall"].map((p) => (
            <button
              key={p}
              onClick={() => applyPreset(p)}
              className={`rounded-md px-3 py-1.5 text-[12px] transition ${
                activePreset === p
                  ? "bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/60"
                  : "border border-white/10 bg-white/4 text-slate-300 hover:border-emerald-400/40 hover:text-emerald-200"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </Section>

      <div className="mt-auto px-5 py-4 text-[10px] leading-relaxed text-slate-500">
        Echtzeit-Partikel- & Vorhangsimulation · Canvas 2D · alle Parameter live steuerbar
      </div>
    </aside>
  );
}
