"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import {
  formatDisplayTime,
  getWineryMediaPublic,
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

function placeholderGalleryFrames(winery: WineryCatalogItem | null) {
  const label = winery?.name ?? "Winery";
  return [
    `${label} cellar door`,
    `${label} tasting room`,
    `${label} estate view`,
  ];
}

export default function ExplorePage() {
  const router = useRouter();
  const initialPreferences = useMemo(() => loadExplorePreferences(), []);
  const previewRef = useRef<HTMLDivElement | null>(null);
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
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasPlanned, setHasPlanned] = useState(false);
  const [isPreferencesCollapsed, setIsPreferencesCollapsed] = useState(false);
  const [selectedPreviewWinery, setSelectedPreviewWinery] = useState<WineryCatalogItem | null>(null);
  const [profilesById, setProfilesById] = useState<Record<string, WineryListResponse["wineries"][number]>>({});
  const [mediaUrlsByWineryId, setMediaUrlsByWineryId] = useState<Record<string, string[]>>({});

  const timeWindow = useMemo(() => toTimeWindow(tripLength), [tripLength]);

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
    if (!hasPlanned || !previewRef.current) {
      return;
    }
    const timer = setTimeout(() => {
      previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 380);

    return () => clearTimeout(timer);
  }, [hasPlanned, recommendation]);

  useEffect(() => {
    let active = true;

    async function loadMedia() {
      if (!recommendation || recommendation.stops.length === 0) {
        if (active) {
          setMediaUrlsByWineryId({});
        }
        return;
      }

      const wineryIds = Array.from(new Set(recommendation.stops.map((stop) => stop.winery_id).filter(Boolean)));
      try {
        const entries = await Promise.all(
          wineryIds.map(async (wineryId) => {
            try {
              const response = await getWineryMediaPublic(wineryId);
              return [wineryId, response.assets.map((asset) => asset.public_url)] as [string, string[]];
            } catch {
              return [wineryId, []] as [string, string[]];
            }
          }),
        );

        if (!active) {
          return;
        }

        const next: Record<string, string[]> = {};
        for (const [wineryId, urls] of entries) {
          next[wineryId] = urls;
        }
        setMediaUrlsByWineryId(next);
      } catch {
        if (active) {
          setMediaUrlsByWineryId({});
        }
      }
    }

    void loadMedia();

    return () => {
      active = false;
    };
  }, [recommendation]);

  async function handlePlanTrip() {
    setHasPlanned(true);
    setIsPreferencesCollapsed(true);
    setError(null);
    setRequesting(true);
    setRecommendation(null);

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
      const shortlist = candidatePool
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 14);
      let routeOptimized = pickNearestRoute(shortlist, timeWindow.stops, profilesById);

      if (routeOptimized.length < 2 && vibe) {
        candidatePool = filterByPreferences(false);
        const relaxedShortlist = candidatePool
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 14);
        routeOptimized = pickNearestRoute(relaxedShortlist, timeWindow.stops, profilesById);
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

      setMatchedWineries(routeOptimized);

      if (routeOptimized.length < 2) {
        setError("Not enough winery matches for this preference set yet. Try relaxing one filter.");
        return;
      }

      let found: Recommendation | null = null;
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
          preferred_wineries: routeOptimized.map((winery) => slugToWineryUuid(winery.id)),
        });

        if (response.itineraries.length > 0) {
          found = response.itineraries.find((entry) => entry.expert_pick) ?? response.itineraries[0] ?? null;
          usedDate = candidateDate;
          break;
        }
      }

      if (!found) {
        setError("No preview schedule found in the next 14 days for this preference set.");
        return;
      }

      setPreviewDate(usedDate);
      setRecommendation(found);
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
      navMode="public"
    >
      <div className="exploreLayout">
        <div className={`explorePreferencesWrap ${hasPlanned ? "compact" : ""}`}>
          <SectionCard
            title="Trip preferences"
            description={
              isPreferencesCollapsed
                ? "Preferences minimized. Expand to edit and run a new plan."
                : "Public explore form for guests before account creation/login."
            }
          >
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
          </SectionCard>
        </div>

        {hasPlanned ? (
          <div ref={previewRef} className="explorePreviewWrap">
            <SectionCard title="Schedule preview" description="Closest matching wineries with efficient travel flow.">
              {!recommendation ? (
                <div className="emptyStateCard">
                  <h3>Preview appears here</h3>
                  <p className="subtle">We are checking matches and travel-efficient routing for your preferences.</p>
                </div>
              ) : (
                <div className="recommendationStack">
                  <div className="callout successCallout">
                    Preview date: <strong>{previewDate}</strong>{tripLength === "multi-day" ? " (day 1 preview for multi-day journey)" : ""}
                  </div>
                  <div className="schedulePreviewCard">
                    {recommendation.stops.map((stop, index) => {
                      const nextStop = recommendation.stops[index + 1];
                      const stopWinery = resolveWineryById(stop.winery_id) ?? resolveWinery(stop.winery_name);
                      const remoteProfile = profilesById[stop.winery_id] ?? resolveRemoteProfileByName(stop.winery_name);
                      const mediaFrames = mediaUrlsByWineryId[stop.winery_id] ?? [];
                      const placeholderFrames = placeholderGalleryFrames(stopWinery);
                      const rollingFrames = mediaFrames.length > 0
                        ? [...mediaFrames, ...mediaFrames]
                        : [...placeholderFrames, ...placeholderFrames];
                      return (
                        <div key={`${stop.winery_id}-${index}`}>
                          <div className="scheduleStopRow">
                            <div className="scheduleStopInfo">
                              <p className="timelineTime">{formatDisplayTime(stop.arrival_time)}</p>
                              <h3 className="scheduleStopTitle">
                                <button
                                  type="button"
                                  className="timelineWineryLink"
                                  onClick={() => setSelectedPreviewWinery(resolveWineryById(stop.winery_id) ?? resolveWinery(stop.winery_name))}
                                >
                                  {stop.winery_name}
                                </button>
                              </h3>
                              <p className="subtle">Depart {formatDisplayTime(stop.departure_time)}.</p>
                              {remoteProfile?.tasting_price !== undefined ? (
                                <p className="subtle">Tasting from ${remoteProfile.tasting_price}</p>
                              ) : null}
                              {remoteProfile?.offers_cheese_board ? (
                                <p className="subtle">Cheese board available</p>
                              ) : null}
                            </div>
                            <div className="scheduleGalleryViewport" aria-label={`${stop.winery_name} gallery preview`}>
                              <div className="scheduleGalleryTrack">
                                {rollingFrames.map((frame, frameIndex) => (
                                  <div className="scheduleGalleryTile" key={`${stop.winery_id}-${frameIndex}`}>
                                    {mediaFrames.length > 0 ? (
                                      <img
                                        src={frame}
                                        alt={`${stop.winery_name} preview ${frameIndex + 1}`}
                                        className="scheduleGalleryImage"
                                        loading="lazy"
                                      />
                                    ) : (
                                      <p>{frame}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          {nextStop ? (
                            <div className="itineraryConnector">
                              <span>{nextStop.drive_minutes} min drive to next stop</span>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
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
            </SectionCard>
          </div>
        ) : null}
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
