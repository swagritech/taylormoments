"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import {
  createBooking,
  formatDisplayTime,
  recommendItineraries,
  type BookingResponse,
  type Recommendation,
} from "@/lib/live-api";
import { wineryCatalog, type WineryCatalogItem } from "@/lib/winery-catalog";
import { slugToWineryUuid } from "@/lib/winery-id";
import {
  loadExplorePreferences,
  saveExplorePreferences,
  type ExplorePreferences,
} from "@/lib/explore-preferences";

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

function toSearchProfile(winery: WineryCatalogItem): SearchProfile {
  const lowerExperiences = winery.experiences.toLowerCase();
  const lowerOrganic = winery.organicStatus.toLowerCase();

  return {
    hasLunchExperience:
      lowerExperiences.includes("lunch") ||
      lowerExperiences.includes("degustation") ||
      lowerExperiences.includes("pairing") ||
      lowerExperiences.includes("platter"),
    organicFriendly:
      lowerOrganic.includes("organic") ||
      lowerOrganic.includes("biodynamic") ||
      lowerOrganic.includes("natural"),
    hasSpecialExperience:
      lowerExperiences.includes("tour") ||
      lowerExperiences.includes("private") ||
      lowerExperiences.includes("behind the scenes") ||
      lowerExperiences.includes("masterclass"),
    hasCheeseBoard:
      lowerExperiences.includes("cheese") ||
      lowerExperiences.includes("platter") ||
      lowerExperiences.includes("nougat"),
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

function pickNearestRoute(wineries: WineryCatalogItem[], maxStops: number) {
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
      const distance = haversineKm(current, {
        latitude: winery.latitude,
        longitude: winery.longitude,
      });
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
    current = { latitude: next.latitude, longitude: next.longitude };
  }

  return selected;
}

export default function ExplorePage() {
  const initialPreferences = useMemo(() => loadExplorePreferences(), []);
  const [name, setName] = useState(initialPreferences?.name ?? "");
  const [email, setEmail] = useState(initialPreferences?.email ?? "");
  const [groupSize, setGroupSize] = useState(initialPreferences?.groupSize ?? 4);
  const [needTransport, setNeedTransport] = useState<YesNo>(initialPreferences?.needTransport ?? "yes");
  const [tripLength, setTripLength] = useState<TripLength>(initialPreferences?.tripLength ?? "full-day");
  const [includeLunch, setIncludeLunch] = useState<YesNo>(initialPreferences?.includeLunch ?? "yes");
  const [prefOrganic, setPrefOrganic] = useState(initialPreferences?.prefOrganic ?? false);
  const [prefSpecialExperience, setPrefSpecialExperience] = useState(initialPreferences?.prefSpecialExperience ?? false);
  const [prefCheeseBoard, setPrefCheeseBoard] = useState(initialPreferences?.prefCheeseBoard ?? false);
  const [vibe, setVibe] = useState<Vibe>(initialPreferences?.vibe ?? "popular");
  const [requesting, setRequesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [matchedWineries, setMatchedWineries] = useState<WineryCatalogItem[]>(
    () =>
      (initialPreferences?.matchedWineryIds ?? [])
        .map((entry) => wineryCatalog.find((item) => item.id === entry))
        .filter((entry): entry is WineryCatalogItem => Boolean(entry)),
  );
  const [previewDate, setPreviewDate] = useState<string>(initialPreferences?.previewDate ?? "");
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  async function handlePlanTrip() {
    setError(null);
    setBooking(null);
    setRequesting(true);
    setRecommendation(null);

    try {
      const filtered = wineryCatalog.filter((winery) => {
        const profile = toSearchProfile(winery);
        if (includeLunch === "yes" && !profile.hasLunchExperience) {
          return false;
        }
        if (prefOrganic && !profile.organicFriendly) {
          return false;
        }
        if (prefSpecialExperience && !profile.hasSpecialExperience) {
          return false;
        }
        if (prefCheeseBoard && !profile.hasCheeseBoard) {
          return false;
        }
        if (vibe && profile.vibeTag !== vibe) {
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

      const shortlist = filtered
        .sort((a, b) => b.rating - a.rating)
        .slice(0, 14);
      const routeOptimized = pickNearestRoute(shortlist, timeWindow.stops);
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

  async function handleBook() {
    if (!recommendation) {
      return;
    }

    if (!name.trim() || !email.trim()) {
      setError("Please provide name and email before booking.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const created = await createBooking({
        lead_name: name.trim(),
        lead_email: email.trim(),
        booking_date: previewDate,
        preferred_start_time: timeWindow.start,
        preferred_end_time: timeWindow.end,
        pickup_location:
          needTransport === "yes"
            ? "Margaret River Visitor Centre"
            : "Self-drive (no transport required)",
        party_size: groupSize,
        preferred_wineries: matchedWineries.map((entry) => slugToWineryUuid(entry.id)),
      });
      setBooking(created);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to submit booking.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      eyebrow="Explore"
      title="Find your ideal winery day"
      intro="Answer a few quick preferences and we will build an efficient schedule with minimal travel between matching wineries."
      showWorkflowStatus={false}
      navMode="public"
    >
      <div className="grid two">
        <SectionCard title="Trip preferences" description="Public explore form for guests before account creation/login.">
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
                <label className="choicePill"><input type="radio" checked={vibe === "popular"} onChange={() => setVibe("popular")} /> Popular choice</label>
                <label className="choicePill"><input type="radio" checked={vibe === "lesser-known"} onChange={() => setVibe("lesser-known")} /> Lesser known</label>
              </div>
            </div>

            <button type="button" className="buttonPrimary fullWidthButton" onClick={handlePlanTrip} disabled={requesting}>
              {requesting ? "Planning..." : "Plan my trip"}
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Schedule preview" description="Closest matching wineries with efficient travel flow.">
          {!recommendation ? (
            <div className="emptyStateCard">
              <h3>Preview appears here</h3>
              <p className="subtle">Submit preferences to preview your optimized winery day.</p>
            </div>
          ) : (
            <div className="recommendationStack">
              <div className="callout successCallout">
                Preview date: <strong>{previewDate}</strong>{tripLength === "multi-day" ? " (day 1 preview for multi-day journey)" : ""}
              </div>
              <div className="timeline compactTimeline">
                {recommendation.stops.map((stop, index) => {
                  const nextStop = recommendation.stops[index + 1];
                  return (
                    <div key={`${stop.winery_id}-${index}`}>
                      <div className="timelineItem">
                        <div className="timelineTime">{formatDisplayTime(stop.arrival_time)}</div>
                        <div>
                          <h3>{stop.winery_name}</h3>
                          <p className="subtle">Depart {formatDisplayTime(stop.departure_time)}.</p>
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
              <button type="button" className="buttonPrimary fullWidthButton" onClick={handleBook} disabled={submitting}>
                {submitting ? "Booking..." : "Book"}
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
            <p className="subtle">hasLunchExperience, organicFriendly, specialExperienceFlag, cheeseBoardFriendly, vibeTag, transportSuitable, supportsHalfDay, supportsFullDay, and supportsMultiDay are currently derived placeholders ready to map to master DB columns.</p>
          </div>

          {booking ? (
            <div className="callout successCallout">
              Booking created. Reference <strong>{booking.bookingId}</strong>.
            </div>
          ) : null}
          {error ? <div className="callout errorCallout">{error}</div> : null}
        </SectionCard>
      </div>
    </AppShell>
  );
}
