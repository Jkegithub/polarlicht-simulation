export type GeneratorId = "ambient" | "electro" | "arpeggio" | "rock";

export interface DemoTrack {
  id: string;
  label: string;
  genre: string;
  kind: "file" | "generated";
  url?: string;
  credit?: string;
}

// 3 real, verifiably public-domain recordings (Musopen Kickstarter Project,
// "Public Domain Mark 1.0", sourced via archive.org/details/MusopenCollectionAsFlac)
// + 4 short original loops synthesized live in the browser (src/lib/generators.ts) -
// zero license question since nothing pre-existing is reproduced.
export const DEMO_TRACKS: DemoTrack[] = [
  {
    id: "bach",
    label: "J.S. Bach – Goldberg-Variationen, Nr. 4",
    genre: "Barock",
    kind: "file",
    url: "audio/bach-goldberg-variation4.ogg",
    credit: "Aufnahme: Musopen Kickstarter Project (gemeinfrei) · archive.org/details/MusopenCollectionAsFlac",
  },
  {
    id: "haydn",
    label: "Haydn – Streichquartett „Die Lerche“, Finale",
    genre: "Klassik",
    kind: "file",
    url: "audio/haydn-lark-finale.ogg",
    credit: "Aufnahme: Musopen Kickstarter Project (gemeinfrei) · archive.org/details/MusopenCollectionAsFlac",
  },
  {
    id: "borodin",
    label: "Borodin – Streichquartett Nr. 1, Scherzo",
    genre: "Romantik",
    kind: "file",
    url: "audio/borodin-scherzo.ogg",
    credit: "Aufnahme: Musopen Kickstarter Project (gemeinfrei) · archive.org/details/MusopenCollectionAsFlac",
  },
  { id: "ambient", label: "Ambient Drift", genre: "Ambient · eigener Loop", kind: "generated" },
  { id: "electro", label: "Electro Puls", genre: "Electronic · eigener Loop", kind: "generated" },
  { id: "arpeggio", label: "Klassik-Arpeggio", genre: "Neoklassik · eigener Loop", kind: "generated" },
  { id: "rock", label: "Perkussion-Rock", genre: "Rock · eigener Loop", kind: "generated" },
];
