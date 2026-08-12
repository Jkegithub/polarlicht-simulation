import { useEffect, useRef } from "react";
import { AuroraRenderer, Metrics } from "../lib/renderer";
import { Settings } from "../types";

interface Props {
  settings: Settings;
  playing: boolean;
  seedKey: number;
  scrubTo: { t: number; k: number } | null;
  onMetrics: (m: Metrics, time: number) => void;
}

export default function AuroraCanvas({ settings, playing, seedKey, scrubTo, onMetrics }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<AuroraRenderer | null>(null);
  const settingsRef = useRef(settings);
  const playingRef = useRef(playing);
  const cbRef = useRef(onMetrics);

  settingsRef.current = settings;
  playingRef.current = playing;
  cbRef.current = onMetrics;

  // init once
  useEffect(() => {
    const canvas = canvasRef.current!;
    const r = new AuroraRenderer(canvas, settingsRef.current);
    rendererRef.current = r;
    r.resize();

    const ro = new ResizeObserver(() => r.resize());
    ro.observe(canvas);

    let raf = 0;
    let last = performance.now();
    let acc = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const realDt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = settingsRef.current;
      const dt = playingRef.current ? realDt * s.speed : 0;
      const m = r.render(dt, now);
      acc += realDt;
      if (acc > 0.1) {
        acc = 0;
        cbRef.current(m, r.time);
      }
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  useEffect(() => {
    rendererRef.current?.setSettings(settings);
  }, [settings]);

  useEffect(() => {
    if (seedKey > 0) rendererRef.current?.reseed();
  }, [seedKey]);

  useEffect(() => {
    if (scrubTo && rendererRef.current) rendererRef.current.time = scrubTo.t;
  }, [scrubTo]);

  return <canvas ref={canvasRef} className="block h-full w-full" />;
}
