"use client";

// TripSetup — the trip-basics form (name / date / group / trip-length / transport /
// pickup with Google Places autocomplete + validation). Relocated verbatim from the
// former marketing homepage (apps/web/src/app/page.tsx) so it now gates the start of
// the /explore flow. It drives the explore page's existing state via props, so once
// the user submits, the preference quiz continues unchanged.

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ExploreDayPace, ExploreYesNo } from "@/lib/explore-preferences";

type AddressSuggestion = {
  label: string;
  placeId: string;
};

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

function toIsoDate(dayOffset = 0) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

export type TripSetupProps = {
  name: string;
  setName: (value: string) => void;
  visitDate: string;
  setVisitDate: (value: string) => void;
  groupSize: number;
  setGroupSize: (value: number | ((current: number) => number)) => void;
  dayPace: ExploreDayPace;
  setDayPace: (value: ExploreDayPace) => void;
  tripDays: number;
  setTripDays: (value: number) => void;
  needTransport: ExploreYesNo;
  setNeedTransport: (value: ExploreYesNo) => void;
  pickupAddress: string;
  setPickupAddress: (value: string) => void;
  pickupPlaceId: string;
  setPickupPlaceId: (value: string) => void;
  setPickupLatitude: (value: number | undefined) => void;
  setPickupLongitude: (value: number | undefined) => void;
  onComplete: () => void;
};

