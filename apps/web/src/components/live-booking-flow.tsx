"use client";

import { useMemo, useState } from "react";
import { SectionCard } from "@/components/section-card";
import { TurnstileWidget } from "@/components/turnstile-widget";
import { pickupOptions, wineries } from "@/lib/demo-data";
import {
  createBooking,
  createWineryApprovalToken,
  formatDisplayTime,
  recommendItineraries,
  type BookingResponse,
  type Recommendation,
  type TokenResponse,
} from "@/lib/live-api";

const defaultDate = "2026-04-10";

function wineryById(id: string) {
  return wineries.find((winery) => winery.id === id);
}

function uuidForWinerySlug(slug: string) {
  switch (slug) {
    case "leeuwin-coast":
      return "11111111-1111-1111-1111-111111111111";
    case "redgate-ridge":
      return "22222222-2222-2222-2222-222222222222";
    case "caves-road-cellars":
      return "33333333-3333-3333-3333-333333333333";
    case "yallingup-hills":
      return "44444444-4444-4444-4444-444444444444";
    default:
      return slug;
  }
}

export function LiveBookingFlow() {
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  const [leadPhone, setLeadPhone] = useState("");
  const [bookingDate, setBookingDate] = useState(defaultDate);
  const [pickupLocation, setPickupLocation] = useState(pickupOptions[0]?.label ?? "Margaret River Visitor Centre");
  const [partySize, setPartySize] = useState(4);
  const [selectedWineries, setSelectedWineries] = useState<string[]>([wineries[0]?.id ?? "", wineries[1]?.id ?? ""].filter(Boolean));
  const [requesting, setRequesting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | undefined>();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [approvalToken, setApprovalToken] = useState<TokenResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [noOptionsMessage, setNoOptionsMessage] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);

  const expertPick = recommendations.find((option) => option.expert_pick) ?? recommendations[0];
  const alternateOptions = expertPick ? recommendations.filter((option) => option.itinerary_id !== expertPick.itinerary_id) : [];

  const selectedRegion = useMemo(() => {
    const primary = wineryById(selectedWineries[0]);
    return primary?.region;
  }, [selectedWineries]);

  function toggleWinery(wineryId: string) {
    setSelectedWineries((current) => {
      if (current.includes(wineryId)) {
        return current.length > 1 ? current.filter((id) => id !== wineryId) : current;
      }

      return [...current, wineryId];
    });
  }

  async function handleRecommend() {
    setRequesting(true);
    setError(null);
    setNoOptionsMessage(null);
    setBooking(null);
    setApprovalToken(null);

    try {
      const response = await recommendItineraries({
        booking_date: bookingDate,
        pickup_location: pickupLocation,
        party_size: partySize,
        preferred_region: selectedRegion,
        preferred_wineries: selectedWineries.map(uuidForWinerySlug),
      });

      setRecommendations(response.itineraries);
      if (response.itineraries.length === 0) {
        setNoOptionsMessage(
          "No available itinerary was found for this date and party size. Try 2026-04-10 or adjust guest count/wineries.",
        );
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to generate recommendations.");
    } finally {
      setRequesting(false);
    }
  }

  async function handleBook(selectedRecommendation: Recommendation) {
    if (!leadName.trim()) {
      setError("Please add the lead guest name before requesting the trip.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const created = await createBooking({
        lead_name: leadName,
        lead_email: leadEmail || undefined,
        lead_phone: leadPhone || undefined,
        booking_date: bookingDate,
        pickup_location: pickupLocation,
        party_size: partySize,
        preferred_region: selectedRegion,
        preferred_wineries: selectedWineries.map(uuidForWinerySlug),
        turnstile_token: turnstileToken,
      });

      setBooking(created);

      const firstStop = selectedRecommendation.stops[0];
      if (firstStop?.winery_id) {
        const token = await createWineryApprovalToken(created.bookingId, firstStop.winery_id);
        setApprovalToken(token);
      } else {
        setApprovalToken(null);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to request this trip.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="splitPanel bookingExperience">
        <SectionCard
          title="Plan a tailored day"
          description="Capture a real guest request, generate ranked options, and submit the booking into the live Tailor Moments API."
        >
          <div className="formPreview">
            <div className="field">
              <label htmlFor="leadName">Lead guest</label>
              <input id="leadName" className="inputLike inputField" value={leadName} onChange={(event) => setLeadName(event.target.value)} placeholder="Olivia Harper" />
            </div>
            <div className="fieldRow">
              <div className="field">
                <label htmlFor="leadEmail">Email</label>
                <input id="leadEmail" type="email" className="inputLike inputField" value={leadEmail} onChange={(event) => setLeadEmail(event.target.value)} placeholder="olivia@example.com" />
              </div>
              <div className="field">
                <label htmlFor="leadPhone">Phone</label>
                <input id="leadPhone" className="inputLike inputField" value={leadPhone} onChange={(event) => setLeadPhone(event.target.value)} placeholder="0400 000 000" />
              </div>
            </div>
            <div className="fieldRow">
              <div className="field">
                <label htmlFor="bookingDate">Preferred date</label>
                <input id="bookingDate" type="date" className="inputLike inputField" value={bookingDate} onChange={(event) => setBookingDate(event.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="partySize">Party size</label>
                <select id="partySize" className="inputLike inputField" value={partySize} onChange={(event) => setPartySize(Number(event.target.value))}>
                  {[2, 4, 6, 8, 10, 12].map((size) => (
                    <option key={size} value={size}>{size} guests</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field">
              <label htmlFor="pickupLocation">Pickup location</label>
              <select id="pickupLocation" className="inputLike inputField" value={pickupLocation} onChange={(event) => setPickupLocation(event.target.value)}>
                {pickupOptions.map((option) => (
                  <option key={option.id} value={option.label}>{option.label}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Preferred wineries</label>
              <div className="selectorList">
                {wineries.map((winery) => {
                  const selected = selectedWineries.includes(winery.id);
                  return (
                    <button
                      key={winery.id}
                      type="button"
                      className={`selectorCard ${selected ? "selected" : ""}`}
                      onClick={() => toggleWinery(winery.id)}
                    >
                      <div className="listTop">
                        <div>
                          <strong>{winery.name}</strong>
                          <p className="subtle">{winery.region}</p>
                        </div>
                        <span className={`status ${selected ? "accepted" : "review"}`}>{selected ? "Selected" : "Add"}</span>
                      </div>
                      <div className="metaRow">
                        <span className="meta">{winery.tastingDurationMinutes} min tasting</span>
                        <span className="meta">Capacity {winery.capacity}</span>
                        <span className={`status ${winery.status.toLowerCase().replace(/[^a-z]+/g, "")}`}>{winery.status}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="ctaRow">
              <button type="button" className="buttonPrimary" onClick={handleRecommend} disabled={requesting || selectedWineries.length === 0}>
                {requesting ? "Finding options..." : "Find recommended day"}
              </button>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Recommended for this guest"
          description="Lead with one strong suggestion, then keep secondary options available without overwhelming the guest."
        >
          {expertPick ? (
            <div className="recommendationStack">
              <div className="expertPickCard">
                <div className="listTop">
                  <div>
                    <p className="miniLabel">Tailor Moments Expert Pick</p>
                    <h3>{expertPick.label}</h3>
                    <p className="subtle">{expertPick.justification}</p>
                  </div>
                  <span className="status ready">{expertPick.score}% fit</span>
                </div>
                <div className="timeline compactTimeline">
                  {expertPick.stops.map((stop) => (
                    <div key={stop.winery_id} className="timelineItem">
                      <div className="timelineTime">{formatDisplayTime(stop.arrival_time)}</div>
                      <div>
                        <h3>{stop.winery_name}</h3>
                        <p className="subtle">
                          Depart {formatDisplayTime(stop.departure_time)} after a {stop.drive_minutes}-minute drive.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <TurnstileWidget
                  action="request_quote"
                  label="Protects the live request flow from spam once Turnstile is configured."
                  onToken={setTurnstileToken}
                />
                <button type="button" className="buttonPrimary fullWidthButton" onClick={() => handleBook(expertPick)} disabled={submitting}>
                  {submitting ? "Submitting request..." : "Book this trip"}
                </button>
              </div>

              {alternateOptions.length > 0 ? (
                <div className="alternateBlock">
                  <button type="button" className="buttonGhost" onClick={() => setShowMore((current) => !current)}>
                    {showMore ? "Hide alternate options" : "Show more options"}
                  </button>
                  {showMore ? (
                    <div className="list compactList">
                      {alternateOptions.map((option) => (
                        <div key={option.itinerary_id} className="listRow">
                          <div className="listTop">
                            <div>
                              <h3>{option.label}</h3>
                              <p className="subtle">{option.justification}</p>
                            </div>
                            <span className="status accepted">{option.score}% fit</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="emptyStateCard">
              <p className="miniLabel">Next step</p>
              <h3>Generate a recommendation</h3>
              <p className="subtle">Once you request options, the best itinerary will appear here as the featured path for the guest.</p>
            </div>
          )}

          {error ? <div className="callout errorCallout">{error}</div> : null}
          {noOptionsMessage ? <div className="callout">{noOptionsMessage}</div> : null}

          {booking ? (
            <div className="callout successCallout">
              <strong>Booking request received.</strong> Reference <strong>{booking.bookingId}</strong> has been saved to the live Tailor Moments workflow.
              {approvalToken ? (
                <>
                  <br />
                  First winery approval link: <a href={approvalToken.action_url}>{approvalToken.action_url}</a>
                </>
              ) : null}
            </div>
          ) : null}
        </SectionCard>
      </div>
    </>
  );
}
