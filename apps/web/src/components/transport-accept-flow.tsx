"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SectionCard } from "@/components/section-card";
import { acceptTransportToken, getBookingByToken, type BookingByTokenResponse } from "@/lib/live-api";

function humanizeNote(value: string) {
  return value.replace(/_/g, " ").trim();
}

function TransportSafetyNotesPanel({ booking }: { booking: BookingByTokenResponse }) {
  const accessibility = booking.accessibility_requirements ?? [];
  const hasNotes = accessibility.length > 0 || Boolean(booking.special_requests);

  return (
    <div className="callout">
      <p className="miniLabel">Run details</p>
      <p>
        <strong>{booking.lead_name}</strong> · {booking.booking_date} · {booking.party_size} guests · pickup {booking.pickup_location}
      </p>
      {hasNotes ? (
        <>
          {accessibility.length > 0 ? (
            <p><strong>Accessibility:</strong> {accessibility.map(humanizeNote).join(", ")}</p>
          ) : null}
          {booking.special_requests ? (
            <p><strong>Notes:</strong> {booking.special_requests}</p>
          ) : null}
        </>
      ) : (
        <p className="subtle">No accessibility or special transport requests were recorded for this run.</p>
      )}
    </div>
  );
}

export function TransportAcceptFlow() {
  const searchParams = useSearchParams();
  const initialToken = useMemo(() => searchParams.get("token") ?? "", [searchParams]);
  const [tokenId, setTokenId] = useState(initialToken);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ status: string; booking_id: string; token_id: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bookingDetails, setBookingDetails] = useState<BookingByTokenResponse | null>(null);

  useEffect(() => {
    const trimmed = tokenId.trim();
    if (!trimmed) {
      setBookingDetails(null);
      return;
    }

    let active = true;
    void (async () => {
      try {
        const details = await getBookingByToken(trimmed);
        if (active) {
          setBookingDetails(details);
        }
      } catch {
        if (active) {
          setBookingDetails(null);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [tokenId]);

  async function handleAccept() {
    if (!tokenId.trim()) {
      setError("Transport token is missing.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await acceptTransportToken(tokenId.trim());
      setResult(response);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to accept this job.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="actionPageShell">
      <SectionCard
        title="Accept this transport job"
        description="A driver or operator should be able to make the decision from one mobile screen."
      >
        <div className="actionCardStack">
          <div className="callout">
            <p className="miniLabel">Direct dispatch</p>
            <p>
              Accept this Tailor Moments run and lock in the transport leg for the associated winery itinerary.
            </p>
          </div>

          <div className="field">
            <label htmlFor="transportToken">Transport token</label>
            <input id="transportToken" className="inputLike inputField" value={tokenId} onChange={(event) => setTokenId(event.target.value)} placeholder="Paste or open a link containing the token" />
          </div>

          {bookingDetails ? <TransportSafetyNotesPanel booking={bookingDetails} /> : null}

          <button type="button" className="buttonPrimary fullWidthButton" onClick={handleAccept} disabled={submitting}>
            {submitting ? "Accepting..." : "Accept job"}
          </button>

          {result ? (
            <div className="callout successCallout">
              <strong>Job accepted.</strong> Booking <strong>{result.booking_id}</strong> is now marked as accepted for transport allocation.
            </div>
          ) : null}

          {error ? <div className="callout errorCallout">{error}</div> : null}

          <div className="partnerFooterNote">
            <p className="subtle">
              If this route no longer suits your fleet, let Tailor Moments know and the job can be reassigned quickly.
            </p>
            <Link href="/" className="buttonGhost">Return to Tailor Moments</Link>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