export function TripSetup({
  name,
  setName,
  visitDate,
  setVisitDate,
  groupSize,
  setGroupSize,
  dayPace,
  setDayPace,
  tripDays,
  setTripDays,
  needTransport,
  setNeedTransport,
  pickupAddress,
  setPickupAddress,
  pickupPlaceId,
  setPickupPlaceId,
  setPickupLatitude,
  setPickupLongitude,
  onComplete,
}: TripSetupProps) {
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [addressLookupLoading, setAddressLookupLoading] = useState(false);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
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

    const query = pickupAddress.trim();
    if (!query || query.length < 3) {
      setAddressSuggestions([]);
      setAddressLookupLoading(false);
      return;
    }

    if (!googleApiKey) {
      setAddressLookupLoading(false);
      return;
    }

    let active = true;
    const controller = new AbortController();
    setAddressLookupLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": googleApiKey,
            "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
          },
          body: JSON.stringify({
            input: query,
            includedRegionCodes: ["AU"],
            languageCode: "en",
            locationRestriction: {
              rectangle: {
                low: { latitude: -35.2, longitude: 112.9 },
                high: { latitude: -13.5, longitude: 129.0 },
              },
            },
          }),
        });
        if (!response.ok) {
          throw new Error("Places autocomplete failed");
        }
        const payload = (await response.json()) as {
          suggestions?: Array<{
            placePrediction?: {
              placeId?: string;
              text?: { text?: string };
            };
          }>;
        };
        if (!active) {
          return;
        }
        const nextSuggestions = (payload.suggestions ?? [])
          .map((entry) => ({
            label: entry.placePrediction?.text?.text?.trim() ?? "",
            placeId: entry.placePrediction?.placeId?.trim() ?? "",
          }))
          .filter((entry) => /(?:\bWA\b|Western Australia)/i.test(entry.label))
          .filter((entry) => entry.label && entry.placeId)
          .slice(0, 6);
        setAddressSuggestions(nextSuggestions);
      } catch {
        if (active) {
          setAddressSuggestions([]);
        }
      } finally {
        if (active) {
          setAddressLookupLoading(false);
        }
      }
    }, 220);

    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [googleApiKey, needTransport, pickupAddress]);

  function handleGroupStep(delta: number) {
    setGroupSize((current) => Math.max(0, current + delta));
  }

  async function resolvePlaceCoordinates(placeId: string) {
    if (!googleApiKey || !placeId) {
      return;
    }
    try {
      const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
        method: "GET",
        headers: {
          "X-Goog-Api-Key": googleApiKey,
          "X-Goog-FieldMask": "formattedAddress,location",
        },
      });
      if (!response.ok) {
        throw new Error("Place details failed");
      }
      const payload = (await response.json()) as {
        formattedAddress?: string;
        location?: { latitude?: number; longitude?: number };
      };
      const lat = payload.location?.latitude;
      const lng = payload.location?.longitude;
      if (typeof lat === "number" && Number.isFinite(lat) && typeof lng === "number" && Number.isFinite(lng)) {
        setPickupLatitude(lat);
        setPickupLongitude(lng);
      } else {
        setPickupLatitude(undefined);
        setPickupLongitude(undefined);
      }
      if (payload.formattedAddress?.trim()) {
        setPickupAddress(payload.formattedAddress.trim());
      }
    } catch {
      setPickupLatitude(undefined);
      setPickupLongitude(undefined);
    }
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
    onComplete();
  }

  return (
    <div className="formPreview">
      <div className="field">
        <label htmlFor="guestName">Your name</label>
        <input
          id="guestName"
          className="inputLike inputField"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Sean"
        />
      </div>

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
        {noDateError ? <p className="subtle errorText">{noDateError}</p> : null}
        {pastDateError ? <p className="subtle errorText">{pastDateError}</p> : null}
      </div>

      <div className="field">
        <label htmlFor="groupSize">How many in your group?</label>
        <div className="ctaRow ctaRowAlignCenter">
          <button type="button" className="buttonGhost" onClick={() => handleGroupStep(-1)} aria-label="Decrease group size">
            -
          </button>
          <input
            id="groupSize"
            type="number"
            min={0}
            max={30}
            className="inputLike inputField groupSizeInput"
            value={groupSize}
            onChange={(event) => setGroupSize(Number(event.target.value) || 0)}
          />
          <button type="button" className="buttonGhost" onClick={() => handleGroupStep(1)} aria-label="Increase group size">
            +
          </button>
        </div>
        <p className="subtle">Including yourself</p>
        {groupError ? (
          <p className="subtle errorText">
            {groupSize > 20 ? (
              <>
                For groups larger than 20, please{" "}
                <Link href="mailto:hello@tailormoments.com.au" className="textLinkUnderline">
                  get in touch
                </Link>
                {" - we'll arrange something special."}
              </>
            ) : (
              groupError
            )}
          </p>
        ) : null}
      </div>

      <div className="field">
        <label>What kind of day are you after?</label>
        <div className="choiceRow profileChoiceGrid">
          <label className="choicePill">
            <input type="radio" name="dayPace" checked={dayPace === "relaxed"} onChange={() => setDayPace("relaxed")} />
            Relaxed - 2-3 cellar doors, a long lunch, no rush
          </label>
          <label className="choicePill">
            <input type="radio" name="dayPace" checked={dayPace === "balanced"} onChange={() => setDayPace("balanced")} />
            The full experience - 3-4 cellar doors with lunch
          </label>
          <label className="choicePill">
            <input type="radio" name="dayPace" checked={dayPace === "maximise"} onChange={() => setDayPace("maximise")} />
            Maximise it - as many as we can comfortably fit, based on your tastes
          </label>
        </div>
      </div>

      <div className="field">
        <label>How many days touring?</label>
        <div className="choiceRow">
          {[1, 2, 3].map((days) => (
            <label key={days} className="choicePill">
              <input
                type="radio"
                name="tripDays"
                checked={tripDays === days}
                onChange={() => setTripDays(days)}
              />
              {days === 1 ? "1 day" : `${days} days`}
            </label>
          ))}
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
          <div className="field pickupAddressField">
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
              <div className="sectionCard autocompleteSuggestionPanel">
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
                        void resolvePlaceCoordinates(suggestion.placeId);
                        setShowAddressSuggestions(false);
                      }}
                    >
                      <p className="subtle">{suggestion.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            {pickupAddressError ? <p className="subtle errorText">{pickupAddressError}</p> : null}
          </div>
        ) : null}
      </div>

      <button type="button" className="buttonPrimary fullWidthButton" onClick={handleBegin}>
        {"Let's begin"}
      </button>
    </div>
  );
}
