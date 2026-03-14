"use client";

import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { useDemoState } from "@/lib/demo-state";

function transportStatusClass(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

export default function TransportPage() {
  const { activeBooking, cannedTransportJobs, liveTransportJob, request } = useDemoState();
  const jobs = liveTransportJob ? [liveTransportJob, ...cannedTransportJobs] : cannedTransportJobs;

  return (
    <AppShell
      eyebrow="Transport board"
      title="Carriers can inspect routes and decide quickly whether a job suits them."
      intro="The transport board now reacts to the active booking, so dispatch can evaluate live routes while keeping sight of the rest of the day."
    >
      <div className="grid two">
        <SectionCard
          title="Carrier roster"
          description="Seeded operators to make the marketplace feel active."
        >
          <div className="list">
            {[
              ["Cape to Vine Transfers", "Margaret River, Wilyabrup, Yallingup", "Available", "2 x 11-seat Mercedes vans", "4.9"],
              ["Forest Coast Shuttle", "Town, coast, and lunch-transfer runs", "Busy soon", "Mini bus + executive SUV", "4.7"],
              ["South West Charters", "Corporate groups and private wine tours", "Available", "14-seat midi coach", "4.8"],
            ].map(([name, area, status, fleet, rating]) => (
              <div key={name} className="listRow">
                <div className="listTop">
                  <div>
                    <h3>{name}</h3>
                    <p className="subtle">{area}</p>
                  </div>
                  <span className={`status ${transportStatusClass(status)}`}>{status}</span>
                </div>
                <div className="metaRow">
                  <span className="meta">{fleet}</span>
                  <span className="meta">Rating {rating}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Open transport jobs"
          description="Marketplace-style jobs generated from confirmed winery itineraries."
        >
          <div className="callout">
            Active enquiry: <strong>{activeBooking?.label}</strong>. Changing the planner or winery settings updates the first job below.
          </div>
          <div className="list">
            {jobs.map((job, index) => (
              <div key={job.id} className="listRow">
                <div className="listTop">
                  <div>
                    <h3>{job.id}</h3>
                    <p className="subtle">{job.routeLabel}</p>
                  </div>
                  <span className={`status ${transportStatusClass(job.status)}`}>{job.status}</span>
                </div>
                <div className="metaRow">
                  <span className="meta">{job.date}</span>
                  <span className="meta">Pickup {job.pickupTime}</span>
                  <span className="meta">{job.passengers} passengers</span>
                  <span className="meta">{job.vehicleType}</span>
                  <span className="meta">{job.payout}</span>
                </div>
                <div className="callout">
                  {index === 0 && job.id.startsWith("TM-") ? "Live job" : "Recommended match"}: <strong>{job.recommendedProvider}</strong>. Pickup zone is currently <strong>{request.pickup}</strong>.
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="What to validate with transport partners"
        description="Use these prompts while they look at the job board."
      >
        <div className="grid three">
          <div className="miniCard">
            <p className="miniLabel">Decision speed</p>
            <p className="subtle">Is the route, passenger count, and payout enough to accept a job?</p>
          </div>
          <div className="miniCard">
            <p className="miniLabel">Operational detail</p>
            <p className="subtle">Do they need timing per leg, contact details, or special notes visible here?</p>
          </div>
          <div className="miniCard">
            <p className="miniLabel">Commercial model</p>
            <p className="subtle">Should jobs be first-come-first-served, recommended, or offered to a shortlist first?</p>
          </div>
        </div>
      </SectionCard>
    </AppShell>
  );
}
