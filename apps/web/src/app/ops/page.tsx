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
      eyebrow="Operations"
      title="Run the booking day from one board"
      intro="Track active bookings, approvals, and transport readiness. Focus only on items that need intervention."
    >
      <div className="statsGrid">
        <div className="statCard">
          <p className="statLabel">Active bookings</p>
          <p className="statValue">{bookings.length}</p>
          <p className="statHint">Current enquiries in today&apos;s working set.</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Awaiting winery</p>
          <p className="statValue">{manualReviewSelected.length}</p>
          <p className="statHint">Stops needing manual winery confirmation.</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Open transport jobs</p>
          <p className="statValue">{dispatchJobs.filter((job) => job.status === "Open").length}</p>
          <p className="statHint">Jobs still waiting for transport acceptance.</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Auto-confirm wineries</p>
          <p className="statValue">{wineries.filter((winery) => winery.status === "Auto-confirm").length}</p>
          <p className="statHint">Venues currently processing confirmations automatically.</p>
        </div>
      </div>

      <div className="grid two">
        <SectionCard
          title="Booking queue"
          description="Current booking progression."
        >
          <div className="summaryRibbon bookingRibbon">
            {bookings.map((booking) => (
              <div key={booking.id} className={`summaryChip bookingChip ${booking.id === activeBooking?.id ? "active" : ""}`}>
                <span className="miniLabel">{booking.stage}</span>
                <strong>{booking.label}</strong>
              </div>
            ))}
          </div>

          <div className="callout" style={{ marginTop: 14 }}>
            Active booking <strong>{activeBooking?.label}</strong> on <strong>{request.date}</strong> from <strong>{request.pickup}</strong> for <strong>{request.partySize}</strong> guests.
          </div>
        </SectionCard>

        <SectionCard
          title="Exception queue"
          description="Only items requiring manual action."
        >
          <div className="list compactList">
            <div className="listRow">
              <div className="listTop">
                <div>
                  <h3>Winery confirmations</h3>
                  <p className="subtle">
                    {manualReviewSelected.length > 0
                      ? `${manualReviewSelected.length} stops waiting for manual confirmation.`
                      : "No winery confirmation blockers for the active itinerary."}
                  </p>
                </div>
                <span className={`status ${manualReviewSelected.length > 0 ? "review" : "accepted"}`}>
                  {manualReviewSelected.length > 0 ? "Needs action" : "Clear"}
                </span>
              </div>
            </div>
            <div className="listRow">
              <div className="listTop">
                <div>
                  <h3>Transport dispatch</h3>
                  <p className="subtle">Publish open jobs once winery confirmations are complete.</p>
                </div>
                <span className="status ready">Ready</span>
              </div>
            </div>
            <div className="listRow">
              <div className="listTop">
                <div>
                  <h3>Customer notification</h3>
                  <p className="subtle">Send final itinerary and pickup instructions after confirmations.</p>
                </div>
                <span className="status queued">Queued</span>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Active itinerary"
        description="Timeline currently planned for the selected booking."
      >
        <div className="timeline">
          {selectedPlan?.stops.map((stop) => (
            <div key={stop.wineryId} className="timelineItem">
              <div className="timelineTime">{stop.arrival}</div>
              <div>
                <h3>{stop.wineryName}</h3>
                <p className="subtle">Depart {stop.departure}. Drive from prior stop: {stop.driveFromPreviousMinutes} mins.</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Dispatch board"
        description="Current transport jobs and status."
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
