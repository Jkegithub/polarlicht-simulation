# Polarlicht Simulation

Eine interaktive Aurora-Borealis-Simulation im Browser — reines Canvas-2D-Rendering, kein WebGL, kein externes Asset-Loading nach dem Build.

**Live:** https://jkegithub.github.io/polarlicht-simulation/

## Features

- Prozedurale Polarlicht-Bänder (Value-Noise/FBM), live steuerbar über Intensität, Aktivität, Farbvielfalt, Bewegung, Zufälligkeit, Bandanzahl, Geschwindigkeit, Richtung und Wellenform
- 8 Szenen: Fjord, Nadelwald, Eismeer, Berghütte, drei Schwarzwald-Ansichten, freier Himmel — mit automatischer Horizont-/Wasser-Erkennung (Silhouette-Extraktion, Sky-Mask, Wasserreflexion)
- **Zwei Kontrastlagen bei der Horizont-Erkennung:** Die Nachtszenen haben helles (verschneites) Land vor dunklem Himmel, die Schwarzwald-Aufnahmen entstanden bei Tageslicht und damit umgekehrt. Der Code misst die Lage aus Bildober- und -unterkante und sucht die Silhouette entsprechend von oben herab oder von unten herauf; Tagesaufnahmen werden zusätzlich ins Nächtliche umgestimmt, damit eine Aurora darüber überhaupt plausibel ist
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

Die 6 echten Demo-Aufnahmen im Dropdown stammen aus dem **Musopen Kickstarter Project**, als „Public Domain Mark 1.0“ gekennzeichnet, bezogen über [archive.org/details/MusopenCollectionAsFlac](https://archive.org/details/MusopenCollectionAsFlac):

- J.S. Bach – Goldberg-Variationen, Nr. 4
- Haydn – Streichquartett „Die Lerche“, Finale
- Borodin – Streichquartett Nr. 1, Scherzo
- Grieg – „Morgenstimmung“ aus Peer Gynt, Suite Nr. 1 op. 46
- Smetana – „Die Moldau“ aus Má vlast
- Mendelssohn – „Die Hebriden“ (Fingalshöhle) op. 26

Die 5 Demo-Loops (Ambient/Electro/Neoklassik/Rock/Schwarzwald-Walzer) sind keine Aufnahmen, sondern werden live im Browser synthetisiert ([src/lib/generators.ts](src/lib/generators.ts)) — vollständig eigenes Material.

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

Die drei Schwarzwald-Szenen `scene-sw-nebel.jpg` (Nebelmeer), `scene-sw-oktober.jpg`
(Oktoberblick) und `scene-sw-rhein.jpg` (Rheinbogen bei Waldshut) sind **eigene
Aufnahmen des Projektautors** — für die Verwendung hier freigegeben, für die
Weiterverwendung durch Dritte gilt die MIT-Lizenz des Codes ausdrücklich **nicht**.
Sie liegen auf 1920 px Breite verkleinert im Repository, weil der Build alle Bilder
als base64 in die einzige `index.html` einbettet.

## Lizenz

MIT — siehe [LICENSE](LICENSE). Die Musik-Democlips in `public/audio/` unterliegen der oben genannten Public-Domain-Kennzeichnung, nicht der MIT-Lizenz des Codes; für die Bildszenen gilt der Abschnitt [Bild-Credits](#bild-credits).
