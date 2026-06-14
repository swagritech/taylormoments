import type { ExplorePreferences } from "@/lib/explore-preferences";
import type { RecommendationStop } from "@/lib/live-api";

export type ExploreTourSummaryStop = RecommendationStop & {
  tasting_price?: number;
};

// One touring day within a multi-day plan. The top-level `stops` /
// `matched_winery_ids` remain the *combined* set across all days so the
// existing single-day booking / summary / plan code keeps working unchanged.
export type ExploreTourSummaryDay = {
  day_index: number; // 0-based
  date: string;
  stops: ExploreTourSummaryStop[];
  matched_winery_ids: string[];
  justification?: string;
  label?: string;
  score?: number;
};

export type ExploreTourSummary = {
  lead_name: string;
  lead_email: string;
  party_size: number;
  pickup_location: string;
  day_pace: ExplorePreferences["dayPace"];
  trip_days: number;
  preview_date: string;
  preferred_start_time: string;
  preferred_end_time: string;
  matched_winery_ids: string[];
  stops: ExploreTourSummaryStop[];
  // Present (length >= 1) for multi-day plans; absent/undefined for single-day.
  days?: ExploreTourSummaryDay[];
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
