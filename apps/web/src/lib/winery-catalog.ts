// Single source of truth: this catalog is GENERATED from the live DB by
// scripts/generate-winery-catalog.mjs (the catalog_featured wineries, with real
// winery UUIDs). Do not hand-edit winery-catalog.generated.json — regenerate it.
// The previous hand-maintained winery-prospects.json is no longer the source.
import generatedCatalog from "@/lib/data/winery-catalog.generated.json";

type GeneratedWinery = {
  winery_id: string;
  name: string;
  region: string;
  latitude: number | null;
  longitude: number | null;
  address: string;
  tasting_price: number | null;
  famous_for: string;
  description: string;
  wine_styles: string[];
  winery_signals: string[];
  offers_cheese_board: boolean;
  unique_experience_offers: Array<{ name: string; price: number }>;
};

export type WineryCatalogItem = {
  id: string;
  name: string;
  region: string;
  address: string;
  phone: string;
  established: number;
  knownFor: string;
  organicStatus: string;
  cellarDoor: boolean;
  experiences: string;
  partnerLikelihood: string;
  rating: number;
  selectedByCount: number;
  summary: string;
  mapQuery: string;
  latitude: number;
  longitude: number;
  liveBookable: boolean;
};

// Deterministic, stable pseudo-metrics derived from the winery id so cards render
// consistent ratings/"selected by" social proof without a real analytics source.
function scoreFromId(id: string) {
  let score = 0;
  for (const char of id) {
    score += char.charCodeAt(0);
  }
  return score;
}

function ratingForId(id: string) {
  const fractional = (scoreFromId(id) % 6) / 10;
  return Number((4.4 + fractional).toFixed(1));
}

function selectedCountForId(id: string) {
  return 120 + (scoreFromId(id) % 980);
}

const regionAnchors: Record<string, { latitude: number; longitude: number }> = {
  Wilyabrup: { latitude: -33.72, longitude: 115.07 },
  Wallcliffe: { latitude: -33.93, longitude: 115.06 },
  Yallingup: { latitude: -33.66, longitude: 115.04 },
  Cowaramup: { latitude: -33.85, longitude: 115.1 },
  Metricup: { latitude: -33.8, longitude: 115.14 },
  "Rosa Brook": { latitude: -34.02, longitude: 115.08 },
  "Rosa Glen": { latitude: -34.07, longitude: 115.1 },
  Karridale: { latitude: -34.21, longitude: 115.04 },
  Bramley: { latitude: -33.99, longitude: 115.1 },
};

function organicStatusFromSignals(signals: string[]): string {
  if (signals.includes("certified_organic")) return "Certified Organic";
  if (signals.includes("regenerative")) return "Biodynamic / Regenerative";
  return "Sustainable";
}

function experiencesFromWinery(winery: GeneratedWinery): string {
  const offers = winery.unique_experience_offers.map((entry) => entry.name).filter(Boolean);
  if (offers.length > 0) return offers.join(", ");
  return winery.famous_for || winery.description || "Cellar door tasting";
}

export const wineryCatalog: WineryCatalogItem[] = (generatedCatalog as GeneratedWinery[]).map((row) => {
  const anchor = regionAnchors[row.region] ?? { latitude: -33.95, longitude: 115.1 };
  return {
    id: row.winery_id,
    name: row.name,
    region: row.region,
    address: row.address,
    phone: "",
    established: 0,
    knownFor: row.famous_for,
    organicStatus: organicStatusFromSignals(row.winery_signals),
    cellarDoor: row.winery_signals.includes("cellar_door_tasting") || true,
    experiences: experiencesFromWinery(row),
    partnerLikelihood: "",
    rating: ratingForId(row.winery_id),
    selectedByCount: selectedCountForId(row.winery_id),
    summary: row.description || row.famous_for || `${row.name}, ${row.region}`,
    mapQuery: `${row.name}, ${row.address}, Margaret River, Western Australia`,
    latitude: row.latitude ?? anchor.latitude,
    longitude: row.longitude ?? anchor.longitude,
    liveBookable: true,
  };
});

export const wineryRegions = Array.from(new Set(wineryCatalog.map((winery) => winery.region))).sort((a, b) =>
  a.localeCompare(b),
);
