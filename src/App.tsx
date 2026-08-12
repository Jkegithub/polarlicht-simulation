import { useCallback, useRef, useState } from "react";
import AuroraCanvas from "./components/AuroraCanvas";
import Dashboard from "./components/Dashboard";
import Sidebar from "./components/Sidebar";
import { Metrics } from "./lib/renderer";
import { randomPalette as makePalette } from "./lib/noise";
import { DEFAULT_SETTINGS, PRESETS, Settings, WAVEFORMS } from "./types";

const DURATION = 150; // 02:30

export default function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [playing, setPlaying] = useState(true);
  const [activePreset, setActivePreset] = useState("Dynamisch");
  const [seedKey, setSeedKey] = useState(0);
  const [scrubTo, setScrubTo] = useState<{ t: number; k: number } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [metrics, setMetrics] = useState<Metrics>({
    intensity: 0.85,
    kp: 5.6,
    distribution: [45, 25, 20, 7, 3],
    fps: 60,
  });
  const [time, setTime] = useState(0);
  const [history, setHistory] = useState<number[]>(() => Array(64).fill(0.5));
  const [kpHistory, setKpHistory] = useState<number[]>(() => Array(36).fill(4));
  const scrubK = useRef(0);

  const patch = useCallback((p: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...p }));
  }, []);

  const onMetrics = useCallback((m: Metrics, t: number) => {
    setMetrics(m);
    setTime(t % DURATION);
    setHistory((h) => [...h.slice(-63), m.intensity]);
    setKpHistory((h) => [...h.slice(-35), m.kp]);
  }, []);

  const applyPreset = (name: string) => {
    setActivePreset(name);
    if (name === "Zufall") {
      const waves = WAVEFORMS.map((w) => w.id);
      patch({
        intensity: 40 + Math.random() * 60,
        activity: Math.random() * 100,
        colorVariety: Math.random() * 100,
        movement: 20 + Math.random() * 80,
        randomness: Math.random() * 100,
        speed: 0.4 + Math.random() * 2,
        stars: 30 + Math.random() * 70,
        clouds: Math.random() * 60,
        horizonGlow: Math.random() * 80,
        bands: 3 + Math.floor(Math.random() * 7),
        waveform: waves[Math.floor(Math.random() * waves.length)],
        palette: makePalette(),
      });
      setSeedKey((k) => k + 1);
      return;
    }
    const p = PRESETS[name];
    if (p) patch(p);
  };

  const snapshot = () => {
    const canvas = document.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `polarlicht-${Date.now()}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#05070d]">
      {/* full-bleed simulation */}
      <div className="absolute inset-0">
        <AuroraCanvas
          settings={settings}
          playing={playing}
          seedKey={seedKey}
          scrubTo={scrubTo}
          onMetrics={onMetrics}
        />
      </div>

      {/* top right tools */}
      <div className="absolute right-4 top-4 z-20 flex gap-2">
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          className="panel rounded-lg px-3 py-1.5 text-[11px] text-slate-200 transition hover:text-emerald-300"
        >
          {sidebarOpen ? "Panel ausblenden" : "Panel einblenden"}
        </button>
        <button
          onClick={() => setSeedKey((k) => k + 1)}
          className="panel rounded-lg px-3 py-1.5 text-[11px] text-slate-200 transition hover:text-emerald-300"
        >
          Neu würfeln
        </button>
        <button
          onClick={snapshot}
          className="panel rounded-lg px-3 py-1.5 text-[11px] text-slate-200 transition hover:text-emerald-300"
        >
          Foto speichern
        </button>
        <div className="panel rounded-lg px-3 py-1.5 text-[11px] tabular-nums text-emerald-300/80">
          {Math.round(metrics.fps)} fps
        </div>
      </div>

      {/* sidebar */}
      {sidebarOpen && (
        <div className="absolute bottom-3 left-3 top-3 z-30 block max-w-[86vw]">
          <Sidebar
            settings={settings}
            patch={patch}
            applyPreset={applyPreset}
            activePreset={activePreset}
            randomPalette={() => patch({ palette: makePalette() })}
          />
        </div>
      )}

      {/* dashboard */}
      <div className="absolute bottom-3 left-3 right-3 z-10 md:left-[334px]">
        <Dashboard
          metrics={metrics}
          history={history}
          kpHistory={kpHistory}
          settings={settings}
          time={time}
          duration={DURATION}
          playing={playing}
          onTogglePlay={() => setPlaying((p) => !p)}
          onScrub={(t) => {
            scrubK.current += 1;
            setScrubTo({ t, k: scrubK.current });
            setTime(t);
          }}
          onVariation={(palette) => patch({ palette })}
        />
      </div>
    </div>
  );
}
