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
  liveBookable: boolean;
};

const liveBookableSlugs = new Set([
  "vasse-felix",
  "cullen-wines",
  "fraser-gallop",
  "woodlands",
]);

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

export const wineryCatalog: WineryCatalogItem[] = (wineryProspects as ProspectRow[]).map((row) => ({
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
  liveBookable: liveBookableSlugs.has(row.slug),
}));

export const wineryRegions = Array.from(new Set(wineryCatalog.map((winery) => winery.region))).sort((a, b) =>
  a.localeCompare(b),
);

