export type Waveform = "sanft" | "dynamisch" | "chaotisch" | "vorhang";
export type Direction = "nord" | "sued" | "ost" | "west";
export type SceneId =
  | "fjord"
  | "wald"
  | "eismeer"
  | "huette"
  | "swnebel"
  | "swoktober"
  | "swrhein"
  | "himmel";

export interface Settings {
  scene: SceneId;
  intensity: number; // 0..100
  activity: number; // 0..100
  colorVariety: number; // 0..100
  movement: number; // 0..100
  randomness: number; // 0..100
  palette: string[]; // 5 colors
  speed: number; // 0.1..3
  direction: Direction;
  waveform: Waveform;
  stars: number; // 0..100
  clouds: number; // 0..100
  horizonGlow: number; // 0..100
  moon: number; // 0..100 - 0 = kein Mond
  bands: number; // 2..10
}

export const SCENES: { id: SceneId; label: string }[] = [
  { id: "fjord", label: "Arktische Fjordlandschaft" },
  { id: "wald", label: "Verschneiter Nadelwald" },
  { id: "eismeer", label: "Eismeer & Eisberge" },
  { id: "huette", label: "Berghütte am See" },
  { id: "swnebel", label: "Schwarzwald: Nebelmeer" },
  { id: "swoktober", label: "Schwarzwald: Oktoberblick" },
  { id: "swrhein", label: "Schwarzwald: Rheinbogen" },
  { id: "himmel", label: "Offener Himmel (nur Aurora)" },
];

export const DIRECTIONS: { id: Direction; label: string }[] = [
  { id: "nord", label: "Nord" },
  { id: "sued", label: "Süd" },
  { id: "ost", label: "Ost" },
  { id: "west", label: "West" },
];

export const WAVEFORMS: { id: Waveform; label: string }[] = [
  { id: "sanft", label: "Sanft" },
  { id: "dynamisch", label: "Dynamisch" },
  { id: "chaotisch", label: "Chaotisch" },
  { id: "vorhang", label: "Vorhang" },
];

// kräftig gesättigt wie im Referenzbild: Neon-Grün + Magenta + Violett
export const CLASSIC_PALETTE = ["#18ff8b", "#ff1d8f", "#b32dff", "#00e7ff", "#ffe600"];

export const DEFAULT_SETTINGS: Settings = {
  scene: "fjord",
  intensity: 100,
  activity: 78,
  colorVariety: 95,
  movement: 72,
  randomness: 58,
  palette: [...CLASSIC_PALETTE],
  speed: 1.0,
  direction: "nord",
  waveform: "dynamisch",
  stars: 70,
  clouds: 14,
  horizonGlow: 45,
  moon: 55,
  bands: 4,
};

export const PRESETS: Record<string, Partial<Settings>> = {
  Sanft: {
    intensity: 55,
    activity: 28,
    colorVariety: 35,
    movement: 30,
    randomness: 22,
    speed: 0.5,
    waveform: "sanft",
    stars: 85,
    clouds: 8,
    horizonGlow: 22,
    bands: 3,
    palette: ["#4ade80", "#22d3ee", "#a7f3d0", "#67e8f9", "#bbf7d0"],
  },
  Dynamisch: {
    intensity: 100,
    activity: 78,
    colorVariety: 95,
    movement: 72,
    randomness: 58,
    speed: 1.0,
    waveform: "dynamisch",
    stars: 70,
    clouds: 14,
    horizonGlow: 45,
    bands: 4,
    palette: [...CLASSIC_PALETTE],
  },
  Sturm: {
    intensity: 100,
    activity: 96,
    colorVariety: 100,
    movement: 92,
    randomness: 88,
    speed: 1.8,
    waveform: "chaotisch",
    stars: 42,
    clouds: 35,
    horizonGlow: 78,
    bands: 6,
    palette: ["#00ff8b", "#ff1d6c", "#d000ff", "#ffcc00", "#00e7ff"],
  },
};

export const VARIATION_PALETTES: { name: string; palette: string[]; hint: string }[] = [
  { name: "Smaragd", palette: ["#00ff8b", "#00e7ff", "#a7ffd0", "#2dff8a", "#7affc4"], hint: "from-emerald-400 via-teal-300 to-emerald-900" },
  { name: "Mint", palette: ["#7cffc4", "#38bdf8", "#e0fff4", "#34d399", "#a5f3fc"], hint: "from-teal-200 via-emerald-400 to-slate-900" },
  { name: "Feuer", palette: ["#ff3a3a", "#ff1a8f", "#ffd166", "#ff6b00", "#ff7ab6"], hint: "from-orange-400 via-rose-500 to-slate-900" },
  { name: "Magenta", palette: ["#ff1d8f", "#b32dff", "#f0abfc", "#ff4ecd", "#c084fc"], hint: "from-fuchsia-400 via-purple-600 to-slate-900" },
  { name: "Kosmos", palette: ["#6366f1", "#00e7ff", "#c084fc", "#38bdf8", "#818cf8"], hint: "from-indigo-400 via-sky-400 to-slate-900" },
  { name: "Polar", palette: ["#18ff8b", "#ff1d8f", "#ffe600", "#00e7ff", "#b32dff"], hint: "from-lime-300 via-emerald-500 to-indigo-900" },
];
