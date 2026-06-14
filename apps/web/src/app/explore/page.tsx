"use client";

import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  formatDisplayTime,
  listWineries,
  recommendItineraries,
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
import { TripSetup } from "@/components/home/trip-setup";

type DayPace = ExploreDayPace;
type YesNo = ExploreYesNo;
type Vibe = ExploreVibe;

type SearchProfile = {
  hasLunchExperience: boolean;
  organicFriendly: boolean;
  hasSpecialExperience: boolean;
  hasCheeseBoard: boolean;
  openDays: string[];
  minAdvanceDays: number;
  vibeTag: "popular" | "lesser-known";
  transportSuitable: boolean;
};

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

type AnimatedWordsProps = {
  text: string;
  animationKey: string;
  delayMs?: number;
  intervalMs?: number;
  className?: string;
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

const PACE_LABELS: Record<DayPace, string> = {
  relaxed: "Relaxed",
  balanced: "Full experience",
  maximise: "Maximise",
};

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

function formatPreviewDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function AnimatedWords({
  text,
  animationKey,
  delayMs = 0,
  intervalMs = 28,
  className,
}: AnimatedWordsProps) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const [visibleCount, setVisibleCount] = useState(words.length);

  useEffect(() => {
    if (words.length === 0) {
      return;
    }

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let count = 0;
    const resetId = window.setTimeout(() => {
      startTransition(() => {
        setVisibleCount(0);
      });
    }, 0);
    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        count += 1;
        startTransition(() => {
          setVisibleCount(count);
        });
        if (count >= words.length && intervalId !== undefined) {
          window.clearInterval(intervalId);
        }
      }, intervalMs);
    }, delayMs);

    return () => {
      window.clearTimeout(resetId);
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, [animationKey, delayMs, intervalMs, text, words.length]);

  if (words.length === 0) {
    return null;
  }

  return (
    <span className={className}>
      {words.map((word, index) => (
        <span
          key={`${animationKey}-${index}-${word}`}
          className={`wordRevealToken ${index < visibleCount ? "visible" : ""}`}
        >
          {word}
          {index < words.length - 1 ? " " : ""}
        </span>
      ))}
    </span>
  );
}

function toSearchProfile(
  winery: WineryCatalogItem,
  remoteProfile?: WineryListResponse["wineries"][number],
): SearchProfile {
  const remoteOfferNames = (remoteProfile?.unique_experience_offers ?? [])
    .map((entry) => entry?.name ?? "")
    .join(" ");
  const profileDescription = remoteProfile?.description ?? "";
  const profileFamousFor = remoteProfile?.famous_for ?? "";
  const combinedText = `${remoteOfferNames} ${profileDescription} ${profileFamousFor}`.toLowerCase();
  const styleSet = new Set(remoteProfile?.wine_styles ?? []);
  const signalSet = new Set(remoteProfile?.winery_signals ?? []);

  const hasStyle = (style: string) => styleSet.has(style);
  const hasSignal = (signal: string) => signalSet.has(signal);
  const openDays = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].filter((day) => hasSignal(day));
  const advanceDaysMap: Record<string, number> = {
    same_day: 0,
    "24_hours": 1,
    "48_hours": 2,
    "72_hours": 3,
    "1_week": 7,
    "2_weeks": 14,
  };
  const minAdvanceDays = Object.entries(advanceDaysMap)
    .filter(([signal]) => hasSignal(signal))
    .map(([, days]) => days)
    .sort((a, b) => b - a)[0] ?? 0;
  const hasAnyFoodSignal =
    hasSignal("winery_lunch") ||
    hasSignal("cheese_board") ||
    hasSignal("charcuterie_board") ||
    hasSignal("picnic_on_estate") ||
    hasSignal("wine_chocolate") ||
    hasSignal("cooking_class") ||
    hasSignal("vegetarian") ||
    hasSignal("vegan") ||
    hasSignal("dairy_free") ||
    hasSignal("gluten_free") ||
    hasSignal("gluten_free_strict") ||
    hasSignal("nut_free") ||
    hasSignal("halal") ||
    hasSignal("kosher");
  const noFoodPolicy = hasSignal("no_food");

  return {
    hasLunchExperience:
      !noFoodPolicy &&
      (
      hasSignal("winery_lunch") ||
      hasSignal("cheese_board") ||
      hasSignal("charcuterie_board") ||
      hasSignal("picnic_on_estate") ||
      hasSignal("wine_chocolate") ||
      hasAnyFoodSignal ||
      combinedText.includes("lunch") ||
      combinedText.includes("degustation") ||
      combinedText.includes("pairing") ||
      combinedText.includes("platter")
      ),
    organicFriendly:
      hasStyle("Organic & Biodynamic") ||
      hasStyle("Natural & Minimal Intervention") ||
      hasSignal("certified_organic") ||
      hasSignal("regenerative") ||
      combinedText.includes("organic") ||
      combinedText.includes("biodynamic") ||
      combinedText.includes("natural"),
    hasSpecialExperience:
      hasStyle("Small batch & Boutique") ||
      hasStyle("Family-owned Estate") ||
      hasStyle("Internationally awarded") ||
      hasSignal("guided_tasting") ||
      hasSignal("private_tasting_room") ||
      hasSignal("barrel_tasting") ||
      hasSignal("sunset_tasting") ||
      hasSignal("vineyard_walk") ||
      hasSignal("cellar_tour") ||
      hasSignal("blending_experience") ||
      hasSignal("harvest_experience") ||
      hasSignal("cooking_class") ||
      hasSignal("accommodation") ||
      hasSignal("corporate_events") ||
      hasSignal("wedding_venue") ||
      hasSignal("wheelchair_pathways") ||
      hasSignal("wheelchair_tasting") ||
      hasSignal("accessible_bathroom") ||
      hasSignal("step_free_entry") ||
      hasSignal("accessible_parking") ||
      hasSignal("minibus_access") ||
      hasSignal("hearing_loop") ||
      hasSignal("large_print") ||
      hasSignal("seated_tasting") ||
      hasSignal("quiet_space") ||
      hasSignal("halliday_5star") ||
      hasSignal("gold_medals") ||
      hasSignal("trophy_winner") ||
      hasSignal("press_featured") ||
      hasSignal("small_production") ||
      hasSignal("asian_pairing") ||
      hasSignal("hosted_asian_groups") ||
      hasSignal("mandarin_staff") ||
      hasSignal("vietnamese_staff") ||
      combinedText.includes("tour") ||
      combinedText.includes("private") ||
      combinedText.includes("behind the scenes") ||
      combinedText.includes("masterclass"),
    hasCheeseBoard:
      (remoteProfile?.offers_cheese_board ?? false) || hasSignal("cheese_board"),
    openDays,
    minAdvanceDays,
    vibeTag: hasStyle("Well known Margaret River Name")
      ? "popular"
      : hasStyle("Lesser known (off the beaten track)")
        ? "lesser-known"
        : winery.selectedByCount >= 500
          ? "popular"
          : "lesser-known",
    transportSuitable: true,
  };
}

