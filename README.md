# Polarlicht Simulation

Eine interaktive Aurora-Borealis-Simulation im Browser — reines Canvas-2D-Rendering, kein WebGL, kein externes Asset-Loading nach dem Build.

**Live:** https://jkegithub.github.io/polarlicht-simulation/

## Features

- Prozedurale Polarlicht-Bänder (Value-Noise/FBM), live steuerbar über Intensität, Aktivität, Farbvielfalt, Bewegung, Zufälligkeit, Bandanzahl, Geschwindigkeit, Richtung und Wellenform
- 5 Szenen: Fjord, Nadelwald, Eismeer, Berghütte, freier Himmel — mit automatischer Horizont-/Wasser-Erkennung aus den Fotos (Silhouette-Extraktion, Sky-Mask, Wasserreflexion)
- Sternenhimmel, Wolken, Horizont-Glow, Snapshot-Export als PNG
- Live-Dashboard: Intensitätsverlauf, Kp-Index, Farbverteilung, Oval-Form, Palettenvarianten
- Presets (Sanft / Dynamisch / Sturm / Zufall) sowie freie Farbpaletten

## Tech-Stack

- React 19 + TypeScript, Vite 7
- Tailwind CSS 4
- `vite-plugin-singlefile` — Build erzeugt eine einzige, eigenständige `index.html` (alle Assets inline)

## Entwicklung

```bash
npm install
npm run dev      # Dev-Server
npm run build    # Produktionsbuild -> dist/index.html (single file)
npm run preview  # Build lokal testen
```

## Deployment

Jeder Push auf `main` baut automatisch (GitHub Actions, [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml)) und veröffentlicht `dist/index.html` auf GitHub Pages.

## Lizenz

MIT — siehe [LICENSE](LICENSE).
