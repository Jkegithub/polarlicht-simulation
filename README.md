# Polarlicht Simulation

Eine interaktive Aurora-Borealis-Simulation im Browser — reines Canvas-2D-Rendering, kein WebGL, kein externes Asset-Loading nach dem Build.

**Live:** https://jkegithub.github.io/polarlicht-simulation/

## Features

- Prozedurale Polarlicht-Bänder (Value-Noise/FBM), live steuerbar über Intensität, Aktivität, Farbvielfalt, Bewegung, Zufälligkeit, Bandanzahl, Geschwindigkeit, Richtung und Wellenform
- 5 Szenen: Fjord, Nadelwald, Eismeer, Berghütte, freier Himmel — mit automatischer Horizont-/Wasser-Erkennung aus den Fotos (Silhouette-Extraktion, Sky-Mask, Wasserreflexion)
- Sternenhimmel, Wolken, Horizont-Glow, Snapshot-Export als PNG
- Live-Dashboard: Intensitätsverlauf, Kp-Index, Farbverteilung, Oval-Form, Palettenvarianten
- Presets (Sanft / Dynamisch / Sturm / Zufall) sowie freie Farbpaletten
- **Audio-reaktiver Modus**: eigene Musikdatei hochladen — Bass/Mitten/Höhen steuern live Helligkeit, Verwirbelung und Tempo der Girlanden (Web Audio API, `AnalyserNode`). Dropdown mit 3 gemeinfreien Aufnahmen zum Reinhören (siehe [Musik-Credits](#musik-credits)) plus 4 eigenen, im Browser synthetisierten Demo-Loops (Ambient/Electro/Neoklassik/Rock)

## Tech-Stack

- React 19 + TypeScript, Vite 7
- Tailwind CSS 4
- `vite-plugin-singlefile` — Build erzeugt eine einzige, eigenständige `index.html` (alle Assets inline); die 3 Musik-Democlips in `public/audio/` bleiben bewusst separate, lazy geladene Dateien

## Entwicklung

```bash
npm install
npm run dev      # Dev-Server
npm run build    # Produktionsbuild -> dist/index.html (single file)
npm run preview  # Build lokal testen
```

## Deployment

Jeder Push auf `main` baut automatisch (GitHub Actions, [.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml)) und veröffentlicht `dist/index.html` auf GitHub Pages.

## Musik-Credits

Die 3 echten Demo-Aufnahmen im Dropdown stammen aus dem **Musopen Kickstarter Project**, als „Public Domain Mark 1.0“ gekennzeichnet, bezogen über [archive.org/details/MusopenCollectionAsFlac](https://archive.org/details/MusopenCollectionAsFlac):

- J.S. Bach – Goldberg-Variationen, Nr. 4
- Haydn – Streichquartett „Die Lerche“, Finale
- Borodin – Streichquartett Nr. 1, Scherzo

Die 4 weiteren Demo-Loops (Ambient/Electro/Neoklassik/Rock) sind keine Aufnahmen, sondern werden live im Browser synthetisiert ([src/lib/generators.ts](src/lib/generators.ts)) — vollständig eigenes Material.

## Lizenz

MIT — siehe [LICENSE](LICENSE). Die Musik-Democlips in `public/audio/` unterliegen der oben genannten Public-Domain-Kennzeichnung, nicht der MIT-Lizenz des Codes.
