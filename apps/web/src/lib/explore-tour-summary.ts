import type { ExplorePreferences } from "@/lib/explore-preferences";
import type { RecommendationStop } from "@/lib/live-api";

export type ExploreTourSummaryStop = RecommendationStop & {
  tasting_price?: number;
};

export type ExploreTourSummary = {
  lead_name: string;
  lead_email: string;
  party_size: number;
  pickup_location: string;
  trip_length: ExplorePreferences["tripLength"];
  preview_date: string;
  preferred_start_time: string;
  preferred_end_time: string;
  matched_winery_ids: string[];
  stops: ExploreTourSummaryStop[];
  // The AI expert-pick commentary for this itinerary, carried through so the
  // /explore/summary page can show the "Why we chose this for you" block (the
  // /plan page calls recommend live; the summary page renders from this saved object).
  justification?: string;
  label?: string;
  score?: number;
  generated_at: string;
};

const EXPLORE_TOUR_SUMMARY_KEY = "tm_explore_tour_summary_v1";

export function loadExploreTourSummary(): ExploreTourSummary | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(EXPLORE_TOUR_SUMMARY_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as ExploreTourSummary;
  } catch {
    return null;
  }
}

export function saveExploreTourSummary(summary: ExploreTourSummary) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(EXPLORE_TOUR_SUMMARY_KEY, JSON.stringify(summary));
  } catch {
    // Ignore storage write failures.
  }
}

export function clearExploreTourSummary() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(EXPLORE_TOUR_SUMMARY_KEY);
  } catch {
    // Ignore storage write failures.
  }
}
