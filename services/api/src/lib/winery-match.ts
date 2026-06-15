import type { Winery, WineryAvailability, WineryMatchPreferences } from "../domain/models.js";

// Soft matching: each quiz answer adds weight to a winery when the DB has evidence
// for it; missing data simply means no boost (never an exclusion). Hard constraints
// fire only on an explicit contraindication, so sparse data can't empty the pool —
// they sharpen automatically as the winery data fills in.

type Point = { lat: number; lon: number };

const W_STYLE = 12;
const W_EXPERIENCE = 9;
const W_OCCASION = 7;
const W_DIETARY = 6;
const W_ACCESS = 7;
const W_LUNCH = 6;

function hasStyle(winery: Winery, style: string): boolean {
  return winery.wineStyles.includes(style as Winery["wineStyles"][number]);
}
function hasSignal(winery: Winery, signal: string): boolean {
  return winery.winerySignals.includes(signal as Winery["winerySignals"][number]);
}
function anySignal(winery: Winery, signals: string[]): boolean {
  return signals.some((signal) => hasSignal(winery, signal));
}

function offersFood(winery: Winery): boolean {
  return (
    winery.offersCheeseBoard ||
    anySignal(winery, [
      "winery_lunch",
      "cheese_board",
      "charcuterie_board",
      "picnic_on_estate",
      "garden_picnic",
      "wine_chocolate",
    ])
  );
}

function wineStyleScore(winery: Winery, id: string): number {
  switch (id) {
    case "organic_biodynamic":
      return hasStyle(winery, "Organic & Biodynamic") ||
        hasStyle(winery, "Natural & Minimal Intervention") ||
        anySignal(winery, ["certified_organic", "regenerative"])
        ? W_STYLE
        : 0;
    case "well_known_names":
      return hasStyle(winery, "Well known Margaret River Name") ? W_STYLE : 0;
    case "hidden_gems":
      return hasStyle(winery, "Lesser known (off the beaten track)") ||
        hasSignal(winery, "small_production")
        ? W_STYLE
        : 0;
    case "family_estates":
      return hasStyle(winery, "Family-owned Estate") || hasSignal(winery, "multi_generation")
        ? W_STYLE
        : 0;
    case "award_winning":
      return hasStyle(winery, "Internationally awarded") ||
        anySignal(winery, ["halliday_5star", "gold_medals", "trophy_winner", "press_featured"])
        ? W_STYLE
        : 0;
    case "surprise_me":
    default:
      return 0; // Intentional no-op — "curate anything".
  }
}

function experienceScore(winery: Winery, id: string): number {
  switch (id) {
    case "winery_lunch":
      return hasSignal(winery, "winery_lunch") ? W_EXPERIENCE : 0;
    case "cheese_wine":
      return winery.offersCheeseBoard || anySignal(winery, ["cheese_board", "charcuterie_board"])
        ? W_EXPERIENCE
        : 0;
    case "wine_chocolate":
      return hasSignal(winery, "wine_chocolate") ? W_EXPERIENCE : 0;
    case "cellar_tour":
      return anySignal(winery, ["cellar_tour", "barrel_tasting"]) ? W_EXPERIENCE : 0;
    case "blending_experience":
      return hasSignal(winery, "blending_experience") ? W_EXPERIENCE : 0;
    case "private_tasting_room":
      return hasSignal(winery, "private_tasting_room") ? W_EXPERIENCE : 0;
    case "sunset_tasting":
      return hasSignal(winery, "sunset_tasting") ? W_EXPERIENCE : 0;
    case "vineyard_walk":
      return anySignal(winery, ["vineyard_walk", "garden_picnic"]) ? W_EXPERIENCE : 0;
    default:
      return 0;
  }
}

function occasionScore(winery: Winery, occasion: string): number {
  switch (occasion) {
    case "honeymoon":
    case "anniversary":
      return anySignal(winery, ["secluded", "intimate_welcome", "view_stunning", "garden_picnic"])
        ? W_OCCASION
        : 0;
    case "celebration":
    case "birthday":
      return anySignal(winery, ["view_stunning", "sunset_tasting", "garden_picnic"]) ? W_OCCASION : 0;
    case "corporate":
      return anySignal(winery, ["corporate_events", "wedding_venue", "private_tasting_room"])
        ? W_OCCASION
        : 0;
    case "great_day_out":
    default:
      return 0;
  }
}

