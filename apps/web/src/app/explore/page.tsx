"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchWeatherForDates,
  formatDisplayTime,
  listWineries,
  recommendItineraries,
  type DayWeather,
  type Recommendation,
  type WineryListResponse,
} from "@/lib/live-api";
import { wineryCatalog, type WineryCatalogItem } from "@/lib/winery-catalog";
import { slugToWineryUuid } from "@/lib/winery-id";
import { experienceSummary } from "@/lib/remote-winery-profiles";
import {
  loadExplorePreferences,
  saveExplorePreferences,
  type ExplorePreferences,
  type ExploreDayPace,
  type ExploreVibe,
  type ExploreYesNo,
} from "@/lib/explore-preferences";
import { saveExploreTourSummary, type ExploreTourSummaryDay } from "@/lib/explore-tour-summary";
import { getLocale, setLocale, type AppLocale } from "@/lib/locale";
import {
  EXPLORE_I18N,
  fillTemplate,
  intlForLocale,
  scriptForLocale,
  type StepId,
} from "./explore-i18n";
import { Card, LangSelect, Pill, PlacesAutocomplete, RowCard, Wordmark, type PlaceSelection } from "./quiz-atoms";
import { WineGlassLoader } from "./wine-loader";
import "./explore-flow.css";

type DayPace = ExploreDayPace;
type YesNo = ExploreYesNo;
type Vibe = ExploreVibe;

type ItineraryChapter = {
  label: "Morning" | "Afternoon" | "Evening";
  stops: Recommendation["stops"];
};

type MultiDayResult = {
  dayIndex: number;
  date: string;
  recommendation: Recommendation;
  // The catalog wineries selected for this day (used for matched-id handoff).
  pool: WineryCatalogItem[];
};

const WINE_STYLE_OPTIONS = [
  { id: "organic_biodynamic", label: "Organic & biodynamic", description: "Made with nature in mind" },
  { id: "well_known_names", label: "Well-known names", description: "Iconic Margaret River labels" },
  { id: "hidden_gems", label: "Hidden gems", description: "Boutique producers you won't find in shops" },
  { id: "family_estates", label: "Family estates", description: "Intimate, story-rich cellar doors" },
  { id: "award_winning", label: "Award-winning", description: "Internationally recognised excellence" },
  { id: "surprise_me", label: "Surprise me", description: "We'll curate based on what's exceptional right now" },
] as const;

const EXPERIENCE_OPTIONS = [
  { id: "winery_lunch", label: "Winery lunch" },
  { id: "cheese_wine", label: "Cheese & wine" },
  { id: "wine_chocolate", label: "Wine & chocolate" },
  { id: "cellar_tour", label: "Cellar tour" },
  { id: "blending_experience", label: "Blending experience" },
  { id: "private_tasting_room", label: "Private tasting room" },
  { id: "sunset_tasting", label: "Sunset tasting" },
  { id: "vineyard_walk", label: "Vineyard walk" },
] as const;

const OCCASION_OPTIONS = [
  { id: "great_day_out", label: "Just a great day out" },
  { id: "celebration", label: "Celebration" },
  { id: "birthday", label: "Birthday" },
  { id: "anniversary", label: "Anniversary" },
  { id: "honeymoon", label: "Honeymoon" },
  { id: "corporate", label: "Corporate" },
] as const;

const BUDGET_OPTIONS = [
  { id: "great-value", label: "Great value", description: "Under $100 pp" },
  { id: "premium", label: "Premium", description: "$100-$200 pp" },
  { id: "indulgent", label: "Indulgent", description: "$200+ pp" },
] as const;

const DIETARY_OPTIONS = [
  { id: "vegetarian", label: "Vegetarian" },
  { id: "vegan", label: "Vegan" },
  { id: "gluten_free", label: "Gluten-free" },
  { id: "halal", label: "Halal" },
  { id: "nut_allergy", label: "Nut allergy" },
  { id: "none", label: "None" },
] as const;

const ACCESSIBILITY_OPTIONS = [
  { id: "wheelchair_access", label: "Wheelchair access" },
  { id: "hearing_assistance", label: "Hearing assistance" },
] as const;

type WineStyleId = (typeof WINE_STYLE_OPTIONS)[number]["id"];
type ExperienceId = (typeof EXPERIENCE_OPTIONS)[number]["id"];
type OccasionId = (typeof OCCASION_OPTIONS)[number]["id"];
type BudgetId = (typeof BUDGET_OPTIONS)[number]["id"];
type DietaryId = (typeof DIETARY_OPTIONS)[number]["id"];
type AccessibilityId = (typeof ACCESSIBILITY_OPTIONS)[number]["id"];

// The backend `pace` field now controls itinerary density, so the time window
// is a fixed full day for every pace.
function toTimeWindow() {
  return { start: "09:00", end: "17:00" };
}

function toIsoDate(dayOffset = 7) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

function shiftIsoDate(dateValue: string, dayOffset = 0) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return toIsoDate(dayOffset);
  }
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

function chapterLabelForStop(timeValue: string): ItineraryChapter["label"] {
  const hour = new Date(timeValue).getHours();
  if (hour < 12) {
    return "Morning";
  }
  if (hour < 17) {
    return "Afternoon";
  }
  return "Evening";
}

function buildItineraryChapters(stops: Recommendation["stops"]): ItineraryChapter[] {
  const chapterOrder: ItineraryChapter["label"][] = ["Morning", "Afternoon", "Evening"];
  const grouped = new Map<ItineraryChapter["label"], Recommendation["stops"]>();

  for (const stop of stops) {
    const label = chapterLabelForStop(stop.arrival_time);
    const existing = grouped.get(label) ?? [];
    existing.push(stop);
    grouped.set(label, existing);
  }

  return chapterOrder
    .map((label) => ({ label, stops: grouped.get(label) ?? [] }))
    .filter((chapter) => chapter.stops.length > 0);
}

function toggleMultiSelect<T extends string>(values: T[], value: T) {
  if (values.includes(value)) {
    return values.filter((entry) => entry !== value);
  }
  return [...values, value];
}