function haversineKm(
  from: { latitude: number; longitude: number },
  to: { latitude: number; longitude: number },
) {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(to.latitude - from.latitude);
  const deltaLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);
  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function resolveCatalogOrRemotePoint(
  winery: WineryCatalogItem,
  remoteProfile?: WineryListResponse["wineries"][number],
) {
  if (
    remoteProfile?.latitude !== undefined &&
    remoteProfile?.longitude !== undefined &&
    Number.isFinite(remoteProfile.latitude) &&
    Number.isFinite(remoteProfile.longitude)
  ) {
    return { latitude: remoteProfile.latitude, longitude: remoteProfile.longitude };
  }

  return { latitude: winery.latitude, longitude: winery.longitude };
}

function pickNearestRoute(
  wineries: WineryCatalogItem[],
  maxStops: number,
  profilesById: Record<string, WineryListResponse["wineries"][number]>,
  startPoint?: { latitude: number; longitude: number },
) {
  const selected: WineryCatalogItem[] = [];
  const pool = [...wineries];
  let current = startPoint ?? { latitude: -33.952, longitude: 115.075 };

  while (pool.length > 0 && selected.length < maxStops) {
    let bestIndex = 0;
    let bestDistance = Number.MAX_VALUE;

    for (let index = 0; index < pool.length; index += 1) {
      const winery = pool[index];
      if (!winery) {
        continue;
      }
      const point = resolveCatalogOrRemotePoint(
        winery,
        profilesById[slugToWineryUuid(winery.id)],
      );
      const distance = haversineKm(current, point);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestIndex = index;
      }
    }

    const next = pool.splice(bestIndex, 1)[0];
    if (!next) {
      break;
    }
    selected.push(next);
    current = resolveCatalogOrRemotePoint(next, profilesById[slugToWineryUuid(next.id)]);
  }

  return selected;
}

const ACCEPTABLE_PICKUP_DRIVE_MINUTES = 30;
const AVERAGE_LOCAL_DRIVE_SPEED_KMH = 50;
const ACCEPTABLE_PICKUP_RADIUS_KM =
  (AVERAGE_LOCAL_DRIVE_SPEED_KMH * ACCEPTABLE_PICKUP_DRIVE_MINUTES) / 60;

