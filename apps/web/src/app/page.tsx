"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  loadExplorePreferences,
  saveExplorePreferences,
  type ExplorePreferences,
  type ExploreTripLength,
  type ExploreYesNo,
} from "@/lib/explore-preferences";

const GOOGLE_PLACES_SCRIPT_ID = "tm-google-places-script";

type AddressSuggestion = {
  label: string;
  placeId: string;
};

declare global {
  interface Window {
    google?: any;
  }
}

function toIsoDate(dayOffset = 1) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

function isPastDate(isoDate: string, todayIso: string) {
  if (!isoDate) {
    return false;
  }
  const selected = new Date(`${isoDate}T00:00:00`);
  const today = new Date(`${todayIso}T00:00:00`);
  return selected.getTime() < today.getTime();
}

function groupErrorMessage(groupSize: number) {
  if (groupSize <= 0) {
    return "Your group needs at least one person.";
  }
  if (groupSize > 20) {
    return "For groups larger than 20, please get in touch - we'll arrange something special.";
  }
  return null;
}

export default function Home() {
  const router = useRouter();
  const initialPreferences = useMemo(() => loadExplorePreferences(), []);
  const autocompleteServiceRef = useRef<any | null>(null);
  const geocoderRef = useRef<any | null>(null);

  const [visitDate, setVisitDate] = useState(initialPreferences?.previewDate ?? "");
  const [groupSize, setGroupSize] = useState(initialPreferences?.groupSize ?? 4);
  const [tripLength, setTripLength] = useState<ExploreTripLength>(initialPreferences?.tripLength ?? "full-day");
  const [needTransport, setNeedTransport] = useState<ExploreYesNo>(initialPreferences?.needTransport ?? "yes");
  const [pickupAddress, setPickupAddress] = useState(initialPreferences?.pickupAddress ?? "");
  const [pickupPlaceId, setPickupPlaceId] = useState(initialPreferences?.pickupPlaceId ?? "");
  const [pickupLatitude, setPickupLatitude] = useState<number | undefined>(initialPreferences?.pickupLatitude);
  const [pickupLongitude, setPickupLongitude] = useState<number | undefined>(initialPreferences?.pickupLongitude);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [addressLookupLoading, setAddressLookupLoading] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [googlePlacesReady, setGooglePlacesReady] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const todayIso = toIsoDate(0);

  const noDateError = submitAttempted && !visitDate
    ? "Please choose your travel dates to continue."
    : null;
  const pastDateError = submitAttempted && isPastDate(visitDate, todayIso)
    ? "Those dates have passed - please pick an upcoming trip."
    : null;
  const groupError = submitAttempted ? groupErrorMessage(groupSize) : null;
  const pickupAddressError = submitAttempted && needTransport === "yes" && !pickupAddress.trim()
    ? "Please enter your pickup address so we can arrange transport."
    : null;

  useEffect(() => {
    if (needTransport !== "yes") {
      setAddressSuggestions([]);
      setAddressLookupLoading(false);
      return;
    }
    if (!googleApiKey) {
      setGooglePlacesReady(false);
      return;
    }

    if (window.google?.maps?.places) {
      setGooglePlacesReady(true);
      return;
    }

    const existing = document.getElementById(GOOGLE_PLACES_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      const onLoad = () => setGooglePlacesReady(true);
      existing.addEventListener("load", onLoad);
      return () => existing.removeEventListener("load", onLoad);
    }

    const script = document.createElement("script");
    script.id = GOOGLE_PLACES_SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleApiKey)}&libraries=places&v=weekly`;
    script.addEventListener("load", () => setGooglePlacesReady(true));
    document.head.appendChild(script);
  }, [googleApiKey, needTransport]);

  useEffect(() => {
    if (!googlePlacesReady || !window.google?.maps?.places) {
      return;
    }
    if (!autocompleteServiceRef.current) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
    }
    if (!geocoderRef.current) {
      geocoderRef.current = new window.google.maps.Geocoder();
    }
  }, [googlePlacesReady]);

  useEffect(() => {
    if (needTransport !== "yes") {
      setAddressSuggestions([]);
      setAddressLookupLoading(false);
      return;
    }

    const query = pickupAddress.trim();
    if (!query || query.length < 3) {
      setAddressSuggestions([]);
      setAddressLookupLoading(false);
      return;
    }

    if (!googlePlacesReady || !autocompleteServiceRef.current) {
      setAddressLookupLoading(false);
      return;
    }

    let active = true;
    setAddressLookupLoading(true);
    const timer = window.setTimeout(() => {
      autocompleteServiceRef.current.getPlacePredictions(
        {
          input: query,
          componentRestrictions: { country: "au" },
          types: ["address"],
        },
        (predictions: Array<{ description: string; place_id: string }> | null, status: string) => {
          if (!active) {
            return;
          }
          const okStatus = window.google?.maps?.places?.PlacesServiceStatus?.OK;
          const zeroStatus = window.google?.maps?.places?.PlacesServiceStatus?.ZERO_RESULTS;
          if (status === okStatus && predictions) {
            setAddressSuggestions(
              predictions
                .map((entry) => ({
                  label: entry.description?.trim() ?? "",
                  placeId: entry.place_id?.trim() ?? "",
                }))
                .filter((entry) => entry.label && entry.placeId)
                .slice(0, 6),
            );
          } else if (status === zeroStatus) {
            setAddressSuggestions([]);
          } else {
            setAddressSuggestions([]);
          }
          setAddressLookupLoading(false);
        },
      );
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [googlePlacesReady, needTransport, pickupAddress]);

  function handleGroupStep(delta: number) {
    setGroupSize((current) => Math.max(0, current + delta));
  }

  function resolvePlaceCoordinates(placeId: string) {
    if (!geocoderRef.current || !placeId) {
      return;
    }

    geocoderRef.current.geocode({ placeId }, (results: any[] | null, status: string) => {
      const okStatus = window.google?.maps?.GeocoderStatus?.OK;
      if (status !== okStatus || !results || results.length === 0) {
        setPickupLatitude(undefined);
        setPickupLongitude(undefined);
        return;
      }

      const location = results[0]?.geometry?.location;
      if (!location) {
        setPickupLatitude(undefined);
        setPickupLongitude(undefined);
        return;
      }

      const lat = typeof location.lat === "function" ? location.lat() : undefined;
      const lng = typeof location.lng === "function" ? location.lng() : undefined;
      if (typeof lat === "number" && Number.isFinite(lat) && typeof lng === "number" && Number.isFinite(lng)) {
        setPickupLatitude(lat);
        setPickupLongitude(lng);
      } else {
        setPickupLatitude(undefined);
        setPickupLongitude(undefined);
      }
    });
  }

  function handleBegin() {
    setSubmitAttempted(true);
    const hasNoDate = !visitDate;
    const hasPastDate = isPastDate(visitDate, todayIso);
    const groupValidationMessage = groupErrorMessage(groupSize);
    const hasNoPickupAddress = needTransport === "yes" && !pickupAddress.trim();
    if (hasNoDate || hasPastDate || groupValidationMessage || hasNoPickupAddress) {
      return;
    }

    const current = loadExplorePreferences();
    const next: ExplorePreferences = {
      name: current?.name ?? "",
      email: current?.email ?? "",
      includeLunch: current?.includeLunch ?? "yes",
      prefOrganic: current?.prefOrganic ?? false,
      prefSpecialExperience: current?.prefSpecialExperience ?? false,
      prefCheeseBoard: current?.prefCheeseBoard ?? false,
      vibe: current?.vibe ?? "",
      matchedWineryIds: current?.matchedWineryIds ?? [],
      previewDate: visitDate,
      groupSize,
      tripLength,
      needTransport,
      pickupAddress: pickupAddress.trim() || undefined,
      pickupPlaceId: pickupPlaceId || undefined,
      pickupLatitude,
      pickupLongitude,
    };
    saveExplorePreferences(next);
    router.push("/explore");
  }

  return (
    <AppShell
      eyebrow="Explore"
      title="Plan your Margaret River day, your way"
      intro="Tell us a little about your trip and we'll find the perfect experiences for you."
      navMode="public"
      showWorkflowStatus={false}
      showPageHeader={false}
    >
      <div className="exploreLayout">
        <div className="exploreUnifiedPanel" style={{ width: "100%" }}>
          <section className="exploreSectionBlock exploreUnifiedHero">
            <p className="eyebrow">Explore</p>
            <h1>Plan your Margaret River day, your way</h1>
            <p className="heroCopy">Tell us a little about your trip and we'll find the perfect experiences for you.</p>
          </section>

          <section className="exploreSectionBlock">
            <div className="formPreview">
              <div className="field">
                <label htmlFor="visitDate">When are you visiting?</label>
                <input
                  id="visitDate"
                  type="date"
                  className="inputLike inputField"
                  value={visitDate}
                  onChange={(event) => setVisitDate(event.target.value)}
                  min={todayIso}
                  placeholder="Choose your travel dates"
                />
                {noDateError ? <p className="subtle" style={{ color: "#8f3a2b" }}>{noDateError}</p> : null}
                {pastDateError ? <p className="subtle" style={{ color: "#8f3a2b" }}>{pastDateError}</p> : null}
              </div>

              <div className="field">
                <label htmlFor="groupSize">How many in your group?</label>
                <div className="ctaRow" style={{ alignItems: "center" }}>
                  <button type="button" className="buttonGhost" onClick={() => handleGroupStep(-1)} aria-label="Decrease group size">-</button>
                  <input
                    id="groupSize"
                    type="number"
                    min={0}
                    max={30}
                    className="inputLike inputField"
                    style={{ maxWidth: 120 }}
                    value={groupSize}
                    onChange={(event) => setGroupSize(Number(event.target.value) || 0)}
                  />
                  <button type="button" className="buttonGhost" onClick={() => handleGroupStep(1)} aria-label="Increase group size">+</button>
                </div>
                <p className="subtle">Including yourself</p>
                {groupError ? (
                  <p className="subtle" style={{ color: "#8f3a2b" }}>
                    {groupSize > 20 ? (
                      <>
                        For groups larger than 20, please{" "}
                        <Link href="mailto:sean@swagritech.com.au" style={{ textDecoration: "underline" }}>get in touch</Link>
                        {" "}- we'll arrange something special.
                      </>
                    ) : groupError}
                  </p>
                ) : null}
              </div>

              <div className="field">
                <label>How long would you like your winery day?</label>
                <div className="choiceRow profileChoiceGrid">
                  <label className="choicePill">
                    <input type="radio" checked={tripLength === "half-day"} onChange={() => setTripLength("half-day")} />
                    Half day - Around 3-4 hours
                  </label>
                  <label className="choicePill">
                    <input type="radio" checked={tripLength === "full-day"} onChange={() => setTripLength("full-day")} />
                    Full day - Around 6-8 hours
                  </label>
                  <label className="choicePill">
                    <input type="radio" checked={tripLength === "multi-day"} onChange={() => setTripLength("multi-day")} />
                    More than one day - We'll build a multi-day itinerary
                  </label>
                </div>
              </div>

              <div className="field">
                <label>Will you need transport?</label>
                <div className="choiceRow">
                  <label className="choicePill">
                    <input type="radio" checked={needTransport === "yes"} onChange={() => setNeedTransport("yes")} />
                    Yes
                  </label>
                  <label className="choicePill">
                    <input type="radio" checked={needTransport === "no"} onChange={() => setNeedTransport("no")} />
                    No
                  </label>
                </div>
                <p className="subtle">
                  {needTransport === "yes"
                    ? "We'll match you with a luxury private vehicle for the day."
                    : "You're arranging your own way there - no problem."}
                </p>
                {needTransport === "yes" ? (
                  <div className="field" style={{ position: "relative", marginTop: 8 }}>
                    <label htmlFor="pickupAddress">Pickup address</label>
                    <input
                      id="pickupAddress"
                      className="inputLike inputField"
                      value={pickupAddress}
                      placeholder="Start typing your address"
                      onFocus={() => setShowAddressSuggestions(true)}
                      onBlur={() => window.setTimeout(() => setShowAddressSuggestions(false), 120)}
                      onChange={(event) => {
                        setPickupAddress(event.target.value);
                        setPickupPlaceId("");
                        setPickupLatitude(undefined);
                        setPickupLongitude(undefined);
                        setShowAddressSuggestions(true);
                      }}
                    />
                    {!googleApiKey ? <p className="subtle">Address autocomplete unavailable right now.</p> : null}
                    {addressLookupLoading ? <p className="subtle">Finding addresses...</p> : null}
                    {showAddressSuggestions && addressSuggestions.length > 0 ? (
                      <div
                        className="sectionCard"
                        style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          zIndex: 20,
                          padding: 8,
                          marginTop: 6,
                          borderRadius: 12,
                          maxHeight: 220,
                          overflowY: "auto",
                        }}
                      >
                        <div className="selectorList">
                          {addressSuggestions.map((suggestion) => (
                            <button
                              key={suggestion.placeId}
                              type="button"
                              className="selectorCard"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                setPickupAddress(suggestion.label);
                                setPickupPlaceId(suggestion.placeId);
                                resolvePlaceCoordinates(suggestion.placeId);
                                setShowAddressSuggestions(false);
                              }}
                            >
                              <p className="subtle">{suggestion.label}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {pickupAddressError ? <p className="subtle" style={{ color: "#8f3a2b" }}>{pickupAddressError}</p> : null}
                  </div>
                ) : null}
              </div>

              <button type="button" className="buttonPrimary fullWidthButton" onClick={handleBegin}>
                Let's begin
              </button>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
