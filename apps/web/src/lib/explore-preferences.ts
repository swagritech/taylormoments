export type ExploreTripLength = "half-day" | "full-day" | "multi-day";
export type ExploreYesNo = "yes" | "no";
export type ExploreVibe = "popular" | "lesser-known" | "";

export type ExplorePreferences = {
  name: string;
  email: string;
  groupSize: number;
  needTransport: ExploreYesNo;
  tripLength: ExploreTripLength;
  includeLunch: ExploreYesNo;
  prefOrganic: boolean;
  prefSpecialExperience: boolean;
  prefCheeseBoard: boolean;
  vibe: ExploreVibe;
  matchedWineryIds?: string[];
  previewDate?: string;
};

const EXPLORE_PREFERENCES_KEY = "tm_explore_preferences_v1";

export function loadExplorePreferences(): ExplorePreferences | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(EXPLORE_PREFERENCES_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as ExplorePreferences;
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

export function getSuggestedWindowFromTripLength(length: ExploreTripLength) {
  if (length === "half-day") {
    return { start: "09:00", end: "13:30" };
  }
  return { start: "09:00", end: "17:00" };
}