function buildPreferredPoolFromPickup(params: {
  wineries: WineryCatalogItem[];
  profilesById: Record<string, WineryListResponse["wineries"][number]>;
  pickupPoint?: { latitude: number; longitude: number };
  maxCount: number;
}) {
  const { wineries, profilesById, pickupPoint, maxCount } = params;
  if (!pickupPoint) {
    return [...wineries].sort((a, b) => b.rating - a.rating).slice(0, maxCount);
  }

  const withDistance = wineries
    .map((winery) => {
      const point = resolveCatalogOrRemotePoint(
        winery,
        profilesById[slugToWineryUuid(winery.id)],
      );
      const distanceKm = haversineKm(pickupPoint, point);
      return { winery, distanceKm };
    })
    .sort((left, right) => {
      if (left.distanceKm !== right.distanceKm) {
        return left.distanceKm - right.distanceKm;
      }
      return right.winery.rating - left.winery.rating;
    });

  const nearby = withDistance.filter((entry) => entry.distanceKm <= ACCEPTABLE_PICKUP_RADIUS_KM);
  const source = nearby.length >= 4 ? nearby : withDistance;
  return source.slice(0, maxCount).map((entry) => entry.winery);
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
  const previewRef = useRef<HTMLDivElement | null>(null);
  const itineraryCardRef = useRef<HTMLDivElement | null>(null);
  const [name, setName] = useState(initialPreferences?.name ?? "");
  const [email, setEmail] = useState(initialPreferences?.email ?? "");
  const [groupSize, setGroupSize] = useState(initialPreferences?.groupSize ?? 4);
  const [needTransport, setNeedTransport] = useState<YesNo>(initialPreferences?.needTransport ?? "yes");
  const [pickupAddress, setPickupAddress] = useState(initialPreferences?.pickupAddress ?? "");
  const [pickupPlaceId, setPickupPlaceId] = useState(initialPreferences?.pickupPlaceId ?? "");
  const [pickupLatitude, setPickupLatitude] = useState<number | undefined>(initialPreferences?.pickupLatitude);
  const [pickupLongitude, setPickupLongitude] = useState<number | undefined>(initialPreferences?.pickupLongitude);
  // Trip basics (date/group/transport/pickup) are captured up front via <TripSetup />.
  // Returning visitors who already saved a travel date skip straight to the quiz.
  const [tripReady, setTripReady] = useState<boolean>(() => Boolean(initialPreferences?.previewDate));
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
  const [showDietary, setShowDietary] = useState(false);
  const [showAccessibility, setShowAccessibility] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [isRouteEntering, setIsRouteEntering] = useState(false);
  const [isPanelExiting, setIsPanelExiting] = useState(false);
  const [isPanelEntering, setIsPanelEntering] = useState(false);
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
  const [error, setError] = useState<string | null>(null);
  const [hasPlanned, setHasPlanned] = useState(false);
  const [isPreferencesCollapsed, setIsPreferencesCollapsed] = useState(false);
  const [selectedPreviewWinery, setSelectedPreviewWinery] = useState<WineryCatalogItem | null>(null);
  const [profilesById, setProfilesById] = useState<Record<string, WineryListResponse["wineries"][number]>>({});
  const [itineraryReplaySeed, setItineraryReplaySeed] = useState(0);
  const wineStyleValidationError = submitAttempted && selectedWineStyles.length === 0
    ? "Pick at least one wine style â€” even 'Surprise me' works perfectly."
    : null;
  const experienceInfoMessage = submitAttempted && selectedExperiences.length === 0
    ? "No preference is fine â€” we'll curate based on your other choices."
    : null;
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
  const itineraryAnimationKey = recommendation ? `${recommendation.itinerary_id}-${itineraryReplaySeed}` : "idle";
  let itineraryAnimationCursor = 90;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const transitionFlag = window.sessionStorage.getItem("tm_explore_route_fade_in");
    if (transitionFlag !== "1") {
      return;
    }
    window.sessionStorage.removeItem("tm_explore_route_fade_in");
    setIsRouteEntering(true);
    const timer = window.setTimeout(() => setIsRouteEntering(false), 260);
    return () => window.clearTimeout(timer);
  }, []);

  function reserveItineraryDelay(text: string, intervalMs = 32, pauseMs = 180) {
    const delay = itineraryAnimationCursor;
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    itineraryAnimationCursor += wordCount * intervalMs + pauseMs;
    return delay;
  }

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

  useEffect(() => {
    const target = recommendation ? itineraryCardRef.current : previewRef.current;
    if (!hasPlanned || !target) {
      return;
    }

    const timer = window.setTimeout(() => {
      const scrollTargetToCenter = () => {
        const rect = target.getBoundingClientRect();
        const absoluteTop = window.scrollY + rect.top;
        const centeredTop = Math.max(0, absoluteTop - (window.innerHeight - rect.height) / 2 - 18);
        window.scrollTo({ top: centeredTop, behavior: "smooth" });
      };

      const rafOne = window.requestAnimationFrame(() => {
        const rafTwo = window.requestAnimationFrame(() => {
          scrollTargetToCenter();
        });
        window.setTimeout(() => window.cancelAnimationFrame(rafTwo), 250);
      });
      window.setTimeout(() => window.cancelAnimationFrame(rafOne), 250);
    }, 220);

    return () => window.clearTimeout(timer);
  }, [hasPlanned, recommendation, itineraryReplaySeed]);

  async function handlePlanTrip() {
    setSubmitAttempted(true);
    if (selectedWineStyles.length === 0) {
      setError(null);
      return;
    }
    const runStepTransition = !hasPlanned;
    if (runStepTransition) {
      setIsPanelExiting(true);
      await new Promise<void>((resolve) => window.setTimeout(resolve, 180));
      setIsPanelExiting(false);
      setIsPanelEntering(true);
      window.setTimeout(() => setIsPanelEntering(false), 260);
    }
    setHasPlanned(true);
    setIsPreferencesCollapsed(true);
    setError(null);
    setRequesting(true);
    setRecommendationOptions([]);
    setSelectedRecommendationIndex(0);
    setMultiDayPlan([]);
    setItineraryReplaySeed(0);

    try {
      let requestPickupLatitude = pickupLatitude;
      let requestPickupLongitude = pickupLongitude;
      if (
        needTransport === "yes" &&
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

      const hasCheeseBoardMatch = (winery: WineryCatalogItem) =>
        toSearchProfile(winery, profilesById[slugToWineryUuid(winery.id)]).hasCheeseBoard;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const pickupLocationLabel =
        needTransport === "yes"
          ? pickupAddress.trim() || "Margaret River Visitor Centre"
          : "Self-drive (no transport required)";

      const routeStartPoint =
        needTransport === "yes" &&
        requestPickupLatitude !== undefined &&
        requestPickupLongitude !== undefined
          ? { latitude: requestPickupLatitude, longitude: requestPickupLongitude }
          : undefined;

      // Build the preferred winery pool for a single touring day. `excludedIds`
      // are catalog ids already used on earlier days (multi-day) so a day never
      // repeats a winery. `dateValue` drives the open-day / advance-notice filter.
      const buildDayPool = (dateValue: string, excludedIds: Set<string>) => {
        const requestDate = new Date(`${dateValue}T00:00:00`);
        const weekdayMap = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
        const requestedWeekday = weekdayMap[requestDate.getDay()] ?? "mon";
        const bookingDate = new Date(requestDate);
        bookingDate.setHours(0, 0, 0, 0);
        const daysAhead = Math.max(
          0,
          Math.floor((bookingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
        );

        const filterByPreferences = (includeVibePreference: boolean) =>
          wineryCatalog.filter((winery) => {
            if (excludedIds.has(winery.id)) {
              return false;
            }
            const profile = toSearchProfile(winery, profilesById[slugToWineryUuid(winery.id)]);
            if (profile.openDays.length > 0 && !profile.openDays.includes(requestedWeekday)) {
              return false;
            }
            if (daysAhead < profile.minAdvanceDays) {
              return false;
            }
            if (includeLunch === "yes" && !profile.hasLunchExperience) {
              return false;
            }
            if (prefOrganic && !profile.organicFriendly) {
              return false;
            }
            if (prefSpecialExperience && !profile.hasSpecialExperience) {
              return false;
            }
            if (includeVibePreference && vibe && profile.vibeTag !== vibe) {
              return false;
            }
            if (needTransport === "yes" && !profile.transportSuitable) {
              return false;
            }
            return true;
          });

        let candidatePool = filterByPreferences(true);
        let apiPreferredPool = buildPreferredPoolFromPickup({
          wineries: candidatePool,
          profilesById,
          pickupPoint: routeStartPoint,
          maxCount: 10,
        });
        let routeOptimized = pickNearestRoute(
          apiPreferredPool,
          Math.min(10, apiPreferredPool.length),
          profilesById,
          routeStartPoint,
        );

        if (routeOptimized.length < 2 && vibe) {
          candidatePool = filterByPreferences(false);
          apiPreferredPool = buildPreferredPoolFromPickup({
            wineries: candidatePool,
            profilesById,
            pickupPoint: routeStartPoint,
            maxCount: 10,
          });
          routeOptimized = pickNearestRoute(
            apiPreferredPool,
            Math.min(10, apiPreferredPool.length),
            profilesById,
            routeStartPoint,
          );
        }

        if (prefCheeseBoard) {
          const cheeseCandidates = candidatePool.filter(hasCheeseBoardMatch);
          const fallbackCheeseCandidates = wineryCatalog.filter(
            (winery) => !excludedIds.has(winery.id) && hasCheeseBoardMatch(winery),
          );
          const cheesePool = cheeseCandidates.length > 0 ? cheeseCandidates : fallbackCheeseCandidates;

          if (cheesePool.length > 0) {
            const routeHasCheese = routeOptimized.some(hasCheeseBoardMatch);
            if (!routeHasCheese) {
              const requiredCheese =
                cheesePool.find((candidate) => !routeOptimized.some((stop) => stop.id === candidate.id)) ??
                cheesePool[0];

              if (requiredCheese) {
                const seeded = [...routeOptimized, requiredCheese];
                const dedupedSeed = Array.from(new Map(seeded.map((entry) => [entry.id, entry])).values());
                routeOptimized = pickNearestRoute(
                  dedupedSeed,
                  Math.min(10, dedupedSeed.length),
                  profilesById,
                  routeStartPoint,
                );

                if (!routeOptimized.some(hasCheeseBoardMatch)) {
                  const withoutLast = routeOptimized.slice(0, Math.max(0, 9));
                  routeOptimized = [...withoutLast, requiredCheese];
                }
              }
            }
          }
        }

        return routeOptimized.length > 0 ? routeOptimized : apiPreferredPool;
      };

      // Recommend a single day: build a pool for `baseDate`, then retry a few
      // date offsets if a day comes back empty. Returns the itinerary options
      // (Option A / B for single-day), the date that produced them, and the pool.
      const planSingleDay = async (
        baseDate: string,
        excludedIds: Set<string>,
        withAlternate: boolean,
      ): Promise<{ options: Recommendation[]; usedDate: string; pool: WineryCatalogItem[] } | null> => {
        for (let offset = 0; offset < 14; offset += 1) {
          const candidateDate = shiftIsoDate(baseDate, offset);
          const pool = buildDayPool(candidateDate, excludedIds);
          if (pool.length < 2) {
            continue;
          }

          const response = await recommendItineraries({
            booking_date: candidateDate,
            pickup_location: pickupLocationLabel,
            pickup_place_id: needTransport === "yes" ? pickupPlaceId || undefined : undefined,
            pickup_latitude: needTransport === "yes" ? requestPickupLatitude : undefined,
            pickup_longitude: needTransport === "yes" ? requestPickupLongitude : undefined,
            party_size: groupSize,
            preferred_start_time: timeWindow.start,
            preferred_end_time: timeWindow.end,
            pace: dayPace,
            preferred_wineries: pool.map((winery) => slugToWineryUuid(winery.id)),
          });

          if (response.itineraries.length === 0) {
            continue;
          }

          let options = [...response.itineraries].sort(
            (a, b) => Number(b.expert_pick) - Number(a.expert_pick) || b.score - a.score,
          );

          if (withAlternate && options.length === 1) {
            const primaryStopIds = new Set(options[0]?.stops.map((stop) => stop.winery_id) ?? []);
            const alternatePreferredWineries = pool
              .filter((winery) => !primaryStopIds.has(slugToWineryUuid(winery.id)))
              .map((winery) => slugToWineryUuid(winery.id));

            if (alternatePreferredWineries.length >= 2) {
              const alternateResponse = await recommendItineraries({
                booking_date: candidateDate,
                pickup_location: pickupLocationLabel,
                pickup_place_id: needTransport === "yes" ? pickupPlaceId || undefined : undefined,
                pickup_latitude: needTransport === "yes" ? requestPickupLatitude : undefined,
                pickup_longitude: needTransport === "yes" ? requestPickupLongitude : undefined,
                party_size: groupSize,
                preferred_start_time: timeWindow.start,
                preferred_end_time: timeWindow.end,
                pace: dayPace,
                preferred_wineries: alternatePreferredWineries,
              });

              const alternateOption = alternateResponse.itineraries.sort(
                (a, b) => Number(b.expert_pick) - Number(a.expert_pick) || b.score - a.score,
              )[0];

              if (alternateOption) {
                options = [...options, { ...alternateOption, expert_pick: false, label: "Option B" }];
              }
            }
          }

          return { options, usedDate: candidateDate, pool };
        }
        return null;
      };

      const requestedDate = previewDate || toIsoDate(7);
      const daysRequested = Math.max(1, Math.min(3, tripDays));

      if (daysRequested === 1) {
        // Single-day flow: unchanged behaviour (one itinerary with Option A/B).
        const result = await planSingleDay(requestedDate, new Set<string>(), true);
        if (!result) {
          setError("No preview schedule found in the next 14 days for this preference set.");
          return;
        }
        setMatchedWineries(result.pool);
        setPreviewDate(result.usedDate);
        setRecommendationOptions(result.options);
        setSelectedRecommendationIndex(0);
        setMultiDayPlan([]);
        return;
      }

      // Multi-day flow: one real day per requested day, never repeating a winery.
      const usedWineryIds = new Set<string>();
      const collectedDays: MultiDayResult[] = [];
      for (let dayIndex = 0; dayIndex < daysRequested; dayIndex += 1) {
        const dayBaseDate = shiftIsoDate(requestedDate, dayIndex);
        const result = await planSingleDay(dayBaseDate, usedWineryIds, false);
        if (!result) {
          break;
        }
        const dayRecommendation = result.options[0];
        if (!dayRecommendation) {
          break;
        }
        // Exclude every winery the chosen day actually scheduled so later days
        // never repeat them.
        const scheduledUuids = new Set(dayRecommendation.stops.map((stop) => stop.winery_id));
        for (const winery of result.pool) {
          if (scheduledUuids.has(slugToWineryUuid(winery.id))) {
            usedWineryIds.add(winery.id);
          }
        }
        const scheduledPool = result.pool.filter((winery) =>
          scheduledUuids.has(slugToWineryUuid(winery.id)),
        );
        collectedDays.push({
          dayIndex,
          date: result.usedDate,
          recommendation: dayRecommendation,
          pool: scheduledPool.length > 0 ? scheduledPool : result.pool,
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
      setRecommendationOptions([firstDay.recommendation]);
      setSelectedRecommendationIndex(0);
      setMultiDayPlan(collectedDays);
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
        : "Self-drive (no transport required)";

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

  // Renders one bespoke day card. Used once for the single-day flow and once
  // per day for multi-day plans (the same visual language stacked N times).
  function renderItineraryCard(options: {
    rec: Recommendation;
    dateValue: string;
    animationKeyBase: string;
    attachRef: boolean;
    dayHeading?: string;
  }) {
    const { rec, dateValue, animationKeyBase, attachRef, dayHeading } = options;
    const chapters = buildItineraryChapters(rec.stops);
    // Reset the shared animation cursor so each day's reveal starts fresh.
    itineraryAnimationCursor = 120;

    return (
      <div
        ref={attachRef ? itineraryCardRef : undefined}
        className="bespokeItineraryCard"
      >
        <div className="bespokeItineraryBorder" />
        <div className="bespokeItineraryHeader">
          <p className="bespokeKicker">{dayHeading ? dayHeading : "Bespoke day arranged for"}</p>
          <h3>{name || "Your Group"}</h3>
          <p className="bespokeDateLine">{formatPreviewDate(dateValue)}</p>
        </div>
        <div className="bespokeIntro">
          {(() => {
            const greetingText = `Dear ${name || "guest"},`;
            const introText =
              "We have prepared a polished winery journey shaped around your preferences, pace, and the smoothest travel flow available for the day.";
            const greetingDelay = reserveItineraryDelay(greetingText, 58, 320);
            const introDelay = reserveItineraryDelay(introText, 58, 380);
            return (
              <>
                <p>
                  <AnimatedWords
                    text={greetingText}
                    animationKey={`${animationKeyBase}-greeting`}
                    delayMs={greetingDelay}
                  />
                </p>
                <p>
                  <AnimatedWords
                    text={introText}
                    animationKey={`${animationKeyBase}-intro`}
                    delayMs={introDelay}
                  />
                </p>
              </>
            );
          })()}
        </div>
        <div className="bespokeMetaRow">
          <span>{groupSize} guests</span>
          <span>{PACE_LABELS[dayPace]} pace</span>
          <span>transport {needTransport}</span>
        </div>
        <div className="bespokeChapterStack">
          {chapters.map((chapter) => (
            <section key={chapter.label} className="bespokeChapter">
              <div className="bespokeChapterHeading">
                <span />
                <h4>{chapter.label}</h4>
                <span />
              </div>
              <div className="bespokeStopStack">
                {chapter.stops.map((stop, chapterIndex) => {
                  const stopIndex = rec.stops.findIndex(
                    (entry) =>
                      entry.winery_id === stop.winery_id &&
                      entry.arrival_time === stop.arrival_time,
                  );
                  const nextStop = stopIndex >= 0 ? rec.stops[stopIndex + 1] : undefined;
                  const remoteProfile = profilesById[stop.winery_id] ?? resolveRemoteProfileByName(stop.winery_name);
                  const tastingNote = remoteProfile?.tasting_price !== undefined
                    ? `Tasting from $${remoteProfile.tasting_price}.`
                    : "Hosted tasting arranged for your visit.";
                  const cheeseBoardNote = remoteProfile?.offers_cheese_board
                    ? "A cheeseboard is available here if you would like to linger."
                    : "";
                  const travelModeLabel = needTransport === "yes"
                    ? "chauffeured drive"
                    : "leisurely drive";
                  const travelNote = nextStop
                    ? `${nextStop.drive_minutes} min ${travelModeLabel} to your next stop.`
                    : "A graceful finish to the day.";
                  const stopTimeText = formatDisplayTime(stop.arrival_time);
                  const stopTitleText = stop.winery_name;
                  const stopBodyText = `Arrive for a curated cellar-door experience and depart at ${formatDisplayTime(stop.departure_time)}. ${tastingNote} ${cheeseBoardNote}`.trim();
                  const stopTimeDelay = reserveItineraryDelay(stopTimeText, 82, 140);
                  const stopTitleDelay = reserveItineraryDelay(stopTitleText, 72, 180);
                  const stopBodyDelay = reserveItineraryDelay(stopBodyText, 58, 240);
                  const travelDelay = reserveItineraryDelay(travelNote, 52, 280);
                  return (
                    <article key={`${stop.winery_id}-${chapterIndex}`} className="bespokeStop">
                      <p className="bespokeStopTime">
                        <AnimatedWords
                          text={stopTimeText}
                          animationKey={`${animationKeyBase}-${stop.winery_id}-time`}
                          delayMs={stopTimeDelay}
                          intervalMs={82}
                        />
                      </p>
                      <h5>
                        <button
                          type="button"
                          className="timelineWineryLink bespokeWineryLink"
                          onClick={() => setSelectedPreviewWinery(resolveWineryById(stop.winery_id) ?? resolveWinery(stop.winery_name))}
                        >
                          <AnimatedWords
                            text={stopTitleText}
                            animationKey={`${animationKeyBase}-${stop.winery_id}-title`}
                            delayMs={stopTitleDelay}
                            intervalMs={72}
                            className="bespokeAnimatedTitle"
                          />
                        </button>
                      </h5>
                      <p className="bespokeStopBody">
                        <AnimatedWords
                          text={stopBodyText}
                          animationKey={`${animationKeyBase}-${stop.winery_id}-body`}
                          delayMs={stopBodyDelay}
                        />
                      </p>
                      <p className="bespokeTravelNote">
                        <AnimatedWords
                          text={travelNote}
                          animationKey={`${animationKeyBase}-${stop.winery_id}-travel`}
                          delayMs={travelDelay}
                          intervalMs={52}
                        />
                      </p>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
        <p className="bespokeSignature">Prepared with care by Tailor Moments Concierge.</p>
      </div>
    );
  }

  return (
    <AppShell
      eyebrow="Explore"
      title="What makes a great day out for you?"
      intro="No right answers - the more you tell us, the better we can tailor your experience."
      showWorkflowStatus={false}
      showPageHeader={false}
      navMode="public"
    >
      <div className={`exploreLayout exploreRouteFade ${isRouteEntering ? "routeEntering" : ""}`}>
        <div
          className={`exploreUnifiedPanel ${isPanelExiting ? "exploreStepFadeOut" : ""} ${isPanelEntering ? "exploreStepFadeIn" : ""}`}
          
        >
        <section className="exploreSectionBlock exploreUnifiedHero">
          <p className="eyebrow">Explore</p>
          <h1>{tripReady ? "What makes a great day out for you?" : "Plan your Margaret River day, your way"}</h1>
          <p className="heroCopy">
            {tripReady
              ? "No right answers - the more you tell us, the better we can tailor your experience."
              : "Tell us a little about your trip and we'll find the perfect experiences for you."}
          </p>
        </section>
        {!tripReady ? (
          <div className="explorePreferencesWrap">
            <section className="exploreSectionBlock">
              <TripSetup
                name={name}
                setName={setName}
                visitDate={previewDate}
                setVisitDate={setPreviewDate}
                groupSize={groupSize}
                setGroupSize={setGroupSize}
                dayPace={dayPace}
                setDayPace={setDayPace}
                tripDays={tripDays}
                setTripDays={setTripDays}
                needTransport={needTransport}
                setNeedTransport={setNeedTransport}
                pickupAddress={pickupAddress}
                setPickupAddress={setPickupAddress}
                pickupPlaceId={pickupPlaceId}
                setPickupPlaceId={setPickupPlaceId}
                setPickupLatitude={setPickupLatitude}
                setPickupLongitude={setPickupLongitude}
                onComplete={() => setTripReady(true)}
              />
            </section>
          </div>
        ) : null}
        {tripReady ? (
        <div className={`explorePreferencesWrap ${hasPlanned ? "compact" : ""}`} >
          <section className="exploreSectionBlock">
            <div className="sectionHeader">
              <div>
                <h2>What makes a great day out for you?</h2>
                <p>
                  {isPreferencesCollapsed
                    ? "Preferences minimized. Expand to edit and run a new plan."
                    : "No right answers - the more you tell us, the better we can tailor your experience."}
                </p>
              </div>
            </div>
            <div className="explorePreferenceActions">
              {isPreferencesCollapsed ? (
                <button type="button" className="buttonGhost" onClick={() => setIsPreferencesCollapsed(false)}>
                  Expand preferences
                </button>
              ) : null}
            </div>
            {isPreferencesCollapsed ? (
              <div className="explorePreferenceSummary">
                <p>
                  <strong>{name || "Guest"}</strong> - {groupSize} guests - {PACE_LABELS[dayPace]} pace - {tripDays === 1 ? "1 day" : `${tripDays} days`} - transport {needTransport} - {selectedWineStyles.length} wine styles - {selectedExperiences.length} experiences - {formatPreviewDate(previewDate)}
                </p>
              </div>
            ) : (
            <div className="formPreview">
            <div className="field">
              <label>What kind of wines interest you?</label>
              <div className="selectorList preferenceCardGrid">
                {WINE_STYLE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`selectorCard ${selectedWineStyles.includes(option.id) ? "selected" : ""}`}
                    onClick={() => setSelectedWineStyles((current) => toggleMultiSelect(current, option.id))}
                  >
                    <strong>{option.label}</strong>
                    <p className="subtle">{option.description}</p>
                  </button>
                ))}
              </div>
              {wineStyleValidationError ? (
                    <p className="subtle errorText">{wineStyleValidationError}</p>
              ) : null}
            </div>

            <div className="field">
              <label>Are there any experiences you&rsquo;d love?</label>
              <div className="selectorList preferenceCardGrid">
                {EXPERIENCE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`selectorCard ${selectedExperiences.includes(option.id) ? "selected" : ""}`}
                    onClick={() => setSelectedExperiences((current) => toggleMultiSelect(current, option.id))}
                  >
                    <strong>{option.label}</strong>
                  </button>
                ))}
              </div>
              {experienceInfoMessage ? <p className="subtle">{experienceInfoMessage}</p> : null}
            </div>

            <div className="field">
              <label>What&rsquo;s the occasion?</label>
              <div className="choiceRow">
                {OCCASION_OPTIONS.map((option) => (
                  <label key={option.id} className="choicePill">
                    <input type="radio" name="occasion" checked={occasion === option.id} onChange={() => setOccasion(option.id)} />
                    {option.label}
                  </label>
                ))}
                <label className="choicePill">
                  <input type="radio" name="occasion" checked={occasion === ""} onChange={() => setOccasion("")} />
                  No preference
                </label>
              </div>
            </div>

            <div className="field">
              <label>What&rsquo;s your rough budget per person?</label>
              <div className="selectorList preferenceCardGrid">
                {BUDGET_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`selectorCard ${budgetBand === option.id ? "selected" : ""}`}
                    onClick={() => setBudgetBand(option.id)}
                  >
                    <strong>{option.label}</strong>
                    <p className="subtle">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Any dietary requirements we should know about?</label>
              <button type="button" className="buttonGhost" onClick={() => setShowDietary((value) => !value)}>
                {showDietary ? "Hide dietary options" : "Add dietary preferences"}
              </button>
              {showDietary ? (
                <div className="choiceRow">
                  {DIETARY_OPTIONS.map((option) => (
                    <label key={option.id} className="choicePill">
                      <input
                        type="checkbox"
                        checked={selectedDietaryNeeds.includes(option.id)}
                        onChange={() => setSelectedDietaryNeeds((current) => toggleMultiSelect(current, option.id))}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="field">
              <label>Any accessibility needs?</label>
              <button type="button" className="buttonGhost" onClick={() => setShowAccessibility((value) => !value)}>
                {showAccessibility ? "Hide accessibility options" : "Add accessibility preferences"}
              </button>
              {showAccessibility ? (
                <div className="formPreview">
                  <div className="choiceRow">
                    {ACCESSIBILITY_OPTIONS.map((option) => (
                      <label key={option.id} className="choicePill">
                        <input
                          type="checkbox"
                          checked={selectedAccessibilityNeeds.includes(option.id)}
                          onChange={() => setSelectedAccessibilityNeeds((current) => toggleMultiSelect(current, option.id))}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                  <input
                    className="inputLike inputField"
                    value={accessibilityOther}
                    onChange={(event) => setAccessibilityOther(event.target.value)}
                    placeholder="Other accessibility notes (optional)"
                  />
                </div>
              ) : null}
            </div>

              <button type="button" className="buttonPrimary fullWidthButton" onClick={handlePlanTrip} disabled={requesting}>
                {requesting ? "Planning..." : "Plan my trip"}
              </button>
            </div>
            )}
          </section>
        </div>
        ) : null}

        {tripReady && hasPlanned ? (
          <div ref={previewRef} className="explorePreviewWrap" >
            <section className="exploreSectionBlock">
              <div className="sectionHeader">
                <div>
                  <h2>Schedule preview</h2>
                  <p>Closest matching wineries with efficient travel flow.</p>
                </div>
              </div>
              {!recommendation ? (
                requesting ? (
                  <div className="itineraryLoadingCard" aria-live="polite">
                    <div className="itineraryLoadingGlow" />
                    <p className="itineraryLoadingEyebrow">Tailor Moments Concierge Desk</p>
                    <h3>Preparing your bespoke itinerary</h3>
                    <p className="subtle">Reviewing partner availability, shaping the travel flow, and arranging a polished recommendation for {name || "you"}.</p>
                    <div className="itineraryLoadingLines">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                ) : (
                  <div className="emptyStateCard">
                    <h3>Preview appears here</h3>
                    <p className="subtle">We are checking matches and travel-efficient routing for your preferences.</p>
                  </div>
                )
              ) : (
                <div className="recommendationStack">
                  {multiDayPlan.length > 1 ? (
                    multiDayPlan.map((day) => (
                      <div key={`day-${day.dayIndex}`} className="multiDaySection">
                        {renderItineraryCard({
                          rec: day.recommendation,
                          dateValue: day.date,
                          animationKeyBase: `${itineraryAnimationKey}-day-${day.dayIndex}`,
                          attachRef: day.dayIndex === 0,
                          dayHeading: `Day ${day.dayIndex + 1} Â· ${formatPreviewDate(day.date)}`,
                        })}
                      </div>
                    ))
                  ) : (
                    renderItineraryCard({
                      rec: recommendation,
                      dateValue: previewDate,
                      animationKeyBase: itineraryAnimationKey,
                      attachRef: true,
                    })
                  )}
                  <div className="bespokeActionsRow">
                    <button
                      type="button"
                      className="buttonGhost bespokeReplayButton"
                      onClick={() => setItineraryReplaySeed((value) => value + 1)}
                    >
                      Replay animation
                    </button>
                  </div>
                  {multiDayPlan.length <= 1 && recommendationOptions.length > 1 ? (
                    <div className="itineraryOptionToggle">
                      <button
                        type="button"
                        className="buttonGhost"
                        onClick={() => {
                          setSelectedRecommendationIndex((value) => (value === 0 ? 1 : 0));
                          setItineraryReplaySeed((value) => value + 1);
                        }}
                      >
                        {selectedRecommendationIndex === 0 ? "Show Option B" : "Return to Option A"}
                      </button>
                    </div>
                  ) : null}
                  <button type="button" className="buttonPrimary fullWidthButton" onClick={handleOpenTourSummary}>
                    Tour summary
                  </button>
                </div>
              )}

              {error ? <div className="callout errorCallout">{error}</div> : null}
            </section>
          </div>
        ) : null}
        </div>
      </div>

      {selectedPreviewWinery ? (
        (() => {
          const remoteProfile = profilesById[slugToWineryUuid(selectedPreviewWinery.id)];
          const summaryText = remoteProfile?.description ?? "";
          const knownForText = remoteProfile?.famous_for ?? "";
          const experiencesText = experienceSummary(remoteProfile, "");
          const displayAddress = remoteProfile?.address ?? "";
          return (
        <div className="modalBackdrop" role="dialog" aria-modal="true" aria-label={`${selectedPreviewWinery.name} details`}>
          <div className="modalCard">
            <button type="button" className="modalClose" onClick={() => setSelectedPreviewWinery(null)} aria-label="Close winery details">
              X
            </button>
            <div className="catalogRow">
              <div className="catalogMedia">
                <div className="catalogImage">
                  <span>{selectedPreviewWinery.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</span>
                </div>
                <div className="catalogMeta">
                  <h3>{selectedPreviewWinery.name}</h3>
                  {displayAddress ? <p className="subtle">{displayAddress}</p> : null}
                  <p className="ratingLine">
                    <strong>{selectedPreviewWinery.rating.toFixed(1)} stars</strong> Â· {selectedPreviewWinery.selectedByCount} guests shortlisted
                  </p>
                  <p className="subtle">
                    Organic: <strong>{selectedPreviewWinery.organicStatus}</strong>
                  </p>
                  {remoteProfile?.tasting_price !== undefined ? (
                    <p className="subtle">
                      Tasting: <strong>${remoteProfile.tasting_price}</strong>
                    </p>
                  ) : null}
                  {remoteProfile?.offers_cheese_board ? (
                    <p className="subtle">Cheese board available</p>
                  ) : null}
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
                  <p>
                    <strong>Established:</strong> {selectedPreviewWinery.established}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
          );
        })()
      ) : null}
    </AppShell>
  );
}

