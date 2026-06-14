export type ExploreTripLength = "half-day" | "full-day" | "multi-day";
export type ExploreDayPace = "relaxed" | "balanced" | "maximise";
export type ExploreYesNo = "yes" | "no";
export type ExploreVibe = "popular" | "lesser-known" | "";
export type ExploreBudgetBand = "great-value" | "premium" | "indulgent" | "";
export type ExploreOccasion =
  | ""
  | "great_day_out"
  | "celebration"
  | "birthday"
  | "anniversary"
  | "honeymoon"
  | "corporate";

export type ExplorePreferences = {
  name: string;
  email: string;
  groupSize: number;
  needTransport: ExploreYesNo;
  pickupAddress?: string;
  pickupPlaceId?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  dayPace: ExploreDayPace;
  tripDays: number;
  includeLunch: ExploreYesNo;
  prefOrganic: boolean;
  prefSpecialExperience: boolean;
  prefCheeseBoard: boolean;
  vibe: ExploreVibe;
  wineStyles?: string[];
  experiences?: string[];
  budgetBand?: ExploreBudgetBand;
  occasion?: ExploreOccasion;
  dietaryNeeds?: string[];
  accessibilityNeeds?: string[];
  accessibilityOther?: string;
  specialRequests?: string;
  matchedWineryIds?: string[];
  previewDate?: string;
};

const EXPLORE_PREFERENCES_KEY = "tm_explore_preferences_v1";

// Map a legacy `tripLength` value (from prefs saved before the pace/days split)
// onto the new dayPace + tripDays model so returning visitors don't break.
function migrateTripLength(length: ExploreTripLength | undefined): {
  dayPace: ExploreDayPace;
  tripDays: number;
} {
  if (length === "half-day") {
    return { dayPace: "relaxed", tripDays: 1 };
  }
  if (length === "multi-day") {
    return { dayPace: "balanced", tripDays: 2 };
  }
  // "full-day" and any unknown legacy value.
  return { dayPace: "balanced", tripDays: 1 };
}

export function loadExplorePreferences(): ExplorePreferences | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(EXPLORE_PREFERENCES_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<ExplorePreferences> & {
      tripLength?: ExploreTripLength;
    };

    const migrated = migrateTripLength(parsed.tripLength);
    const dayPace: ExploreDayPace =
      parsed.dayPace === "relaxed" || parsed.dayPace === "balanced" || parsed.dayPace === "maximise"
        ? parsed.dayPace
        : migrated.dayPace;
    const tripDays =
      typeof parsed.tripDays === "number" && parsed.tripDays >= 1 && parsed.tripDays <= 3
        ? Math.round(parsed.tripDays)
        : migrated.tripDays;

    return { ...(parsed as ExplorePreferences), dayPace, tripDays };
  } catch {
    return null;
  }
}

export function saveExplorePreferences(preferences: ExplorePreferences) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(EXPLORE_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Ignore storage write failures.
  }
}

export function hasExplorePreferences() {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(EXPLORE_PREFERENCES_KEY) !== null;
}

export function clearExplorePreferences() {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.removeItem(EXPLORE_PREFERENCES_KEY);
  } catch {
    // Ignore storage write failures.
  }
}

// The booking density is now driven by the backend `pace` field, so the time
// window is a fixed full day regardless of pace/length.
export function getSuggestedTimeWindow() {
  return { start: "09:00", end: "17:00" };
}
