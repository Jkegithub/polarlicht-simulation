# Polarlicht Simulation

Eine interaktive Aurora-Borealis-Simulation im Browser — reines Canvas-2D-Rendering, kein WebGL, kein externes Asset-Loading nach dem Build.

**Live:** https://jkegithub.github.io/polarlicht-simulation/

## Features

- Prozedurale Polarlicht-Bänder (Value-Noise/FBM), live steuerbar über Intensität, Aktivität, Farbvielfalt, Bewegung, Zufälligkeit, Bandanzahl, Geschwindigkeit, Richtung und Wellenform
- 6 Szenen: Fjord, Nadelwald, Eismeer, Berghütte, Schwarzwald, freier Himmel — mit automatischer Horizont-/Wasser-Erkennung (Silhouette-Extraktion, Sky-Mask, Wasserreflexion). Der **Schwarzwald ist gezeichnet statt fotografiert** ([src/lib/schwarzwald.ts](src/lib/schwarzwald.ts)): gestaffelte Höhenzüge, Tannensilhouetten und Talnebel entstehen im Browser aus Code und laufen anschließend durch dieselbe Horizont-Erkennung wie die Fotos — kein Fremdmaterial, kein Dateigewicht
- Sternenhimmel, Wolken, Horizont-Glow, Snapshot-Export als PNG
- Live-Dashboard: Intensitätsverlauf, Kp-Index, Farbverteilung, Oval-Form, Palettenvarianten
- Presets (Sanft / Dynamisch / Sturm / Zufall) sowie freie Farbpaletten
- **Audio-reaktiver Modus**: eigene Musikdatei hochladen — Bass/Mitten/Höhen steuern live Helligkeit, Verwirbelung und Tempo der Girlanden (Web Audio API, `AnalyserNode`). Dropdown mit 3 gemeinfreien Aufnahmen zum Reinhören (siehe [Musik-Credits](#musik-credits)) plus 5 eigenen, im Browser synthetisierten Demo-Loops (Ambient/Electro/Neoklassik/Rock/Schwarzwald-Walzer)

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

Die 5 weiteren Demo-Loops (Ambient/Electro/Neoklassik/Rock/Schwarzwald-Walzer) sind keine Aufnahmen, sondern werden live im Browser synthetisiert ([src/lib/generators.ts](src/lib/generators.ts)) — vollständig eigenes Material.

## Bild-Credits

Die vier Fotoszenen `scene-fjord.jpg`, `scene-wald.jpg`, `scene-eismeer.jpg` und
`scene-huette.jpg` in `src/assets/` sind **KI-erzeugte Bilder aus der Erstfassung dieser
Simulation** (ChatGPT, Bildgenerierung im Auftrag des Projektautors) — keine
Fotografien und kein Stockmaterial. Nach den Nutzungsbedingungen von OpenAI gehen
Rechte, Titel und Anteil an erzeugten Ausgaben an den Nutzer über, der sie erzeugt hat,
einschließlich kommerzieller Verwendung. Zu beachten: Rein KI-erzeugte Bilder genießen
nach derzeitiger Auffassung des US Copyright Office mangels menschlicher Urheberschaft
**keinen eigenen Urheberrechtsschutz** — sie sind hier verwendbar, aber nicht
monopolisierbar. *(Stand der Prüfung: 18.08.2026.)*

Die Szene **Schwarzwald** ist kein Bild, sondern Code: Sie wird bei Auswahl im Browser
gezeichnet ([src/lib/schwarzwald.ts](src/lib/schwarzwald.ts)) — dieselbe Linie wie bei
den synthetisierten Klang-Loops, damit keine weitere Rechtefrage entsteht.

## Lizenz

MIT — siehe [LICENSE](LICENSE). Die Musik-Democlips in `public/audio/` unterliegen der oben genannten Public-Domain-Kennzeichnung, nicht der MIT-Lizenz des Codes; für die Bildszenen gilt der Abschnitt [Bild-Credits](#bild-credits).
