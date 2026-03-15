"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { useDemoState } from "@/lib/demo-state";
import { useAuth } from "@/lib/auth-state";

function transportStatusClass(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

export function PartnerTransportPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { activeBooking, cannedTransportJobs, liveTransportJob, request } = useDemoState();
  const jobs = liveTransportJob ? [liveTransportJob, ...cannedTransportJobs] : cannedTransportJobs;

  useEffect(() => {
    if (loading || !user) {
      return;
    }
    if (user.role === "winery") {
      router.replace("/partner/wineries");
    } else if (user.role === "customer") {
      router.replace("/customer");
    }
  }, [loading, router, user]);

  if (!loading && !user) {
    return (
      <AppShell eyebrow="Partner portal" title="Transport access" intro="Log in with a transport or ops account." navMode="partner" showWorkflowStatus={false}>
        <div className="actionPageShell">
          <SectionCard title="Sign in required">
            <div className="ctaRow">
              <Link href="/login" className="buttonPrimary">Log in</Link>
            </div>
          </SectionCard>
        </div>
      </AppShell>
    );
  }

  if (!loading && user && user.role !== "transport" && user.role !== "ops") {
    return (
      <AppShell eyebrow="Partner portal" title="Transport access" intro="This page is restricted to transport and ops users." navMode="partner" showWorkflowStatus={false}>
        <SectionCard title="Permission required" description="Use a transport or ops account to view this page.">
          <p className="subtle">Your current account does not have transport access.</p>
        </SectionCard>
      </AppShell>
    );
  }

  return (
    <AppShell
      eyebrow="Transport"
      title="Transport job marketplace"
      intro="Review open jobs, confirm route suitability, and move accepted jobs into dispatch."
      navMode="partner"
    >
      <div className="statsGrid">
        <div className="statCard">
          <p className="statLabel">Open jobs</p>
          <p className="statValue">{jobs.filter((job) => job.status === "Open").length}</p>
          <p className="statHint">Jobs currently available for acceptance.</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Assigned jobs</p>
          <p className="statValue">{jobs.filter((job) => job.status !== "Open").length}</p>
          <p className="statHint">Jobs already accepted or in planning.</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Active enquiry</p>
          <p className="statValue">{activeBooking?.label ?? "-"}</p>
          <p className="statHint">Booking currently driving the first live job.</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Pickup area</p>
          <p className="statValue">{request.pickup}</p>
          <p className="statHint">Current pickup zone for route planning.</p>
        </div>
      </div>

      <div className="grid two">
        <SectionCard
          title="Carrier roster"
          description="Active transport partners and fleet profile."
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
          title="Open jobs"
          description="Jobs generated from confirmed or near-confirmed itineraries."
        >
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
                  {index === 0 && job.id.startsWith("TM-") ? "Live recommendation" : "Recommended provider"}: <strong>{job.recommendedProvider}</strong>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
