"use client";

import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { useDemoState } from "@/lib/demo-state";

function statusClass(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

export default function OpsPage() {
  const {
    activeBooking,
    bookings,
    cannedTransportJobs,
    liveTransportJob,
    request,
    selectedPlan,
    wineries,
  } = useDemoState();

  const dispatchJobs = liveTransportJob ? [liveTransportJob, ...cannedTransportJobs] : cannedTransportJobs;
  const manualReviewSelected =
    selectedPlan?.stops.filter(
      (stop) => wineries.find((winery) => winery.id === stop.wineryId)?.status === "Manual review",
    ) ?? [];

  return (
    <AppShell
      eyebrow="Operations view"
      title="Your team gets one place to monitor the day and fix issues before they become phone calls."
      intro="This is the heart of the business model: multiple enquiries, winery settings, and transport planning now line up in one shared operational timeline."
    >
      <SectionCard
        title="Booking board"
        description="This is the working queue your tour business would manage day to day."
      >
        <div className="summaryRibbon bookingRibbon">
          {bookings.map((booking) => (
            <div key={booking.id} className={`summaryChip bookingChip ${booking.id === activeBooking?.id ? "active" : ""}`}>
              <span className="miniLabel">{booking.stage}</span>
              <strong>{booking.label}</strong>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="statsGrid">
        <div className="statCard">
          <p className="statLabel">Bookings in play</p>
          <p className="statValue">{bookings.length}</p>
          <p className="statHint">Live enquiries currently tracked in the planning board.</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Pending winery review</p>
          <p className="statValue">{manualReviewSelected.length}</p>
          <p className="statHint">Current itinerary stops that still need partner confirmation.</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Open transport jobs</p>
          <p className="statValue">{dispatchJobs.filter((job) => job.status === "Open").length}</p>
          <p className="statHint">Includes the active route generated from the selected enquiry.</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Auto-confirm venues</p>
          <p className="statValue">{wineries.filter((winery) => winery.status === "Auto-confirm").length}</p>
          <p className="statHint">This number changes as winery settings are adjusted.</p>
        </div>
      </div>

      <div className="grid two">
        <SectionCard
          title="Live itinerary view"
          description="This is how your team explains the trip to a customer, winery, or driver without switching systems."
        >
          <div className="callout">
            Active enquiry: <strong>{activeBooking?.label}</strong> on <strong>{request.date}</strong>, pickup from <strong>{request.pickup}</strong> for <strong>{request.partySize}</strong> guests.
          </div>
          <div className="timeline">
            {selectedPlan?.stops.map((stop) => (
              <div key={stop.wineryId} className="timelineItem">
                <div className="timelineTime">{stop.arrival}</div>
                <div>
                  <h3>{stop.wineryName}</h3>
                  <p className="subtle">Depart {stop.departure}. Transit from previous stop: {stop.driveFromPreviousMinutes} minutes.</p>
                </div>
              </div>
            ))}
          </div>
          <div className="callout">
            Transport window: <strong>{selectedPlan?.transportWindow}</strong>. Suggested assigned carrier: <strong>{liveTransportJob?.recommendedProvider}</strong>
          </div>
        </SectionCard>

        <SectionCard
          title="Operational queue"
          description="The queue now reflects both the selected booking and the winery rules set in the partner portal."
        >
          <div className="list">
            <div className="listRow">
              <div className="listTop">
                <div>
                  <h3>
                    {manualReviewSelected[0]?.wineryName
                      ? `Confirm ${manualReviewSelected[0].wineryName} tasting window`
                      : "No winery confirmation blockers"}
                  </h3>
                  <p className="subtle">
                    {manualReviewSelected[0]
                      ? `Manual-review partner needs approval for ${request.partySize} guests.`
                      : "The current itinerary is fully auto-confirmable with the active winery settings."}
                  </p>
                </div>
                <span className={`status ${manualReviewSelected[0] ? "review" : "accepted"}`}>
                  {manualReviewSelected[0] ? "Needs action" : "Clear"}
                </span>
              </div>
            </div>
            <div className="listRow">
              <div className="listTop">
                <div>
                  <h3>Post transport job {liveTransportJob?.id}</h3>
                  <p className="subtle">Live route is ready to publish once winery confirmations are locked.</p>
                </div>
                <span className="status ready">Ready</span>
              </div>
            </div>
            <div className="listRow">
              <div className="listTop">
                <div>
                  <h3>Send customer confirmation pack</h3>
                  <p className="subtle">Include itinerary, pickup instructions, and venue timing summary.</p>
                </div>
                <span className="status queued">Queued</span>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Dispatch board"
        description="A simple unified board is enough for the first production-minded iteration."
      >
        <div className="tableLike">
          <div className="tableRow tableHeader">
            <div>Job</div>
            <div>Route</div>
            <div>Pickup</div>
            <div>Pax</div>
            <div>Payout</div>
            <div>Status</div>
          </div>
          {dispatchJobs.map((job) => (
            <div key={job.id} className="tableRow">
              <div>{job.id}</div>
              <div>{job.routeLabel}</div>
              <div>{job.pickupTime}</div>
              <div>{job.passengers}</div>
              <div>{job.payout}</div>
              <div>
                <span className={`status ${statusClass(job.status)}`}>{job.status}</span>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </AppShell>
  );
}