export default function ExplorePage() {
  const router = useRouter();
  const initialPreferences = useMemo(() => loadExplorePreferences(), []);
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const [name, setName] = useState(initialPreferences?.name ?? "");
  const [email] = useState(initialPreferences?.email ?? "");
  const [groupSize, setGroupSize] = useState(initialPreferences?.groupSize ?? 4);
  const [needTransport, setNeedTransport] = useState<YesNo>(initialPreferences?.needTransport ?? "yes");
  const [pickupAddress, setPickupAddress] = useState(initialPreferences?.pickupAddress ?? "");
  const [pickupPlaceId, setPickupPlaceId] = useState(initialPreferences?.pickupPlaceId ?? "");
  const [pickupLatitude, setPickupLatitude] = useState<number | undefined>(initialPreferences?.pickupLatitude);
  const [pickupLongitude, setPickupLongitude] = useState<number | undefined>(initialPreferences?.pickupLongitude);
  const [dayPace, setDayPace] = useState<DayPace>(initialPreferences?.dayPace ?? "balanced");
  const [tripDays, setTripDays] = useState<number>(initialPreferences?.tripDays ?? 1);
  const [selectedWineStyles, setSelectedWineStyles] = useState<WineStyleId[]>(() => {
    if (initialPreferences?.wineStyles?.length) {
      return initialPreferences.wineStyles.filter((value): value is WineStyleId =>
        WINE_STYLE_OPTIONS.some((option) => option.id === value),
      );
    }
    const fallback: WineStyleId[] = [];
    if (initialPreferences?.prefOrganic) {
      fallback.push("organic_biodynamic");
    }
    if (initialPreferences?.vibe === "popular") {
      fallback.push("well_known_names");
    }
    if (initialPreferences?.vibe === "lesser-known") {
      fallback.push("hidden_gems");
    }
    if (initialPreferences?.prefSpecialExperience) {
      fallback.push("family_estates");
    }
    return fallback;
  });
  const [selectedExperiences, setSelectedExperiences] = useState<ExperienceId[]>(() => {
    if (initialPreferences?.experiences?.length) {
      return initialPreferences.experiences.filter((value): value is ExperienceId =>
        EXPERIENCE_OPTIONS.some((option) => option.id === value),
      );
    }
    const fallback: ExperienceId[] = [];
    if (initialPreferences?.prefCheeseBoard) {
      fallback.push("cheese_wine");
    }
    if (initialPreferences?.includeLunch === "yes") {
      fallback.push("winery_lunch");
    }
    if (initialPreferences?.prefSpecialExperience) {
      fallback.push("cellar_tour");
    }
    return fallback;
  });
  const [occasion, setOccasion] = useState<OccasionId | "">(
    (initialPreferences?.occasion as OccasionId | "") ?? "",
  );
  const [budgetBand, setBudgetBand] = useState<BudgetId | "">(
    (initialPreferences?.budgetBand as BudgetId | "") ?? "",
  );
  const [selectedDietaryNeeds, setSelectedDietaryNeeds] = useState<DietaryId[]>(
    (initialPreferences?.dietaryNeeds ?? []).filter((value): value is DietaryId =>
      DIETARY_OPTIONS.some((option) => option.id === value),
    ),
  );
  const [selectedAccessibilityNeeds, setSelectedAccessibilityNeeds] = useState<AccessibilityId[]>(
    (initialPreferences?.accessibilityNeeds ?? []).filter((value): value is AccessibilityId =>
      ACCESSIBILITY_OPTIONS.some((option) => option.id === value),
    ),
  );
  const [accessibilityOther, setAccessibilityOther] = useState(initialPreferences?.accessibilityOther ?? "");
  const [requesting, setRequesting] = useState(false);
  const [matchedWineries, setMatchedWineries] = useState<WineryCatalogItem[]>(
    () =>
      (initialPreferences?.matchedWineryIds ?? [])
        .map((entry) => wineryCatalog.find((item) => item.id === entry))
        .filter((entry): entry is WineryCatalogItem => Boolean(entry)),
  );
  const [previewDate, setPreviewDate] = useState<string>(initialPreferences?.previewDate ?? toIsoDate(7));
  const [recommendationOptions, setRecommendationOptions] = useState<Recommendation[]>([]);
  const [selectedRecommendationIndex, setSelectedRecommendationIndex] = useState(0);
  // Per-day itineraries when tripDays > 1 (each entry is one full touring day).
  const [multiDayPlan, setMultiDayPlan] = useState<MultiDayResult[]>([]);
  // Weather + clothing guidance keyed by touring date (best-effort; may be empty).
  const [weatherByDate, setWeatherByDate] = useState<Record<string, DayWeather>>({});
  const [error, setError] = useState<string | null>(null);
  const [selectedPreviewWinery, setSelectedPreviewWinery] = useState<WineryCatalogItem | null>(null);
  const [profilesById, setProfilesById] = useState<Record<string, WineryListResponse["wineries"][number]>>({});
  // Localized 4-chapter wizard state. Locale is shared with the homepage via the
  // tm_locale store; it seeds the AI commentary + weather language and the per-script
  // typography (data-script on the .tm-flow root).
  const [locale, setLocaleState] = useState<AppLocale>("en");
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardAttempted, setWizardAttempted] = useState(false);
  const [showResult, setShowResult] = useState(false);
  // Holds the loader on screen for a minimum beat so it doesn't flash when planning
  // is near-instant; the loader stays until data is ready AND this elapses.
  const [minLoaderElapsed, setMinLoaderElapsed] = useState(true);
  useEffect(() => {
    setLocaleState(getLocale());
  }, []);
  const includeLunch: YesNo = selectedExperiences.some((entry) =>
    ["winery_lunch", "cheese_wine", "wine_chocolate"].includes(entry),
  )
    ? "yes"
    : "no";
  const prefOrganic = selectedWineStyles.includes("organic_biodynamic");
  const prefSpecialExperience =
    selectedWineStyles.some((entry) => ["family_estates", "award_winning"].includes(entry)) ||
    selectedExperiences.some((entry) =>
      ["cellar_tour", "blending_experience", "private_tasting_room", "sunset_tasting", "vineyard_walk"].includes(entry),
    );
  const prefCheeseBoard = selectedExperiences.includes("cheese_wine");
  const vibe: Vibe = selectedWineStyles.includes("well_known_names")
    ? "popular"
    : selectedWineStyles.includes("hidden_gems")
      ? "lesser-known"
      : "";

  const timeWindow = useMemo(() => toTimeWindow(), []);
  const recommendation = recommendationOptions[selectedRecommendationIndex] ?? null;

  useEffect(() => {
    const payload: ExplorePreferences = {
      name,
      email,
      groupSize,
      needTransport,
      pickupAddress,
      pickupPlaceId: pickupPlaceId || undefined,
      pickupLatitude,
      pickupLongitude,
      dayPace,
      tripDays,
      includeLunch,
      prefOrganic,
      prefSpecialExperience,
      prefCheeseBoard,
      vibe,
      wineStyles: selectedWineStyles,
      experiences: selectedExperiences,
      budgetBand,
      occasion,
      dietaryNeeds: selectedDietaryNeeds,
      accessibilityNeeds: selectedAccessibilityNeeds,
      accessibilityOther,
      matchedWineryIds: matchedWineries.map((entry) => entry.id),
      previewDate: previewDate || undefined,
    };
    saveExplorePreferences(payload);
  }, [
    name,
    email,
    groupSize,
    needTransport,
    pickupAddress,
    pickupPlaceId,
    pickupLatitude,
    pickupLongitude,
    dayPace,
    tripDays,
    selectedWineStyles,
    selectedExperiences,
    budgetBand,
    occasion,
    selectedDietaryNeeds,
    selectedAccessibilityNeeds,
    accessibilityOther,
    matchedWineries,
    previewDate,
  ]);

  useEffect(() => {
    let active = true;
    async function loadProfiles() {
      try {
        const response = await listWineries();
        if (!active) {
          return;
        }
        const next: Record<string, WineryListResponse["wineries"][number]> = {};
        for (const winery of response.wineries) {
          next[winery.winery_id] = winery;
        }
        setProfilesById(next);
      } catch {
        if (active) {
          setProfilesById({});
        }
      }
    }

    void loadProfiles();
    return () => {
      active = false;
    };
  }, []);


  // Best-effort weather lookup; merges results into state keyed by date so the
  // itinerary card and summary can show conditions + what to wear. Never throws.
  async function loadWeatherForDates(dates: string[]) {
    const days = await fetchWeatherForDates(dates);
    if (!days || days.length === 0) {
      return;
    }
    setWeatherByDate((current) => {
      const next = { ...current };
      for (const day of days) {
        next[day.date] = day;
      }
      return next;
    });
  }

  async function handlePlanTrip() {
    if (selectedWineStyles.length === 0) {
      setError(null);
      return;
    }
    setError(null);
    setRequesting(true);
    setRecommendationOptions([]);
    setSelectedRecommendationIndex(0);
    setMultiDayPlan([]);
    setWeatherByDate({});

    try {
      let requestPickupLatitude = pickupLatitude;
      let requestPickupLongitude = pickupLongitude;
      // Resolve coordinates from the chosen place (pickup OR self-drive starting
      // address) when the autocomplete didn't already provide them.
      if (
        pickupPlaceId &&
        (requestPickupLatitude === undefined || requestPickupLongitude === undefined) &&
        googleApiKey
      ) {
        try {
          const detailsResponse = await fetch(
            `https://places.googleapis.com/v1/places/${encodeURIComponent(pickupPlaceId)}`,
            {
              method: "GET",
              headers: {
                "X-Goog-Api-Key": googleApiKey,
                "X-Goog-FieldMask": "location",
              },
            },
          );
          if (detailsResponse.ok) {
            const details = (await detailsResponse.json()) as {
              location?: { latitude?: number; longitude?: number };
            };
            if (
              typeof details.location?.latitude === "number" &&
              Number.isFinite(details.location.latitude) &&
              typeof details.location?.longitude === "number" &&
              Number.isFinite(details.location.longitude)
            ) {
              requestPickupLatitude = details.location.latitude;
              requestPickupLongitude = details.location.longitude;
            }
          }
        } catch {
          // keep fallback behavior
        }
      }

      const pickupLocationLabel =
        needTransport === "yes"
          ? pickupAddress.trim() || "Margaret River Visitor Centre"
          : pickupAddress.trim() || "Self-drive (no transport required)";

      // The quiz answers are sent raw; the backend scores every available winery and
      // selects the pool itself (soft matching, single source of truth). No frontend
      // hard-filtering of the catalog any more.
      const preferences = {
        wine_styles: selectedWineStyles,
        experiences: selectedExperiences,
        occasion: occasion || undefined,
        budget: budgetBand || undefined,
        dietary: selectedDietaryNeeds,
        accessibility: selectedAccessibilityNeeds,
        include_lunch: includeLunch === "yes",
      };
      const uuidToCatalog = new Map(
        wineryCatalog.map((winery) => [slugToWineryUuid(winery.id), winery] as const),
      );

      // Recommend a single day, retrying forward date offsets if a day comes back
      // empty. `excludedUuids` are wineries used on earlier days (multi-day). Returns
      // the backend's itinerary options, the date used, the catalog items for the
      // chosen wineries, and their UUIDs.
      const planSingleDay = async (baseDate: string, excludedUuids: Set<string>) => {
        for (let offset = 0; offset < 14; offset += 1) {
          const candidateDate = shiftIsoDate(baseDate, offset);
          const response = await recommendItineraries({
            booking_date: candidateDate,
            pickup_location: pickupLocationLabel,
            pickup_place_id: pickupPlaceId || undefined,
            pickup_latitude: requestPickupLatitude,
            pickup_longitude: requestPickupLongitude,
            party_size: groupSize,
            preferred_start_time: timeWindow.start,
            preferred_end_time: timeWindow.end,
            pace: dayPace,
            preferences,
            exclude_winery_ids: excludedUuids.size > 0 ? [...excludedUuids] : undefined,
            // Keep planning fast: skip the slow AI justification here. The real
            // concierge justification is fetched once for the chosen day below.
            skip_justification: true,
          });

          if (response.itineraries.length === 0) {
            continue;
          }

          const options = [...response.itineraries].sort(
            (a, b) => Number(b.expert_pick) - Number(a.expert_pick) || b.score - a.score,
          );
          const chosenUuids = options[0]?.stops.map((stop) => stop.winery_id) ?? [];
          const pool = chosenUuids
            .map((id) => uuidToCatalog.get(id))
            .filter((entry): entry is WineryCatalogItem => Boolean(entry));
          return { options, usedDate: candidateDate, pool, chosenUuids };
        }
        return null;
      };

      // Fetch the real (slow) AI justification once for the chosen day and patch it
      // into the concierge note — progressive enhancement so planning never blocks on
      // OpenAI. Pinning the exact chosen wineries keeps the justification on-itinerary.
      const refreshJustification = async (dateValue: string, wineryUuids: string[]) => {
        if (wineryUuids.length === 0) {
          return;
        }
        try {
          const response = await recommendItineraries({
            booking_date: dateValue,
            pickup_location: pickupLocationLabel,
            pickup_place_id: pickupPlaceId || undefined,
            pickup_latitude: requestPickupLatitude,
            pickup_longitude: requestPickupLongitude,
            party_size: groupSize,
            preferred_start_time: timeWindow.start,
            preferred_end_time: timeWindow.end,
            pace: dayPace,
            preferred_wineries: wineryUuids,
            // Send preferences too so the justification can reference the occasion/tastes
            // (the explicit winery list still pins the exact itinerary).
            preferences,
          });
          const justification = response.itineraries[0]?.justification;
          if (justification) {
            setRecommendationOptions((current) =>
              current.length > 0 ? [{ ...current[0]!, justification }, ...current.slice(1)] : current,
            );
          }
        } catch {
          // Keep the localized template concierge note on any failure.
        }
      };

      const requestedDate = previewDate || toIsoDate(7);
      const daysRequested = Math.max(1, Math.min(3, tripDays));

      if (daysRequested === 1) {
        // Single-day flow.
        const result = await planSingleDay(requestedDate, new Set<string>());
        if (!result) {
          setError("No preview schedule found in the next 14 days for this preference set.");
          return;
        }
        setMatchedWineries(result.pool);
        setPreviewDate(result.usedDate);
        // Blank the deterministic justification so the localized template concierge
        // note shows immediately; the AI one is patched in by refreshJustification.
        setRecommendationOptions(
          result.options.map((option, index) => (index === 0 ? { ...option, justification: "" } : option)),
        );
        setSelectedRecommendationIndex(0);
        setMultiDayPlan([]);
        void loadWeatherForDates([result.usedDate]);
        void refreshJustification(result.usedDate, result.chosenUuids);
        return;
      }

      // Multi-day flow: one real day per requested day, never repeating a winery.
      const usedWineryUuids = new Set<string>();
      const collectedDays: MultiDayResult[] = [];
      for (let dayIndex = 0; dayIndex < daysRequested; dayIndex += 1) {
        const dayBaseDate = shiftIsoDate(requestedDate, dayIndex);
        const result = await planSingleDay(dayBaseDate, usedWineryUuids);
        if (!result) {
          break;
        }
        const dayRecommendation = result.options[0];
        if (!dayRecommendation) {
          break;
        }
        // Exclude every winery this day actually scheduled so later days never repeat them.
        for (const uuid of result.chosenUuids) {
          usedWineryUuids.add(uuid);
        }
        collectedDays.push({
          dayIndex,
          date: result.usedDate,
          recommendation: dayRecommendation,
          pool: result.pool,
        });
      }

      if (collectedDays.length === 0) {
        setError("No preview schedule found in the next 14 days for this preference set.");
        return;
      }

      const firstDay = collectedDays[0];
      // Drive the existing single-day preview state from day one, and store the
      // combined winery pool so /plan and the booking call see every day's stops.
      const combinedPool = collectedDays.flatMap((day) => day.pool);
      const dedupedCombinedPool = Array.from(
        new Map(combinedPool.map((entry) => [entry.id, entry])).values(),
      );
      setMatchedWineries(dedupedCombinedPool);
      setPreviewDate(firstDay.date);
      setRecommendationOptions([{ ...firstDay.recommendation, justification: "" }]);
      setSelectedRecommendationIndex(0);
      setMultiDayPlan(collectedDays);
      void loadWeatherForDates(collectedDays.map((day) => day.date));
      void refreshJustification(
        firstDay.date,
        firstDay.recommendation.stops.map((stop) => stop.winery_id),
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to plan trip right now.");
    } finally {
      setRequesting(false);
    }
  }

  function handleOpenTourSummary() {
    if (!recommendation) {
      return;
    }
    const pickupLocation =
      needTransport === "yes"
        ? pickupAddress.trim() || "Margaret River Visitor Centre"
        : pickupAddress.trim() || "Self-drive (no transport required)";

    const uuidToSlug = new Map(
      wineryCatalog.map((winery) => [slugToWineryUuid(winery.id), winery.id] as const),
    );

    const slugsForStops = (stops: Recommendation["stops"]) =>
      stops
        .map((stop) => uuidToSlug.get(stop.winery_id))
        .filter((value): value is string => Boolean(value));

    const enrichStops = (stops: Recommendation["stops"]) =>
      stops.map((stop) => {
        const remoteProfile = profilesById[stop.winery_id] ?? resolveRemoteProfileByName(stop.winery_name);
        return {
          ...stop,
          tasting_price: remoteProfile?.tasting_price,
        };
      });

    const isMultiDay = multiDayPlan.length > 1;

    // For multi-day, the top-level stops / matched ids are the *combined* set
    // across every day so the existing booking + summary + plan code keeps
    // working with one winery list. The per-day breakdown lives in `days`.
    const daysPayload: ExploreTourSummaryDay[] | undefined = isMultiDay
      ? multiDayPlan.map((day) => {
          const daySlugs = slugsForStops(day.recommendation.stops);
          return {
            day_index: day.dayIndex,
            date: day.date,
            stops: enrichStops(day.recommendation.stops),
            lunch: day.recommendation.lunch ?? null,
            weather: weatherByDate[day.date] ?? null,
            matched_winery_ids:
              daySlugs.length > 0 ? daySlugs : day.pool.map((entry) => entry.id),
            justification: day.recommendation.justification,
            label: day.recommendation.label,
            score: day.recommendation.score,
          };
        })
      : undefined;

    const combinedStops = isMultiDay
      ? multiDayPlan.flatMap((day) => day.recommendation.stops)
      : recommendation.stops;
    const combinedSlugs = isMultiDay
      ? multiDayPlan.flatMap((day) => slugsForStops(day.recommendation.stops))
      : slugsForStops(recommendation.stops);

    saveExploreTourSummary({
      lead_name: name.trim(),
      lead_email: email.trim(),
      party_size: groupSize,
      pickup_location: pickupLocation,
      need_transport: needTransport,
      day_pace: dayPace,
      trip_days: isMultiDay ? multiDayPlan.length : 1,
      preview_date: previewDate,
      preferred_start_time: timeWindow.start,
      preferred_end_time: timeWindow.end,
      matched_winery_ids:
        combinedSlugs.length > 0
          ? combinedSlugs
          : matchedWineries.slice(0, combinedStops.length).map((entry) => entry.id),
      stops: enrichStops(combinedStops),
      lunch: isMultiDay ? null : recommendation.lunch ?? null,
      weather: isMultiDay ? null : weatherByDate[previewDate] ?? null,
      days: daysPayload,
      justification: recommendation.justification,
      label: recommendation.label,
      score: recommendation.score,
      generated_at: new Date().toISOString(),
    });

    router.push("/explore/summary");
  }

  function resolveWinery(stopName: string) {
    const normalized = stopName.trim().toLowerCase();
    return (
      matchedWineries.find((entry) => entry.name.trim().toLowerCase() === normalized) ??
      wineryCatalog.find((entry) => entry.name.trim().toLowerCase() === normalized) ??
      null
    );
  }

  function resolveWineryById(wineryId: string) {
    return wineryCatalog.find((entry) => slugToWineryUuid(entry.id) === wineryId) ?? null;
  }

  function resolveRemoteProfileByName(stopName: string) {
    const normalized = stopName.trim().toLowerCase();
    const match = Object.values(profilesById).find(
      (entry) => entry.name.trim().toLowerCase() === normalized,
    );
    return match;
  }

  // ── Localized wizard + concierge result ──────────────────────────────────
  const t = EXPLORE_I18N[locale];
  const script = scriptForLocale(locale);
  const intlTag = intlForLocale(locale);
  const stepIds: StepId[] = ["trip", "palate", "occasion", "care"];

  function formatFlowDate(iso: string) {
    const parsed = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return iso;
    }
    try {
      return parsed.toLocaleDateString(intlTag, { weekday: "long", day: "numeric", month: "long" });
    } catch {
      return parsed.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
    }
  }

  function chapterLabelLocalized(label: ItineraryChapter["label"]) {
    if (label === "Morning") return t.result.morning;
    if (label === "Afternoon") return t.result.afternoon;
    return t.result.evening;
  }

  // Per-step validation; errors only surface after a submit attempt and clear on edit.
  const stepErrors: Record<string, string> = {};
  if (wizardStep === 0) {
    if (!previewDate) stepErrors.date = t.errors.date;
    else if (previewDate < toIsoDate(0)) stepErrors.date = t.errors.datePast;
    if (groupSize < 1) stepErrors.group = t.errors.group;
    if (needTransport === "yes" && !pickupAddress.trim()) stepErrors.pickup = t.errors.pickup;
  }
  if (wizardStep === 1) {
    if (selectedWineStyles.length === 0) stepErrors.wine = t.errors.wine;
  }
  const showErr = wizardAttempted ? stepErrors : {};
  const canAdvance = Object.keys(stepErrors).length === 0;

  function changeLocale(code: AppLocale) {
    setLocaleState(code);
    setLocale(code);
    // On the result screen, re-run so the AI commentary + weather come back in the
    // newly chosen language (both read the persisted locale at call time).
    if (showResult) {
      void handlePlanTrip();
    }
  }

  function craftDay() {
    setWizardAttempted(false);
    setShowResult(true);
    setMinLoaderElapsed(false);
    window.setTimeout(() => setMinLoaderElapsed(true), 2200);
    window.scrollTo({ top: 0, behavior: "smooth" });
    void handlePlanTrip();
  }

  // Address handlers shared by the pickup (transport) and starting-address
  // (self-drive) fields. Typing clears any resolved place/coordinates; selecting a
  // suggestion captures the place id + coordinates for accurate routing.
  function handlePickupTextChange(value: string) {
    setPickupAddress(value);
    setPickupPlaceId("");
    setPickupLatitude(undefined);
    setPickupLongitude(undefined);
  }
  function handlePickupSelect(selection: PlaceSelection) {
    setPickupPlaceId(selection.placeId);
    if (selection.formattedAddress) {
      setPickupAddress(selection.formattedAddress);
    }
    setPickupLatitude(selection.latitude);
    setPickupLongitude(selection.longitude);
  }

  function nextStep() {
    if (!canAdvance) {
      setWizardAttempted(true);
      return;
    }
    setWizardAttempted(false);
    if (wizardStep >= stepIds.length - 1) {
      craftDay();
      return;
    }
    setWizardStep(wizardStep + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function prevStep() {
    setWizardAttempted(false);
    if (wizardStep > 0) {
      setWizardStep(wizardStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function goToStep(index: number) {
    if (index <= wizardStep) {
      setWizardAttempted(false);
      setWizardStep(index);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function adjustPreferences() {
    setShowResult(false);
    setWizardStep(3);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function tastingPriceForStop(stop: Recommendation["stops"][number]): number | undefined {
    const profile = profilesById[stop.winery_id] ?? resolveRemoteProfileByName(stop.winery_name);
    return profile?.tasting_price;
  }

  function renderWeatherPanel(weather: DayWeather) {
    return (
      <div className="weather">
        <div className="weather__head">
          <span className="weather__summary">{weather.summary}</span>
          <span className="weather__source">
            {weather.source === "forecast" ? t.result.weatherForecast : t.result.weatherTypical}
          </span>
        </div>
        <div className="weather__stats">
          <span>
            {weather.temp_min_c}° – {weather.temp_max_c}°C
          </span>
          <span>{fillTemplate(t.result.rainChance, { n: weather.rain_probability_percent })}</span>
        </div>
        <p className="weather__wearLabel">{t.result.weatherWear}</p>
        <ul className="weather__list">
          {weather.clothing.map((tip, index) => (
            <li key={index}>{tip}</li>
          ))}
        </ul>
      </div>
    );
  }

  // One touring day: Morning/Afternoon/Evening chapters with the placed lunch slotted
  // in chronological position (right after its host winery) and drive rows between
  // stops, followed by the weather + what-to-wear panel.
  function renderDayItinerary(rec: Recommendation, weather: DayWeather | undefined, dateValue: string, dayLabel?: string) {
    const chapters = buildItineraryChapters(rec.stops);
    const flat = rec.stops;
    const lunch = rec.lunch ?? null;
    // The first stop's drive_minutes is the leg from the pickup/start to the first
    // cellar door — surface it so guests see the journey out, not just between stops.
    const firstLegMinutes = flat[0]?.drive_minutes ?? 0;
    return (
      <Fragment key={dateValue}>
        {dayLabel ? (
          <div className="itinDay">
            <span className="itinDay__label">{dayLabel}</span>
          </div>
        ) : null}
        {firstLegMinutes > 0 ? (
          <div className="drive">
            {fillTemplate(needTransport === "yes" ? t.result.driveFromYes : t.result.driveFromNo, {
              n: firstLegMinutes,
            })}
          </div>
        ) : null}
        {chapters.map((chapter) => (
          <section className="chapter" key={`${dateValue}-${chapter.label}`}>
            <div className="chapter__head">
              <span className="chapter__label">{chapterLabelLocalized(chapter.label)}</span>
              <span className="chapter__rule" />
            </div>
            {chapter.stops.map((stop) => {
              const idx = flat.findIndex(
                (entry) => entry.winery_id === stop.winery_id && entry.arrival_time === stop.arrival_time,
              );
              const nextStop = idx >= 0 ? flat[idx + 1] : undefined;
              const price = tastingPriceForStop(stop);
              const isLunchHost = Boolean(lunch && lunch.winery_id === stop.winery_id);
              return (
                <Fragment key={`${stop.winery_id}-${stop.arrival_time}`}>
                  <div className="stop">
                    <div className="stop__time">{formatDisplayTime(stop.arrival_time)}</div>
                    <div className="stop__body">
                      <div className="stop__row">
                        <button
                          type="button"
                          className="stop__name"
                          style={{ border: 0, background: "transparent", padding: 0, cursor: "pointer", textAlign: "left" }}
                          onClick={() =>
                            setSelectedPreviewWinery(
                              resolveWineryById(stop.winery_id) ?? resolveWinery(stop.winery_name),
                            )
                          }
                        >
                          {stop.winery_name}
                        </button>
                      </div>
                      <p className="stop__note">{t.result.stopNote}</p>
                      <p className="stop__fee">
                        {price != null ? (
                          <>
                            {t.result.tasting} <b>${price}</b> {t.result.pp} · {t.result.depart}{" "}
                            {formatDisplayTime(stop.departure_time)}
                          </>
                        ) : (
                          <>
                            {t.result.depart} {formatDisplayTime(stop.departure_time)}
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  {isLunchHost && lunch ? (
                    <div className="stop stop--lunch">
                      <div className="stop__time">{formatDisplayTime(lunch.arrival_time)}</div>
                      <div className="stop__body">
                        <div className="stop__row">
                          <span className="stop__name">
                            {t.result.lunchLabel} · {lunch.winery_name}
                          </span>
                        </div>
                        <p className="stop__note">{lunch.food_description || t.result.lunchNote}</p>
                        <p className="stop__fee">
                          {t.result.depart} {formatDisplayTime(lunch.departure_time)}
                        </p>
                      </div>
                    </div>
                  ) : null}
                  {nextStop ? (
                    <div className="drive">
                      {fillTemplate(needTransport === "yes" ? t.result.driveYes : t.result.driveNo, {
                        n: nextStop.drive_minutes,
                      })}
                    </div>
                  ) : null}
                </Fragment>
              );
            })}
          </section>
        ))}
        {weather ? renderWeatherPanel(weather) : null}
      </Fragment>
    );
  }

  // Days to render: the multi-day plan, or the single chosen recommendation.
  const resultDays =
    multiDayPlan.length > 1
      ? multiDayPlan.map((day) => ({ rec: day.recommendation, date: day.date, index: day.dayIndex }))
      : recommendation
        ? [{ rec: recommendation, date: previewDate, index: 0 }]
        : [];
  const allStops = resultDays.flatMap((day) => day.rec.stops);
  const subtotal = allStops.reduce((sum, stop) => sum + (tastingPriceForStop(stop) ?? 0), 0) * groupSize;
  const isMultiDay = resultDays.length > 1;

  // Concierge note — greeting + AI justification (locale-aware, grounded) with a
  // localized template fallback, then chips echoing the guest's own choices.
  const greetName = name.trim() || t.rationale.guest;
  const titleName = name.trim() || t.guestFallback;
  const groupClause = groupSize === 1 ? t.rationale.groupOne : fillTemplate(t.rationale.groupMany, { n: groupSize });
  const paceNoun = t.rationale.paceNoun[dayPace];
  const templateBody = fillTemplate(needTransport === "yes" ? t.rationale.bodyTransport : t.rationale.bodySelf, {
    pace: paceNoun,
    group: groupClause,
    n: allStops.length,
  });
  // Prefer the real AI justification when present; otherwise the localized template.
  const conciergeBody = recommendation?.justification?.trim() || templateBody;
  const chosenChips = [
    ...selectedWineStyles.map((id) => t.wineStyles[id]?.label),
    occasion ? t.occasions[occasion] : null,
    budgetBand ? t.budgets[budgetBand]?.label : null,
    ...selectedExperiences.map((id) => t.experiences[id]?.label),
  ].filter((value): value is string => Boolean(value)).slice(0, 9);

  const progress = (wizardStep / stepIds.length) * 100;
  const isLastStep = wizardStep === stepIds.length - 1;
  const curStep = t.steps[stepIds[wizardStep]!];

  function renderResult() {
    return (
      <div className="result">
        <div className="result__bar">
          <Wordmark />
          <LangSelect locale={locale} onChange={changeLocale} label={t.ui.language} />
        </div>
        <div className="result__inner">
          <div className="result__hero reveal">
            <p className="tm-kicker">{t.result.kicker}</p>
            <h1 className="result__title tm-display">{fillTemplate(t.result.title, { name: titleName })}</h1>
            <p className="result__em">
              {formatFlowDate(previewDate)}
              {isMultiDay ? t.result.dayOnePreview : ""}
            </p>
          </div>

          {!minLoaderElapsed || (requesting && resultDays.length === 0) ? (
            <WineGlassLoader messages={t.result.loaderCaptions} />
          ) : resultDays.length === 0 ? (
            <div style={{ marginTop: 30, textAlign: "center" }}>
              <p className="result__note">{error ?? t.errors.noPlan}</p>
              <div className="result__actions">
                <button type="button" className="btn btn--ghost" onClick={adjustPreferences}>
                  {t.ui.adjust}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="result__meta">
                <span className="result__metaItem">
                  <b>{groupSize}</b>
                  <span>{t.result.metaGuests}</span>
                </span>
                <span className="result__metaItem">
                  <b>{allStops.length}</b>
                  <span>{t.result.metaCellar}</span>
                </span>
                <span className="result__metaItem">
                  <b>{t.pace[dayPace].label}</b>
                  <span>{t.result.metaPace}</span>
                </span>
                <span className="result__metaItem">
                  <b>{needTransport === "yes" ? t.result.private : t.result.selfDrive}</b>
                  <span>{t.result.metaTransport}</span>
                </span>
              </div>

              <div className="concierge reveal">
                <p className="tm-kicker concierge__kicker">{t.rationale.kicker}</p>
                <p className="concierge__greeting tm-display">{fillTemplate(t.rationale.greeting, { name: greetName })}</p>
                <p className="concierge__body">{conciergeBody}</p>
                {chosenChips.length ? (
                  <div className="concierge__chosen">
                    <span className="concierge__chosenLabel">{t.rationale.chipsLabel}</span>
                    <div className="concierge__chips">
                      {chosenChips.map((chip, index) => (
                        <span className="concierge__chip" key={`${chip}-${index}`}>
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                <p className="concierge__sign">{t.rationale.signoff}</p>
              </div>

              <div className="itin">
                {resultDays.map((day) =>
                  renderDayItinerary(
                    day.rec,
                    weatherByDate[day.date],
                    day.date,
                    isMultiDay ? fillTemplate(t.result.dayHeading, { n: day.index + 1 }) : undefined,
                  ),
                )}
                <div className="result__footer">
                  <div className="result__subtotal">
                    {t.result.subtotal} <b>${subtotal}</b> ·{" "}
                    {fillTemplate(groupSize === 1 ? t.result.forGuest : t.result.forGuests, { n: groupSize })}
                  </div>
                  <button type="button" className="btn btn--primary" onClick={handleOpenTourSummary}>
                    {t.ui.reviewBook}
                  </button>
                </div>
              </div>

              <p className="result__note">{t.result.note}</p>
              <div className="result__actions">
                <button type="button" className="btn btn--ghost" onClick={adjustPreferences}>
                  {t.ui.adjust}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  function renderTripStep() {
    return (
      <div>
        <div className="field">
          <label className="field__label" htmlFor="tm-name">{t.fields.name}</label>
          <input
            id="tm-name"
            className="input"
            value={name}
            placeholder={t.namePlaceholder}
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="tm-date">{t.fields.date}</label>
          <input
            id="tm-date"
            type="date"
            className="input"
            value={previewDate}
            min={toIsoDate(0)}
            onChange={(event) => setPreviewDate(event.target.value)}
          />
          {showErr.date ? <p className="errmsg">✕ {showErr.date}</p> : null}
        </div>

        <div className="field">
          <label className="field__label">{t.fields.group}</label>
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
            <div className="stepper">
              <button
                type="button"
                className="stepper__btn"
                disabled={groupSize <= 1}
                onClick={() => setGroupSize(Math.max(1, groupSize - 1))}
                aria-label="−"
              >
                –
              </button>
              <span className="stepper__val">{groupSize}</span>
              <button
                type="button"
                className="stepper__btn"
                disabled={groupSize >= 20}
                onClick={() => setGroupSize(Math.min(20, groupSize + 1))}
                aria-label="+"
              >
                +
              </button>
            </div>
            <span className="stepper__unit">{t.fields.groupUnit}</span>
          </div>
          {showErr.group ? <p className="errmsg">✕ {showErr.group}</p> : null}
        </div>

        <div className="field">
          <label className="field__label">{t.fields.pace}</label>
          <p className="field__hint">{t.fields.paceHint}</p>
          <div className="cards cards--list">
            {(["relaxed", "balanced", "maximise"] as const).map((id) => (
              <RowCard
                key={id}
                selected={dayPace === id}
                title={t.pace[id].label}
                note={t.pace[id].note}
                onClick={() => setDayPace(id)}
              />
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field__label">{t.fields.days}</label>
          <p className="field__hint">{t.fields.daysHint}</p>
          <div className="segmented" role="group" aria-label={t.fields.days}>
            {[1, 2, 3].map((count) => (
              <button
                key={count}
                type="button"
                className={`segmented__btn ${tripDays === count ? "is-active" : ""}`}
                onClick={() => setTripDays(count)}
              >
                {count} {t.ui.daysUnit}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field__label">{t.fields.transport}</label>
          <div className="segmented" role="group" aria-label={t.fields.transport}>
            <button
              type="button"
              className={`segmented__btn ${needTransport === "yes" ? "is-active" : ""}`}
              onClick={() => setNeedTransport("yes")}
            >
              {t.transport.yes}
            </button>
            <button
              type="button"
              className={`segmented__btn ${needTransport === "no" ? "is-active" : ""}`}
              onClick={() => setNeedTransport("no")}
            >
              {t.transport.no}
            </button>
          </div>
          <p className="field__hint">{needTransport === "yes" ? t.transport.hintYes : t.transport.hintNo}</p>
        </div>

        {/* Address with Google Places autocomplete. Shown for both modes: a pickup
            point when transport is needed, or a starting address for self-drivers so
            the planner can route accurately from where the day begins. */}
        {needTransport === "yes" ? (
          <div className="field reveal">
            <label className="field__label" htmlFor="tm-pickup">{t.fields.pickup}</label>
            <PlacesAutocomplete
              id="tm-pickup"
              value={pickupAddress}
              locale={locale}
              placeholder={t.fields.pickupPlaceholder}
              onChange={handlePickupTextChange}
              onSelect={handlePickupSelect}
            />
            {showErr.pickup ? <p className="errmsg">✕ {showErr.pickup}</p> : null}
          </div>
        ) : (
          <div className="field reveal">
            <label className="field__label" htmlFor="tm-start">{t.fields.startingAddress}</label>
            <p className="field__hint">{t.fields.startingAddressHint}</p>
            <PlacesAutocomplete
              id="tm-start"
              value={pickupAddress}
              locale={locale}
              placeholder={t.fields.pickupPlaceholder}
              onChange={handlePickupTextChange}
              onSelect={handlePickupSelect}
            />
          </div>
        )}
      </div>
    );
  }

  function renderPalateStep() {
    return (
      <div>
        <div className="field">
          <label className="field__label">{t.fields.wineStyles}</label>
          <p className="field__hint">{t.fields.wineStylesHint}</p>
          <div className="cards cards--2">
            {WINE_STYLE_OPTIONS.map((option) => (
              <Card
                key={option.id}
                title={t.wineStyles[option.id]?.label ?? option.label}
                desc={t.wineStyles[option.id]?.desc}
                selected={selectedWineStyles.includes(option.id)}
                onClick={() => setSelectedWineStyles((current) => toggleMultiSelect(current, option.id))}
              />
            ))}
          </div>
          {showErr.wine ? <p className="errmsg">✕ {showErr.wine}</p> : null}
        </div>

        <div className="field">
          <label className="field__label">{t.fields.experiences}</label>
          <p className="field__hint">{t.fields.experiencesHint}</p>
          <div className="cards cards--2">
            {EXPERIENCE_OPTIONS.map((option) => (
              <Card
                key={option.id}
                title={t.experiences[option.id]?.label ?? option.label}
                desc={t.experiences[option.id]?.desc}
                selected={selectedExperiences.includes(option.id)}
                onClick={() => setSelectedExperiences((current) => toggleMultiSelect(current, option.id))}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderOccasionStep() {
    return (
      <div>
        <div className="field">
          <label className="field__label">{t.fields.occasion}</label>
          <div className="pills">
            {OCCASION_OPTIONS.map((option) => (
              <Pill
                key={option.id}
                selected={occasion === option.id}
                onClick={() => setOccasion(occasion === option.id ? "" : option.id)}
              >
                {t.occasions[option.id] ?? option.label}
              </Pill>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field__label">{t.fields.budget}</label>
          <p className="field__hint">{t.fields.budgetHint}</p>
          <div className="cards cards--list">
            {BUDGET_OPTIONS.map((option) => (
              <RowCard
                key={option.id}
                selected={budgetBand === option.id}
                title={t.budgets[option.id]?.label ?? option.label}
                note={t.budgets[option.id]?.desc}
                onClick={() => setBudgetBand(budgetBand === option.id ? "" : option.id)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  function renderCareStep() {
    return (
      <div>
        <div className="field">
          <label className="field__label">{t.fields.dietary}</label>
          <p className="field__hint">{t.fields.dietaryHint}</p>
          <div className="pills">
            {DIETARY_OPTIONS.map((option) => (
              <Pill
                key={option.id}
                selected={selectedDietaryNeeds.includes(option.id)}
                onClick={() => setSelectedDietaryNeeds((current) => toggleMultiSelect(current, option.id))}
              >
                {t.dietary[option.id] ?? option.label}
              </Pill>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field__label">{t.fields.accessibility}</label>
          <p className="field__hint">{t.fields.accessibilityHint}</p>
          <div className="cards cards--2">
            {ACCESSIBILITY_OPTIONS.map((option) => (
              <Card
                key={option.id}
                title={t.accessibility[option.id]?.label ?? option.label}
                desc={t.accessibility[option.id]?.desc}
                selected={selectedAccessibilityNeeds.includes(option.id)}
                onClick={() => setSelectedAccessibilityNeeds((current) => toggleMultiSelect(current, option.id))}
              />
            ))}
          </div>
          <input
            className="input"
            style={{ marginTop: 4 }}
            value={accessibilityOther}
            placeholder={t.fields.accessibilityPlaceholder}
            onChange={(event) => setAccessibilityOther(event.target.value)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="tm-flow" lang={locale} data-script={script}>
      {showResult ? (
        renderResult()
      ) : (
        <div className="flow flow--form">
          <aside className="aside">
            <div className="aside__media">
              <div
                className="aside__img"
                style={{ background: "linear-gradient(150deg, #3a4a40 0%, #6f6049 55%, #b89457 120%)" }}
              />
              <div className="aside__scrim" />
            </div>
            <div className="aside__inner">
              <div className="aside__top">
                <Wordmark light />
                <LangSelect locale={locale} onChange={changeLocale} light label={t.ui.language} />
              </div>
              <div className="aside__head">
                <p className="tm-kicker aside__chapterKicker">{curStep.kicker}</p>
                <h2 className="aside__chapterTitle">{curStep.title}</h2>
              </div>
              <nav className="rail">
                {stepIds.map((id, index) => (
                  <button
                    key={id}
                    type="button"
                    className={`rail__item ${index === wizardStep ? "is-active" : ""} ${index < wizardStep ? "is-done" : ""}`}
                    disabled={index > wizardStep}
                    onClick={() => goToStep(index)}
                  >
                    <span className="rail__dot">{index < wizardStep ? "✓" : index + 1}</span>
                    <span className="rail__label">{t.steps[id].label}</span>
                  </button>
                ))}
              </nav>
              <p className="aside__note">{t.ui.asideNote}</p>
            </div>
          </aside>

          <div className="main">
            <div className="topbar">
              <Wordmark />
              <div className="topbar__right">
                <LangSelect locale={locale} onChange={changeLocale} label={t.ui.language} />
                <span className="topbar__count">
                  {curStep.label}
                  <br />
                  <b>
                    {t.ui.step} {wizardStep + 1}
                  </b>{" "}
                  {t.ui.of} {stepIds.length}
                </span>
              </div>
            </div>
            <div className="topbar__progress">
              <div className="topbar__progressFill" style={{ width: `${progress}%` }} />
            </div>

            <div className="content">
              <div className="step__head reveal" key={stepIds[wizardStep]}>
                <p className="tm-kicker step__kicker">{curStep.kicker}</p>
                <h1 className="step__title tm-display">{curStep.title}</h1>
              </div>
              <div className="reveal" key={`body-${stepIds[wizardStep]}-${locale}`}>
                {wizardStep === 0 ? renderTripStep() : null}
                {wizardStep === 1 ? renderPalateStep() : null}
                {wizardStep === 2 ? renderOccasionStep() : null}
                {wizardStep === 3 ? renderCareStep() : null}
              </div>
            </div>

            <div className="actionbar">
              {wizardStep > 0 ? (
                <button type="button" className="btn btn--text" onClick={prevStep}>
                  ← {t.ui.back}
                </button>
              ) : (
                <span className="actionbar__meta">{t.ui.takes}</span>
              )}
              <span className="actionbar__spacer" />
              <button
                type="button"
                className="btn btn--primary"
                onClick={nextStep}
                disabled={wizardAttempted && !canAdvance}
              >
                {isLastStep ? t.ui.craft : t.ui.continue}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedPreviewWinery ? (
        (() => {
          const remoteProfile = profilesById[slugToWineryUuid(selectedPreviewWinery.id)];
          const summaryText = remoteProfile?.description ?? "";
          const knownForText = remoteProfile?.famous_for ?? "";
          const experiencesText = experienceSummary(remoteProfile, "");
          const displayAddress = remoteProfile?.address ?? "";
          return (
            <div
              className="modalBackdrop"
              role="dialog"
              aria-modal="true"
              aria-label={`${selectedPreviewWinery.name} details`}
            >
              <div className="modalCard">
                <button
                  type="button"
                  className="modalClose"
                  onClick={() => setSelectedPreviewWinery(null)}
                  aria-label="Close winery details"
                >
                  X
                </button>
                <div className="catalogRow">
                  <div className="catalogMedia">
                    <div className="catalogImage">
                      <span>
                        {selectedPreviewWinery.name
                          .split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)}
                      </span>
                    </div>
                    <div className="catalogMeta">
                      <h3>{selectedPreviewWinery.name}</h3>
                      {displayAddress ? <p className="subtle">{displayAddress}</p> : null}
                      {remoteProfile?.tasting_price !== undefined ? (
                        <p className="subtle">
                          Tasting: <strong>${remoteProfile.tasting_price}</strong>
                        </p>
                      ) : null}
                      {remoteProfile?.offers_cheese_board ? <p className="subtle">Cheese board available</p> : null}
                      <div className="status available">Live booking available</div>
                    </div>
                  </div>
                  <div className="catalogSummary">
                    {summaryText ? <p>{summaryText}</p> : null}
                    <div className="catalogBullets">
                      {experiencesText ? (
                        <p>
                          <strong>Experiences:</strong> {experiencesText}
                        </p>
                      ) : null}
                      {knownForText ? (
                        <p>
                          <strong>Known for:</strong> {knownForText}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      ) : null}
    </div>
  );
}