function dietaryScore(winery: Winery, need: string): number {
  switch (need) {
    case "vegetarian":
      return hasSignal(winery, "vegetarian") ? W_DIETARY : 0;
    case "vegan":
      return hasSignal(winery, "vegan") ? W_DIETARY : 0;
    case "gluten_free":
      return anySignal(winery, ["gluten_free", "gluten_free_strict"]) ? W_DIETARY : 0;
    case "halal":
      return hasSignal(winery, "halal") ? W_DIETARY : 0;
    case "nut_allergy":
      return hasSignal(winery, "nut_free") ? W_DIETARY : 0;
    case "none":
    default:
      return 0;
  }
}

function accessibilityScore(winery: Winery, need: string): number {
  switch (need) {
    case "wheelchair_access":
      return anySignal(winery, [
        "wheelchair_access",
        "wheelchair_pathways",
        "wheelchair_tasting",
        "step_free_entry",
        "accessible_bathroom",
        "accessible_parking",
      ])
        ? W_ACCESS
        : 0;
    case "hearing_assistance":
      return anySignal(winery, ["hearing_loop", "quiet_space"]) ? W_ACCESS : 0;
    default:
      return 0;
  }
}

export function scoreWineryMatch(winery: Winery, prefs: WineryMatchPreferences): number {
  let score = 0;
  for (const style of prefs.wine_styles ?? []) {
    score += wineStyleScore(winery, style);
  }
  for (const experience of prefs.experiences ?? []) {
    score += experienceScore(winery, experience);
  }
  if (prefs.occasion) {
    score += occasionScore(winery, prefs.occasion);
  }
  for (const need of prefs.dietary ?? []) {
    score += dietaryScore(winery, need);
  }
  for (const need of prefs.accessibility ?? []) {
    score += accessibilityScore(winery, need);
  }
  if (prefs.include_lunch && offersFood(winery)) {
    score += W_LUNCH;
  }
  return score;
}

// Genuine contraindications only — currently just an explicit no-food policy when the
// guest has a dietary need. Wheelchair "hard fail" needs a negative signal the data
// doesn't yet carry, so it acts as a strong soft boost until that data is collected.
export function failsHardConstraint(winery: Winery, prefs: WineryMatchPreferences): boolean {
  const hasDietaryNeed = (prefs.dietary ?? []).some((need) => need !== "none");
  if (hasDietaryNeed && prefs.include_lunch && hasSignal(winery, "no_food")) {
    return true;
  }
  return false;
}

function haversineKm(from: Point, to: Point): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(to.lat - from.lat);
  const dLon = toRad(to.lon - from.lon);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLon / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Proximity nudge (0–18): wineries near the pickup rank a little higher so the day
// doesn't open with a long haul. Kept small so preference match leads.
function proximityScore(winery: Winery, pickup?: Point): number {
  if (!pickup || winery.latitude === undefined || winery.longitude === undefined) {
    return 0;
  }
  const distanceKm = haversineKm(pickup, { lat: winery.latitude, lon: winery.longitude });
  return Math.max(0, 18 - distanceKm * 0.4);
}

// Pick the candidate pool: active wineries with availability on the date, not excluded,
// ranked by (preference match + proximity). Returns winery ids, best first.
export function selectPreferredPool(params: {
  wineries: Winery[];
  availability: WineryAvailability[];
  bookingDate: string;
  partySize: number;
  preferences: WineryMatchPreferences;
  pickup?: Point;
  excludeIds: Set<string>;
  region?: string;
  maxCount: number;
}): string[] {
  const { wineries, availability, bookingDate, partySize, preferences, pickup, excludeIds, region, maxCount } =
    params;

  const availableIds = new Set(
    availability
      .filter(
        (slot) =>
          slot.serviceDate === bookingDate &&
          slot.status === "open" &&
          slot.remainingCapacity >= partySize,
      )
      .map((slot) => slot.wineryId),
  );

  return wineries
    .filter(
      (winery) =>
        winery.active &&
        // Only match within the featured set — the wineries we actually present and
        // have enriched. As more wineries are enriched + featured, they enter the pool.
        winery.catalogFeatured &&
        availableIds.has(winery.wineryId) &&
        !excludeIds.has(winery.wineryId) &&
        (region ? winery.region === region : true) &&
        !failsHardConstraint(winery, preferences),
    )
    .map((winery) => ({
      id: winery.wineryId,
      total: scoreWineryMatch(winery, preferences) + proximityScore(winery, pickup),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, maxCount)
    .map((entry) => entry.id);
}
