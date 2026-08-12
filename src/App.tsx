import { useCallback, useEffect, useRef, useState } from "react";
import AuroraCanvas from "./components/AuroraCanvas";
import Dashboard from "./components/Dashboard";
import Sidebar from "./components/Sidebar";
import { AudioReactor } from "./lib/audio";
import { DemoTrack, GeneratorId } from "./lib/demoTracks";
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
  const [sidebarOpen, setSidebarOpen] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches,
  );

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

  const audioElRef = useRef<HTMLAudioElement>(null);
  const audioReactorRef = useRef<AudioReactor | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const [audioName, setAudioName] = useState<string | null>(null);
  const [audioCredit, setAudioCredit] = useState<string | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [activeGenId, setActiveGenId] = useState<GeneratorId | null>(null);
  const activeGenIdRef = useRef<GeneratorId | null>(null);
  activeGenIdRef.current = activeGenId;

  useEffect(() => {
    return () => {
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      audioReactorRef.current?.dispose();
    };
  }, []);

  const ensureReactor = useCallback(() => {
    const el = audioElRef.current;
    if (el && !audioReactorRef.current) audioReactorRef.current = new AudioReactor(el);
    return audioReactorRef.current;
  }, []);

  const onAudioFile = useCallback(
    (file: File) => {
      const el = audioElRef.current;
      const reactor = ensureReactor();
      if (!el || !reactor) return;
      reactor.stopGenerated();
      activeGenIdRef.current = null;
      setActiveGenId(null);
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current);
      const url = URL.createObjectURL(file);
      audioUrlRef.current = url;
      el.src = url;
      setAudioName(file.name);
      setAudioCredit(null);
      reactor.resume();
      el.play().catch(() => {});
    },
    [ensureReactor],
  );

  const onSelectDemo = useCallback(
    (track: DemoTrack) => {
      const reactor = ensureReactor();
      const el = audioElRef.current;
      if (!reactor || !el) return;
      reactor.resume();
      if (track.kind === "file") {
        reactor.stopGenerated();
        activeGenIdRef.current = null;
        setActiveGenId(null);
        if (audioUrlRef.current) {
          URL.revokeObjectURL(audioUrlRef.current);
          audioUrlRef.current = null;
        }
        el.src = track.url!;
        setAudioName(track.label);
        setAudioCredit(track.credit ?? null);
        el.play().catch(() => {});
      } else {
        el.pause();
        reactor.playGenerated(track.id as GeneratorId);
        activeGenIdRef.current = track.id as GeneratorId;
        setActiveGenId(track.id as GeneratorId);
        setAudioName(track.label);
        setAudioCredit(null);
        setAudioPlaying(true);
      }
    },
    [ensureReactor],
  );

  const onToggleAudioPlay = useCallback(() => {
    const reactor = audioReactorRef.current;
    if (activeGenId) {
      if (audioPlaying) {
        reactor?.stopGenerated();
        setAudioPlaying(false);
      } else {
        reactor?.resume();
        reactor?.playGenerated(activeGenId);
        setAudioPlaying(true);
      }
      return;
    }
    const el = audioElRef.current;
    if (!el || !audioName) return;
    reactor?.resume();
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  }, [activeGenId, audioPlaying, audioName]);

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
          audioReactorRef={audioReactorRef}
        />
      </div>

      {/* persistent audio element: survives sidebar open/close so playback never interrupts */}
      <audio
        ref={audioElRef}
        className="hidden"
        onPlay={() => { if (!activeGenIdRef.current) setAudioPlaying(true); }}
        onPause={() => { if (!activeGenIdRef.current) setAudioPlaying(false); }}
        onEnded={() => { if (!activeGenIdRef.current) setAudioPlaying(false); }}
      />

      {/* top right tools */}
      <div className="absolute right-2 top-2 z-40 flex gap-1.5 sm:right-4 sm:top-4 sm:gap-2">
        <button
          onClick={() => setSidebarOpen((v) => !v)}
          title={sidebarOpen ? "Panel ausblenden" : "Panel einblenden"}
          className="panel flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 transition hover:text-emerald-300 sm:px-3"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="14" y2="17" />
          </svg>
          <span className="hidden sm:inline">{sidebarOpen ? "Panel ausblenden" : "Panel einblenden"}</span>
        </button>
        <button
          onClick={() => setSeedKey((k) => k + 1)}
          title="Neu würfeln"
          className="panel flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 transition hover:text-emerald-300 sm:px-3"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="4" y="4" width="16" height="16" rx="3" />
            <circle cx="8" cy="8" r="1.3" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
            <circle cx="16" cy="16" r="1.3" fill="currentColor" stroke="none" />
          </svg>
          <span className="hidden sm:inline">Neu würfeln</span>
        </button>
        <button
          onClick={snapshot}
          title="Foto speichern"
          className="panel flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 transition hover:text-emerald-300 sm:px-3"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M9 4L7.5 6H4a1 1 0 00-1 1v11a1 1 0 001 1h16a1 1 0 001-1V7a1 1 0 00-1-1h-3.5L15 4H9z" />
            <circle cx="12" cy="13" r="3.4" />
          </svg>
          <span className="hidden sm:inline">Foto speichern</span>
        </button>
        <div className="panel flex items-center rounded-lg px-2 py-1.5 text-[11px] tabular-nums text-emerald-300/80 sm:px-3">
          {Math.round(metrics.fps)} fps
        </div>
      </div>

      {/* sidebar */}
      {sidebarOpen && (
        <div className="absolute bottom-3 left-3 top-16 z-30 block max-w-[86vw] sm:top-3">
          <Sidebar
            settings={settings}
            patch={patch}
            applyPreset={applyPreset}
            activePreset={activePreset}
            randomPalette={() => patch({ palette: makePalette() })}
            audioName={audioName}
            audioCredit={audioCredit}
            audioPlaying={audioPlaying}
            onAudioFile={onAudioFile}
            onToggleAudioPlay={onToggleAudioPlay}
            onSelectDemo={onSelectDemo}
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
