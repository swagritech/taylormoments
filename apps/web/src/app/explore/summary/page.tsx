"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ExploreSummaryMap } from "@/components/explore-summary-map";
import { SectionCard } from "@/components/section-card";
import { createBooking, formatDisplayTime, type BookingResponse } from "@/lib/live-api";
import { loadExploreTourSummary } from "@/lib/explore-tour-summary";
import { useRemoteWineryProfiles, type RemoteWineryProfile } from "@/lib/remote-winery-profiles";
import { wineryCatalog } from "@/lib/winery-catalog";
import { slugToWineryUuid } from "@/lib/winery-id";

export default function ExploreSummaryPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const summary = useMemo(() => loadExploreTourSummary(), []);
  const { profilesById } = useRemoteWineryProfiles();

  const orderedSummaryStops = useMemo(() => {
    if (!summary) {
      return [];
    }

    const stopsByUuid = new Map(summary.stops.map((stop) => [stop.winery_id, stop]));
    const stopsByName = new Map(summary.stops.map((stop) => [stop.winery_name.trim().toLowerCase(), stop]));
    const fallbackBySlug = new Map(wineryCatalog.map((entry) => [entry.id, entry] as const));

    if (summary.matched_winery_ids.length === 0) {
      return summary.stops;
    }

    return summary.matched_winery_ids.map((slug) => {
      const wineryUuid = slugToWineryUuid(slug);
      const existingStop = stopsByUuid.get(wineryUuid);
      if (existingStop) {
        return existingStop;
      }

      const fallbackCatalog = fallbackBySlug.get(slug);
      const fallbackName = fallbackCatalog?.name?.trim().toLowerCase() ?? "";
      const fallbackStop = fallbackName ? stopsByName.get(fallbackName) : undefined;
      if (fallbackStop) {
        return {
          ...fallbackStop,
          winery_id: wineryUuid,
        };
      }

      return {
        winery_id: wineryUuid,
        winery_name: fallbackCatalog?.name ?? slug,
        arrival_time: "",
        departure_time: "",
        drive_minutes: 0,
      };
    });
  }, [summary]);

  const pricing = useMemo(() => {
    if (!summary) {
      return { subtotal: 0, pricedStops: 0, missingStops: 0 };
    }

    let subtotal = 0;
    let pricedStops = 0;
    let missingStops = 0;
    for (const stop of orderedSummaryStops) {
      const profile = profilesById[stop.winery_id];
      const tastingPrice = profile?.tasting_price ?? stop.tasting_price;
      if (typeof tastingPrice === "number") {
        subtotal += tastingPrice;
        pricedStops += 1;
      } else {
        missingStops += 1;
      }
    }

    return { subtotal, pricedStops, missingStops };
  }, [orderedSummaryStops, profilesById, summary]);

  const routeMapStops = useMemo(() => {
    if (!summary) {
      return [];
    }

    const normalizedNameToProfile = new Map<string, RemoteWineryProfile>();
    for (const profile of Object.values(profilesById)) {
      normalizedNameToProfile.set(profile.name.trim().toLowerCase(), profile);
    }
    const slugToProfile = new Map<string, RemoteWineryProfile>();
    for (const winery of wineryCatalog) {
      const profile = profilesById[slugToWineryUuid(winery.id)];
      if (profile) {
        slugToProfile.set(winery.id, profile);
      }
    }

    function resolveProfileForStop(stop: { winery_id: string; winery_name: string }): RemoteWineryProfile | undefined {
      const byUuid = profilesById[stop.winery_id];
      if (byUuid) {
        return byUuid;
      }
      const bySlug = slugToProfile.get(stop.winery_id);
      if (bySlug) {
        return bySlug;
      }
      const stopName = stop.winery_name.trim().toLowerCase();
      return normalizedNameToProfile.get(stopName);
    }

    const normalizedNameToCatalog = new Map(
      wineryCatalog.map((entry) => [entry.name.trim().toLowerCase(), entry] as const),
    );
    const slugToCatalog = new Map(wineryCatalog.map((entry) => [entry.id, entry] as const));

    function resolveCatalogForStop(stop: { winery_id: string; winery_name: string }) {
      const bySlug = slugToCatalog.get(stop.winery_id);
      if (bySlug) {
        return bySlug;
      }
      const byUuid = wineryCatalog.find((entry) => slugToWineryUuid(entry.id) === stop.winery_id);
      if (byUuid) {
        return byUuid;
      }
      return normalizedNameToCatalog.get(stop.winery_name.trim().toLowerCase());
    }

    return orderedSummaryStops
      .map((stop) => {
        const winery = resolveProfileForStop(stop);
        const catalogFallback = resolveCatalogForStop(stop);
        const latitude = winery?.latitude ?? catalogFallback?.latitude;
        const longitude = winery?.longitude ?? catalogFallback?.longitude;
        const hasCoordinates =
          typeof latitude === "number" &&
          Number.isFinite(latitude) &&
          typeof longitude === "number" &&
          Number.isFinite(longitude);
        if (!hasCoordinates) {
          return null;
        }
        return {
          winery_id: stop.winery_id,
          winery_name: stop.winery_name,
          address: winery?.address ?? catalogFallback?.address,
          latitude,
          longitude,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }, [orderedSummaryStops, profilesById, summary]);

  const stopsMissingCoordinates = useMemo(() => {
    if (!summary) {
      return 0;
    }
    return Math.max(orderedSummaryStops.length - routeMapStops.length, 0);
  }, [orderedSummaryStops.length, routeMapStops.length, summary]);

  function formatDisplayTimeSafe(value: string) {
    if (!value) {
      return "";
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }
    return formatDisplayTime(value);
  }

  async function handleBook() {
    if (!summary) {
      return;
    }

    if (!summary.lead_name.trim() || !summary.lead_email.trim()) {
      setError("Please return to Explore and add name and email before booking.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const created = await createBooking({
        lead_name: summary.lead_name.trim(),
        lead_email: summary.lead_email.trim(),
        booking_date: summary.preview_date,
        preferred_start_time: summary.preferred_start_time,
        preferred_end_time: summary.preferred_end_time,
        pickup_location: summary.pickup_location,
        party_size: summary.party_size,
        preferred_wineries: summary.stops.map((stop) => stop.winery_id),
      });
      setBooking(created);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create booking.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      eyebrow="Explore"
      title="Tour summary"
      intro="Review your itinerary and pricing before booking, or customise the winery list in Plan."
      showWorkflowStatus={false}
      navMode="public"
    >
      <div className="exploreLayout">
        {!summary ? (
          <SectionCard title="No tour summary yet" description="Generate an itinerary in Explore first.">
            <div className="ctaRow">
              <button type="button" className="buttonPrimary" onClick={() => router.push("/explore")}>
                Back to Explore
              </button>
            </div>
          </SectionCard>
        ) : (
          <>
            <SectionCard
              title="Itinerary and tasting fees"
              description={`Preview date ${summary.preview_date} - ${summary.party_size} guests`}
            >
              <div className="summaryPageSplit">
                <div className="summaryPageLeft">
                  <div className="schedulePreviewCard">
                    {orderedSummaryStops.map((stop, index) => {
                      const arrival = formatDisplayTimeSafe(stop.arrival_time);
                      const departure = formatDisplayTimeSafe(stop.departure_time);
                      const profile = profilesById[stop.winery_id];
                      const tastingPrice = profile?.tasting_price ?? stop.tasting_price;
                      return (
                      <div key={`${stop.winery_id}-${index}`} className="tourSummaryRow">
                        <div>
                          {arrival ? <p className="timelineTime">{arrival}</p> : null}
                          <h3>{stop.winery_name}</h3>
                          {departure ? (
                            <p className="subtle">Depart {departure}</p>
                          ) : (
                            <p className="subtle">Time to be confirmed during scheduling.</p>
                          )}
                        </div>
                        <div className="tourSummaryPrice">
                          {typeof tastingPrice === "number" ? `$${tastingPrice}` : "Tasting fee TBD"}
                        </div>
                      </div>
                    )})}
                  </div>
                  <div className="callout">
                    <p>
                      <strong>Tasting subtotal:</strong> ${pricing.subtotal.toFixed(2)}
                    </p>
                    <p className="subtle">
                      {pricing.pricedStops} priced stop(s), {pricing.missingStops} stop(s) without published tasting price.
                    </p>
                    <p className="subtle">
                      Transport fees and special winery experiences will be added in a later phase.
                    </p>
                  </div>
                  <div className="ctaRow">
                    <button type="button" className="buttonGhost" onClick={() => router.push("/custom")}>
                      Customise itinerary
                    </button>
                    <button type="button" className="buttonPrimary" onClick={handleBook} disabled={submitting}>
                      {submitting ? "Booking..." : "Book tour"}
                    </button>
                  </div>
                  {booking ? (
                    <div className="callout successCallout">
                      Booking created. Reference <strong>{booking.bookingId}</strong>.
                    </div>
                  ) : null}
                  {error ? <div className="callout errorCallout">{error}</div> : null}
                </div>
                <div className="summaryPageRight">
                  <div className="summaryMapCard">
                    <h3>Selected winery map</h3>
                    <p className="subtle">
                      House pin marks your starting location. Numbered pins are ordered by stop sequence.
                    </p>
                    <ExploreSummaryMap stops={routeMapStops} pickupLocation={summary.pickup_location} />
                    {stopsMissingCoordinates > 0 ? (
                      <p className="subtle">
                        {stopsMissingCoordinates} stop(s) are missing coordinates and are not yet shown on the map.
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </SectionCard>
          </>
        )}
      </div>
    </AppShell>
  );
}
