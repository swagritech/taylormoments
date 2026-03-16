"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { createBooking, formatDisplayTime, type BookingResponse } from "@/lib/live-api";
import { loadExploreTourSummary } from "@/lib/explore-tour-summary";

export default function ExploreSummaryPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const summary = useMemo(() => loadExploreTourSummary(), []);

  const pricing = useMemo(() => {
    if (!summary) {
      return { subtotal: 0, pricedStops: 0, missingStops: 0 };
    }

    let subtotal = 0;
    let pricedStops = 0;
    let missingStops = 0;
    for (const stop of summary.stops) {
      if (typeof stop.tasting_price === "number") {
        subtotal += stop.tasting_price;
        pricedStops += 1;
      } else {
        missingStops += 1;
      }
    }

    return { subtotal, pricedStops, missingStops };
  }, [summary]);

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
      intro="Review your itinerary and pricing before booking, or customize the winery list in Plan."
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
              <div className="schedulePreviewCard">
                {summary.stops.map((stop, index) => (
                  <div key={`${stop.winery_id}-${index}`} className="tourSummaryRow">
                    <div>
                      <p className="timelineTime">{formatDisplayTime(stop.arrival_time)}</p>
                      <h3>{stop.winery_name}</h3>
                      <p className="subtle">Depart {formatDisplayTime(stop.departure_time)}</p>
                    </div>
                    <div className="tourSummaryPrice">
                      {typeof stop.tasting_price === "number" ? `$${stop.tasting_price}` : "Tasting fee TBD"}
                    </div>
                  </div>
                ))}
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
                <button type="button" className="buttonGhost" onClick={() => router.push("/plan")}>
                  Customize in Plan
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
            </SectionCard>
          </>
        )}
      </div>
    </AppShell>
  );
}
