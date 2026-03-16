import wineryProspects from "@/lib/data/winery-prospects.json";

type ProspectRow = {
  slug: string;
  name: string;
  sub_region: string;
  full_address: string;
  contact_number: string;
  established: number;
  known_for: string;
  organic: string;
  cellar_door: string;
  special_experiences: string;
  likelihood_to_partner: string;
  winery_challenges: string;
  selling_point: string;
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

function scoreFromSlug(slug: string) {
  let score = 0;
  for (const char of slug) {
    score += char.charCodeAt(0);
  }
  return score;
}

function ratingForSlug(slug: string) {
  const score = scoreFromSlug(slug);
  const fractional = (score % 6) / 10;
  return Number((4.4 + fractional).toFixed(1));
}

function selectedCountForSlug(slug: string) {
  const score = scoreFromSlug(slug);
  return 120 + (score % 980);
}

const knownCoordinates: Record<string, { latitude: number; longitude: number }> = {
  "vasse-felix": { latitude: -33.682, longitude: 115.052 },
  "cullen-wines": { latitude: -33.712, longitude: 115.041 },
  "fraser-gallop": { latitude: -33.723, longitude: 115.114 },
  woodlands: { latitude: -33.698, longitude: 115.035 },
};

const regionAnchors: Record<string, { latitude: number; longitude: number }> = {
  Wilyabrup: { latitude: -33.72, longitude: 115.07 },
  Wallcliffe: { latitude: -33.93, longitude: 115.06 },
  Yallingup: { latitude: -33.66, longitude: 115.04 },
  Cowaramup: { latitude: -33.85, longitude: 115.10 },
  Metricup: { latitude: -33.80, longitude: 115.14 },
  "Rosa Brook": { latitude: -34.02, longitude: 115.08 },
  "Rosa Glen": { latitude: -34.07, longitude: 115.10 },
  Karridale: { latitude: -34.21, longitude: 115.04 },
  Bramley: { latitude: -33.99, longitude: 115.10 },
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function fallbackCoordinatesForSlug(slug: string, region: string) {
  const anchor = regionAnchors[region] ?? { latitude: -33.95, longitude: 115.10 };
  const score = scoreFromSlug(slug);
  const latOffset = ((score % 21) - 10) / 1000;
  const lonOffset = (((score * 7) % 21) - 10) / 1000;
  return {
    latitude: clamp(anchor.latitude + latOffset, -34.30, -33.55),
    longitude: clamp(anchor.longitude + lonOffset, 115.00, 115.38),
  };
}

export const wineryCatalog: WineryCatalogItem[] = (wineryProspects as ProspectRow[]).map((row) => ({
  ...(knownCoordinates[row.slug] ?? fallbackCoordinatesForSlug(row.slug, row.sub_region)),
  id: row.slug,
  name: row.name,
  region: row.sub_region,
  address: row.full_address,
  phone: row.contact_number,
  established: row.established,
  knownFor: row.known_for,
  organicStatus: row.organic,
  cellarDoor: row.cellar_door.toLowerCase() === "yes",
  experiences: row.special_experiences,
  partnerLikelihood: row.likelihood_to_partner,
  rating: ratingForSlug(row.slug),
  selectedByCount: selectedCountForSlug(row.slug),
  summary: `${row.known_for}. Experience: ${row.special_experiences}.`,
  mapQuery: `${row.name}, ${row.full_address}, Margaret River, Western Australia`,
  liveBookable: true,
}));

export const wineryRegions = Array.from(new Set(wineryCatalog.map((winery) => winery.region))).sort((a, b) =>
  a.localeCompare(b),
);
