"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
} from "@/lib/explore-preferences";
import { saveExploreTourSummary } from "@/lib/explore-tour-summary";

type TripLength = "half-day" | "full-day" | "multi-day";
type YesNo = "yes" | "no";
type Vibe = "popular" | "lesser-known" | "";

type SearchProfile = {
  hasLunchExperience: boolean;
  organicFriendly: boolean;
  hasSpecialExperience: boolean;
  hasCheeseBoard: boolean;
  vibeTag: "popular" | "lesser-known";
  transportSuitable: boolean;
  supportsHalfDay: boolean;
  supportsFullDay: boolean;
  supportsMultiDay: boolean;
};

type ItineraryChapter = {
  label: "Morning" | "Afternoon" | "Evening";
  stops: Recommendation["stops"];
};

type AnimatedWordsProps = {
  text: string;
  animationKey: string;
  delayMs?: number;
  intervalMs?: number;
  className?: string;
};

function toTimeWindow(length: TripLength) {
  if (length === "half-day") {
    return { start: "09:00", end: "13:30", stops: 2 };
  }
  return { start: "09:00", end: "17:00", stops: 4 };
}

function toIsoDate(dayOffset = 7) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
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
      setVisibleCount(0);
      return;
    }

    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVisibleCount(words.length);
      return;
    }

    setVisibleCount(0);
    let count = 0;
    let intervalId: number | undefined;
    const timeoutId = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        count += 1;
        setVisibleCount(count);
        if (count >= words.length && intervalId !== undefined) {
          window.clearInterval(intervalId);
        }
      }, intervalMs);
    }, delayMs);

    return () => {
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

  return {
    hasLunchExperience:
      combinedText.includes("lunch") ||
      combinedText.includes("degustation") ||
      combinedText.includes("pairing") ||
      combinedText.includes("platter"),
    organicFriendly:
      combinedText.includes("organic") ||
      combinedText.includes("biodynamic") ||
      combinedText.includes("natural"),
    hasSpecialExperience:
      combinedText.includes("tour") ||
      combinedText.includes("private") ||
      combinedText.includes("behind the scenes") ||
      combinedText.includes("masterclass"),
    hasCheeseBoard:
      remoteProfile?.offers_cheese_board ?? false,
    vibeTag: winery.selectedByCount >= 500 ? "popular" : "lesser-known",
    transportSuitable: true,
    supportsHalfDay: true,
    supportsFullDay: true,
    supportsMultiDay: true,
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
) {
  const selected: WineryCatalogItem[] = [];
  const pool = [...wineries];
  let current = { latitude: -33.952, longitude: 115.075 };

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

export default function ExplorePage() {
  const router = useRouter();
  const initialPreferences = useMemo(() => loadExplorePreferences(), []);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const itineraryCardRef = useRef<HTMLDivElement | null>(null);
  const [name, setName] = useState(initialPreferences?.name ?? "");
  const [email, setEmail] = useState(initialPreferences?.email ?? "");
  const [groupSize, setGroupSize] = useState(initialPreferences?.groupSize ?? 4);
  const [needTransport, setNeedTransport] = useState<YesNo>(initialPreferences?.needTransport ?? "yes");
  const [tripLength, setTripLength] = useState<TripLength>(initialPreferences?.tripLength ?? "full-day");
  const [includeLunch, setIncludeLunch] = useState<YesNo>(initialPreferences?.includeLunch ?? "yes");
  const [prefOrganic, setPrefOrganic] = useState(initialPreferences?.prefOrganic ?? false);
  const [prefSpecialExperience, setPrefSpecialExperience] = useState(initialPreferences?.prefSpecialExperience ?? false);
  const [prefCheeseBoard, setPrefCheeseBoard] = useState(initialPreferences?.prefCheeseBoard ?? false);
  const [vibe, setVibe] = useState<Vibe>(initialPreferences?.vibe ?? "");
  const [requesting, setRequesting] = useState(false);
  const [matchedWineries, setMatchedWineries] = useState<WineryCatalogItem[]>(
    () =>
      (initialPreferences?.matchedWineryIds ?? [])
        .map((entry) => wineryCatalog.find((item) => item.id === entry))
        .filter((entry): entry is WineryCatalogItem => Boolean(entry)),
  );
  const [previewDate, setPreviewDate] = useState<string>(initialPreferences?.previewDate ?? "");
  const [recommendationOptions, setRecommendationOptions] = useState<Recommendation[]>([]);
  const [selectedRecommendationIndex, setSelectedRecommendationIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [hasPlanned, setHasPlanned] = useState(false);
  const [isPreferencesCollapsed, setIsPreferencesCollapsed] = useState(false);
  const [selectedPreviewWinery, setSelectedPreviewWinery] = useState<WineryCatalogItem | null>(null);
  const [profilesById, setProfilesById] = useState<Record<string, WineryListResponse["wineries"][number]>>({});
  const [itineraryReplaySeed, setItineraryReplaySeed] = useState(0);

  const timeWindow = useMemo(() => toTimeWindow(tripLength), [tripLength]);
  const recommendation = recommendationOptions[selectedRecommendationIndex] ?? null;
  const itineraryChapters = recommendation ? buildItineraryChapters(recommendation.stops) : [];
  const itineraryAnimationKey = recommendation ? `${recommendation.itinerary_id}-${itineraryReplaySeed}` : "idle";
  let itineraryAnimationCursor = 90;

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
      tripLength,
      includeLunch,
      prefOrganic,
      prefSpecialExperience,
      prefCheeseBoard,
      vibe,
      matchedWineryIds: matchedWineries.map((entry) => entry.id),
      previewDate: previewDate || undefined,
    };
    saveExplorePreferences(payload);
  }, [
    name,
    email,
    groupSize,
    needTransport,
    tripLength,
    includeLunch,
    prefOrganic,
    prefSpecialExperience,
    prefCheeseBoard,
    vibe,
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
    setHasPlanned(true);
    setIsPreferencesCollapsed(true);
    setError(null);
    setRequesting(true);
    setRecommendationOptions([]);
    setSelectedRecommendationIndex(0);
    setItineraryReplaySeed(0);

    try {
      const hasCheeseBoardMatch = (winery: WineryCatalogItem) =>
        toSearchProfile(winery, profilesById[slugToWineryUuid(winery.id)]).hasCheeseBoard;

      const filterByPreferences = (includeVibePreference: boolean) => wineryCatalog.filter((winery) => {
        const profile = toSearchProfile(winery, profilesById[slugToWineryUuid(winery.id)]);
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
        if (tripLength === "half-day" && !profile.supportsHalfDay) {
          return false;
        }
        if (tripLength === "full-day" && !profile.supportsFullDay) {
          return false;
        }
        if (tripLength === "multi-day" && !profile.supportsMultiDay) {
          return false;
        }
        return true;
      });

      let candidatePool = filterByPreferences(true);
      let apiPreferredPool = candidatePool
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 10);
      let routeOptimized = pickNearestRoute(apiPreferredPool, timeWindow.stops, profilesById);

      if (routeOptimized.length < 2 && vibe) {
        candidatePool = filterByPreferences(false);
        apiPreferredPool = candidatePool
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 10);
        routeOptimized = pickNearestRoute(apiPreferredPool, timeWindow.stops, profilesById);
      }

      if (prefCheeseBoard) {
        const cheeseCandidates = candidatePool.filter(hasCheeseBoardMatch);
        const fallbackCheeseCandidates = wineryCatalog.filter(hasCheeseBoardMatch);
        const cheesePool = cheeseCandidates.length > 0 ? cheeseCandidates : fallbackCheeseCandidates;
        if (cheesePool.length === 0) {
          setError("No cheeseboard wineries are currently available.");
          return;
        }

        const routeHasCheese = routeOptimized.some(hasCheeseBoardMatch);
        if (!routeHasCheese) {
          const requiredCheese =
            cheesePool.find((candidate) => !routeOptimized.some((stop) => stop.id === candidate.id)) ??
            cheesePool[0];

          if (requiredCheese) {
            const seeded = [...routeOptimized, requiredCheese];
            const dedupedSeed = Array.from(new Map(seeded.map((entry) => [entry.id, entry])).values());
            routeOptimized = pickNearestRoute(dedupedSeed, timeWindow.stops, profilesById);

            if (!routeOptimized.some(hasCheeseBoardMatch)) {
              const withoutLast = routeOptimized.slice(0, Math.max(0, timeWindow.stops - 1));
              routeOptimized = [...withoutLast, requiredCheese];
            }
          }
        }
      }

      setMatchedWineries(apiPreferredPool);

      if (routeOptimized.length < 2) {
        setError("Not enough winery matches for this preference set yet. Try relaxing one filter.");
        return;
      }

      let foundOptions: Recommendation[] = [];
      let usedDate = toIsoDate(7);

      for (let offset = 1; offset <= 14; offset += 1) {
        const candidateDate = toIsoDate(offset);
        const response = await recommendItineraries({
          booking_date: candidateDate,
          pickup_location:
            needTransport === "yes"
              ? "Margaret River Visitor Centre"
              : "Self-drive (no transport required)",
          party_size: groupSize,
          preferred_start_time: timeWindow.start,
          preferred_end_time: timeWindow.end,
          preferred_wineries: apiPreferredPool.map((winery) => slugToWineryUuid(winery.id)),
        });

        if (response.itineraries.length > 0) {
          foundOptions = [...response.itineraries].sort(
            (a, b) => Number(b.expert_pick) - Number(a.expert_pick) || b.score - a.score,
          );

          if (foundOptions.length === 1) {
            const primaryStopIds = new Set(foundOptions[0]?.stops.map((stop) => stop.winery_id) ?? []);
            const alternatePreferredWineries = apiPreferredPool
              .filter((winery) => !primaryStopIds.has(slugToWineryUuid(winery.id)))
              .map((winery) => slugToWineryUuid(winery.id));

            if (alternatePreferredWineries.length >= 2) {
              const alternateResponse = await recommendItineraries({
                booking_date: candidateDate,
                pickup_location:
                  needTransport === "yes"
                    ? "Margaret River Visitor Centre"
                    : "Self-drive (no transport required)",
                party_size: groupSize,
                preferred_start_time: timeWindow.start,
                preferred_end_time: timeWindow.end,
                preferred_wineries: alternatePreferredWineries,
              });

              const alternateOption = alternateResponse.itineraries
                .sort((a, b) => Number(b.expert_pick) - Number(a.expert_pick) || b.score - a.score)[0];

              if (alternateOption) {
                foundOptions = [...foundOptions, { ...alternateOption, expert_pick: false, label: "Option B" }];
              }
            }
          }

          usedDate = candidateDate;
          break;
        }
      }

      if (foundOptions.length === 0) {
        setError("No preview schedule found in the next 14 days for this preference set.");
        return;
      }

      setPreviewDate(usedDate);
      setRecommendationOptions(foundOptions);
      setSelectedRecommendationIndex(0);
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
        ? "Margaret River Visitor Centre"
        : "Self-drive (no transport required)";

    saveExploreTourSummary({
      lead_name: name.trim(),
      lead_email: email.trim(),
      party_size: groupSize,
      pickup_location: pickupLocation,
      trip_length: tripLength,
      preview_date: previewDate,
      preferred_start_time: timeWindow.start,
      preferred_end_time: timeWindow.end,
      matched_winery_ids: matchedWineries.map((entry) => entry.id),
      stops: recommendation.stops.map((stop) => {
        const remoteProfile = profilesById[stop.winery_id] ?? resolveRemoteProfileByName(stop.winery_name);
        return {
          ...stop,
          tasting_price: remoteProfile?.tasting_price,
        };
      }),
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

  return (
    <AppShell
      eyebrow="Explore"
      title="Find your ideal winery day"
      intro="Answer a few quick preferences and we will build an efficient schedule with minimal travel between matching wineries."
      showWorkflowStatus={false}
      showPageHeader={false}
      navMode="public"
    >
      <div className="exploreLayout">
        <div className="exploreUnifiedPanel" style={{ width: "100%" }}>
        <section className="exploreSectionBlock exploreUnifiedHero">
          <p className="eyebrow">Explore</p>
          <h1>Find your ideal winery day</h1>
          <p className="heroCopy">Answer a few quick preferences and we will build an efficient schedule with minimal travel between matching wineries.</p>
        </section>
        <div className={`explorePreferencesWrap ${hasPlanned ? "compact" : ""}`} style={{ width: "100%", maxWidth: "100%", margin: 0 }}>
          <section className="exploreSectionBlock">
            <div className="sectionHeader">
              <div>
                <h2>Trip preferences</h2>
                <p>
                  {isPreferencesCollapsed
                    ? "Preferences minimized. Expand to edit and run a new plan."
                    : "Public explore form for guests before account creation/login."}
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
                  <strong>{name || "Guest"}</strong> · {groupSize} guests · {tripLength} · transport {needTransport}
                </p>
              </div>
            ) : (
            <div className="formPreview">
            <div className="fieldRow">
              <div className="field">
                <label htmlFor="exploreName">Name</label>
                <input
                  id="exploreName"
                  className="inputLike inputField"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Jane Smith"
                />
              </div>
              <div className="field">
                <label htmlFor="exploreEmail">Email</label>
                <input
                  id="exploreEmail"
                  type="email"
                  className="inputLike inputField"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="jane@example.com"
                />
              </div>
            </div>

            <div className="field">
              <label htmlFor="exploreGroup">Group size</label>
              <input
                id="exploreGroup"
                type="number"
                min={1}
                max={30}
                className="inputLike inputField"
                value={groupSize}
                onChange={(event) => setGroupSize(Math.max(1, Number(event.target.value) || 1))}
              />
            </div>

            <div className="field">
              <label>Need transport?</label>
              <div className="choiceRow">
                <label className="choicePill"><input type="radio" checked={needTransport === "yes"} onChange={() => setNeedTransport("yes")} /> Yes</label>
                <label className="choicePill"><input type="radio" checked={needTransport === "no"} onChange={() => setNeedTransport("no")} /> No</label>
              </div>
            </div>

            <div className="field">
              <label>Experience length</label>
              <div className="choiceRow">
                <label className="choicePill"><input type="radio" checked={tripLength === "half-day"} onChange={() => setTripLength("half-day")} /> Half day</label>
                <label className="choicePill"><input type="radio" checked={tripLength === "full-day"} onChange={() => setTripLength("full-day")} /> Full day</label>
                <label className="choicePill"><input type="radio" checked={tripLength === "multi-day"} onChange={() => setTripLength("multi-day")} /> Multi-day</label>
              </div>
            </div>

            <div className="field">
              <label>Include wineries with lunch?</label>
              <div className="choiceRow">
                <label className="choicePill"><input type="radio" checked={includeLunch === "yes"} onChange={() => setIncludeLunch("yes")} /> Yes</label>
                <label className="choicePill"><input type="radio" checked={includeLunch === "no"} onChange={() => setIncludeLunch("no")} /> No</label>
              </div>
            </div>

            <div className="field">
              <label>Special requests (multi-select)</label>
              <div className="choiceRow">
                <label className="choicePill"><input type="checkbox" checked={prefOrganic} onChange={(event) => setPrefOrganic(event.target.checked)} /> Organic wine</label>
                <label className="choicePill"><input type="checkbox" checked={prefSpecialExperience} onChange={(event) => setPrefSpecialExperience(event.target.checked)} /> Special winery experience</label>
                <label className="choicePill"><input type="checkbox" checked={prefCheeseBoard} onChange={(event) => setPrefCheeseBoard(event.target.checked)} /> Cheese board</label>
              </div>
            </div>

            <div className="field">
              <label>Vibe preference</label>
              <div className="choiceRow">
                <label className="choicePill"><input type="radio" checked={vibe === ""} onChange={() => setVibe("")} /> No preference</label>
                <label className="choicePill"><input type="radio" checked={vibe === "popular"} onChange={() => setVibe("popular")} /> Popular choice</label>
                <label className="choicePill"><input type="radio" checked={vibe === "lesser-known"} onChange={() => setVibe("lesser-known")} /> Lesser known</label>
              </div>
            </div>

              <button type="button" className="buttonPrimary fullWidthButton" onClick={handlePlanTrip} disabled={requesting}>
                {requesting ? "Planning..." : "Plan my trip"}
              </button>
            </div>
            )}
          </section>
        </div>

        {hasPlanned ? (
          <div ref={previewRef} className="explorePreviewWrap" style={{ width: "100%", maxWidth: "100%", margin: 0 }}>
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
                  {(() => {
                    itineraryAnimationCursor = 120;
                    return null;
                  })()}
                  <div ref={itineraryCardRef} className="bespokeItineraryCard">
                    <div className="bespokeItineraryBorder" />
                    <div className="bespokeItineraryHeader">
                      <p className="bespokeKicker">Bespoke day arranged for</p>
                      <h3>{name || "Your Group"}</h3>
                      <p className="bespokeDateLine">
                        {formatPreviewDate(previewDate)}
                        {tripLength === "multi-day" ? " · day one preview" : ""}
                      </p>
                    </div>
                    <div className="bespokeIntro">
                      {(() => {
                        const greetingText = `Dear ${name || "guest"},`;
                        const introText = "We have prepared a polished winery journey shaped around your preferences, pace, and the smoothest travel flow available for the day.";
                        const greetingDelay = reserveItineraryDelay(greetingText, 58, 320);
                        const introDelay = reserveItineraryDelay(introText, 58, 380);
                        return (
                          <>
                      <p>
                        <AnimatedWords
                          text={greetingText}
                          animationKey={`${itineraryAnimationKey}-greeting`}
                          delayMs={greetingDelay}
                        />
                      </p>
                      <p>
                        <AnimatedWords
                          text={introText}
                          animationKey={`${itineraryAnimationKey}-intro`}
                          delayMs={introDelay}
                        />
                      </p>
                          </>
                        );
                      })()}
                    </div>
                    <div className="bespokeMetaRow">
                      <span>{groupSize} guests</span>
                      <span>{tripLength.replace("-", " ")}</span>
                      <span>transport {needTransport}</span>
                    </div>
                    <div className="bespokeChapterStack">
                      {itineraryChapters.map((chapter) => (
                        <section key={chapter.label} className="bespokeChapter">
                          <div className="bespokeChapterHeading">
                            <span />
                            <h4>{chapter.label}</h4>
                            <span />
                          </div>
                          <div className="bespokeStopStack">
                            {chapter.stops.map((stop, chapterIndex) => {
                              const stopIndex = recommendation.stops.findIndex(
                                (entry) =>
                                  entry.winery_id === stop.winery_id &&
                                  entry.arrival_time === stop.arrival_time,
                              );
                              const nextStop = stopIndex >= 0 ? recommendation.stops[stopIndex + 1] : undefined;
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
                                      animationKey={`${itineraryAnimationKey}-${stop.winery_id}-time`}
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
                                        animationKey={`${itineraryAnimationKey}-${stop.winery_id}-title`}
                                        delayMs={stopTitleDelay}
                                        intervalMs={72}
                                        className="bespokeAnimatedTitle"
                                      />
                                    </button>
                                  </h5>
                                  <p className="bespokeStopBody">
                                    <AnimatedWords
                                      text={stopBodyText}
                                      animationKey={`${itineraryAnimationKey}-${stop.winery_id}-body`}
                                      delayMs={stopBodyDelay}
                                    />
                                  </p>
                                  <p className="bespokeTravelNote">
                                    <AnimatedWords
                                      text={travelNote}
                                      animationKey={`${itineraryAnimationKey}-${stop.winery_id}-travel`}
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
                    <div className="bespokeActionsRow">
                      <button
                        type="button"
                        className="buttonGhost bespokeReplayButton"
                        onClick={() => setItineraryReplaySeed((value) => value + 1)}
                      >
                        Replay animation
                      </button>
                    </div>
                  </div>
                  {recommendationOptions.length > 1 ? (
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

              {matchedWineries.length > 0 ? (
                <div className="callout">
                  <p className="miniLabel">Closest matches</p>
                  {matchedWineries.map((winery) => (
                    <p key={winery.id} className="subtle">
                      <strong>{winery.name}</strong> · {winery.region}
                    </p>
                  ))}
                </div>
              ) : null}

              <div className="callout">
                <p className="miniLabel">Searchable placeholders</p>
                <p className="subtle">Current matching uses partner profile fields where available. Additional explicit preference columns can be added later for more precise matching.</p>
              </div>

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
                    <strong>{selectedPreviewWinery.rating.toFixed(1)} stars</strong> · {selectedPreviewWinery.selectedByCount} guests shortlisted
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
