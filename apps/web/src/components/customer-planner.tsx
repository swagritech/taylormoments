"use client";

import { useMemo } from "react";
import { SectionCard } from "@/components/section-card";
import { pickupOptions } from "@/lib/demo-data";
import { useDemoState } from "@/lib/demo-state";
import { recommendedCarrier } from "@/lib/planning";

function stageClass(stage: string) {
  return stage.toLowerCase().replace(/[^a-z]+/g, "");
}

export function CustomerPlanner() {
  const {
    bookings,
    activeBookingId,
    createBooking,
    plans,
    request,
    setActiveBookingId,
    setDate,
    setGuestName,
    setPartySize,
    setPickup,
    toggleWinery,
    wineries,
  } = useDemoState();

  const carrier = useMemo(
    () => recommendedCarrier(request.partySize, request.pickup),
    [request.partySize, request.pickup],
  );

  return (
    <>
      <SectionCard
        title="Live planning state"
        description="Switch between enquiries, create new bookings, and keep the rest of the product in sync."
      >
        <div className="toolbarRow">
          <div className="summaryRibbon bookingRibbon">
            {bookings.map((booking) => (
              <button
                key={booking.id}
                type="button"
                className={`summaryChip bookingChip ${booking.id === activeBookingId ? "active" : ""}`}
                onClick={() => setActiveBookingId(booking.id)}
              >
                <span className="miniLabel">{booking.stage}</span>
                <strong>{booking.label}</strong>
              </button>
            ))}
          </div>
          <button type="button" className="buttonPrimary" onClick={createBooking}>
            New enquiry
          </button>
        </div>
      </SectionCard>

      <div className="splitPanel">
        <SectionCard
          title="Booking request"
          description="Adjust the active enquiry live during meetings and let the itinerary respond."
        >
          <div className="formPreview">
            <div className="field">
              <label htmlFor="guestName">Lead guest</label>
              <input
                id="guestName"
                className="inputLike inputField"
                value={request.guestName}
                onChange={(event) => setGuestName(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="date">Preferred date</label>
              <input
                id="date"
                className="inputLike inputField"
                value={request.date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="pickup">Pickup location</label>
              <select
                id="pickup"
                className="inputLike inputField"
                value={request.pickup}
                onChange={(event) => setPickup(event.target.value)}
              >
                {pickupOptions.map((option) => (
                  <option key={option.id} value={option.label}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="subtle">
                {pickupOptions.find((option) => option.label === request.pickup)?.note}
              </p>
            </div>
            <div className="field">
              <label htmlFor="partySize">Party size</label>
              <select
                id="partySize"
                className="inputLike inputField"
                value={request.partySize}
                onChange={(event) => setPartySize(Number(event.target.value))}
              >
                {[2, 4, 6, 8, 10, 12].map((size) => (
                  <option key={size} value={size}>
                    {size} guests
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Requested wineries</label>
              <div className="selectorList">
                {wineries.map((winery) => {
                  const selected = request.wineries.includes(winery.id);

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
                        <span className={`status ${selected ? "accepted" : "review"}`}>
                          {selected ? "Selected" : "Optional"}
                        </span>
                      </div>
                      <div className="metaRow">
                        <span className="meta">{winery.tastingDurationMinutes} min tasting</span>
                        <span className="meta">Capacity {winery.capacity}</span>
                        <span className={`status ${stageClass(winery.status)}`}>{winery.status}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="subtle">
                Keep at least 2 wineries selected so the planner can assemble a full day.
              </p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Generated itinerary options"
          description="These options update immediately from the live Margaret River planning state."
        >
          <div className="list">
            {plans.map((plan) => (
              <div key={plan.title} className="listRow">
                <div className="listTop">
                  <div>
                    <h3>{plan.title}</h3>
                    <p className="subtle">{plan.summary}</p>
                  </div>
                  <span className="status accepted">{plan.score}% fit</span>
                </div>
                <div className="metaRow">
                  <span className="meta">{plan.totalDriveMinutes} min drive time</span>
                  <span className="meta">Transport window {plan.transportWindow}</span>
                </div>
                <div className="timeline">
                  {plan.stops.map((stop) => (
                    <div key={`${plan.title}-${stop.wineryId}`} className="timelineItem">
                      <div className="timelineTime">{stop.arrival}</div>
                      <div>
                        <h3>{stop.wineryName}</h3>
                        <p className="subtle">
                          Depart {stop.departure} after tasting. Transit from previous stop: {stop.driveFromPreviousMinutes} minutes.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="callout">
              Suggested carrier for this request: <strong>{carrier?.name}</strong>. {carrier?.fleet}
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Why this matters in the meeting"
        description="This screen now helps you pressure-test multiple real enquiries instead of talking about a fixed mockup."
      >
        <div className="grid three">
          <div className="miniCard">
            <p className="miniLabel">Ask wineries</p>
            <p className="subtle">Which venues should stay manual review for larger groups or premium dates?</p>
          </div>
          <div className="miniCard">
            <p className="miniLabel">Ask transporters</p>
            <p className="subtle">Which pickup zones change pricing or minimum notice in Margaret River?</p>
          </div>
          <div className="miniCard">
            <p className="miniLabel">Ask both</p>
            <p className="subtle">Does this booking list feel like the right shared operating model for a busy week?</p>
          </div>
        </div>
      </SectionCard>
    </>
  );
}
