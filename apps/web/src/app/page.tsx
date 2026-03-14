import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import {
  sampleRequest,
  transportJobs,
  transportProviders,
  wineries,
} from "@/lib/demo-data";
import { buildItineraryPlans } from "@/lib/scheduler";

export default function Home() {
  const plans = buildItineraryPlans(sampleRequest, wineries);

  return (
    <AppShell
      eyebrow="Two-week MVP"
      title="Show the whole winery-tour workflow in one polished demo."
      intro="This MVP is designed to help you meet wineries and transport partners with something concrete: a customer booking journey, a winery-facing availability view, a transport job board, and a single internal operations dashboard."
    >
      <div className="statsGrid">
        <div className="statCard">
          <p className="statLabel">Participating wineries</p>
          <p className="statValue">{wineries.length}</p>
          <p className="statHint">Mix of auto-confirm and manual review partners.</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Transport providers</p>
          <p className="statValue">{transportProviders.length}</p>
          <p className="statHint">Marketplace-style assignment with recommended matches.</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Demo itinerary score</p>
          <p className="statValue">{plans[0]?.score}%</p>
          <p className="statHint">Convenience score from sample itinerary logic.</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Open transport work</p>
          <p className="statValue">{transportJobs.filter((job) => job.status !== "Accepted").length}</p>
          <p className="statHint">Enough realism for partner conversations and feedback.</p>
        </div>
      </div>

      <SectionCard
        title="What this MVP demonstrates"
        description="A realistic end-to-end tour booking story, without waiting on deep integrations."
      >
        <div className="journeyStrip">
          <div className="journeyStep">
            <strong>1. Customer request</strong>
            Group selects wineries, date, and pickup area.
          </div>
          <div className="journeyStep">
            <strong>2. Smart schedule</strong>
            The app assembles a convenient day plan from winery availability.
          </div>
          <div className="journeyStep">
            <strong>3. Transport need</strong>
            A transport job is generated automatically from the itinerary.
          </div>
          <div className="journeyStep">
            <strong>4. Unified ops view</strong>
            Staff can see the whole day in one place and step in if needed.
          </div>
        </div>
      </SectionCard>

      <div className="grid two">
        <SectionCard
          title="Suggested partner demo route"
          description="Use these views in order during calls and in-person meetings."
        >
          <div className="list">
            <div className="listRow">
              <div className="listTop">
                <div>
                  <h3>Customer journey</h3>
                  <p className="subtle">Show how a guest request becomes a clean itinerary.</p>
                </div>
                <Link href="/customer" className="buttonPrimary">
                  Open journey
                </Link>
              </div>
            </div>
            <div className="listRow">
              <div className="listTop">
                <div>
                  <h3>Winery portal</h3>
                  <p className="subtle">Validate that partners can manage availability with almost no training.</p>
                </div>
                <Link href="/wineries" className="buttonGhost">
                  Open portal
                </Link>
              </div>
            </div>
            <div className="listRow">
              <div className="listTop">
                <div>
                  <h3>Transport board</h3>
                  <p className="subtle">Demonstrate how a driver or fleet owner can inspect and accept work.</p>
                </div>
                <Link href="/transport" className="buttonGhost">
                  Open board
                </Link>
              </div>
            </div>
            <div className="listRow">
              <div className="listTop">
                <div>
                  <h3>Operations view</h3>
                  <p className="subtle">Show your own team’s unified control panel for the day.</p>
                </div>
                <Link href="/ops" className="buttonGhost">
                  Open ops view
                </Link>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Sample itinerary snapshot"
          description={`${sampleRequest.guestName} requested ${sampleRequest.wineries.length} wineries for ${sampleRequest.date}.`}
        >
          <div className="timeline">
            {plans[0]?.stops.map((stop) => (
              <div key={stop.wineryId} className="timelineItem">
                <div className="timelineTime">{stop.arrival}</div>
                <div>
                  <h3>{stop.wineryName}</h3>
                  <p className="subtle">
                    Depart {stop.departure} after a {stop.driveFromPreviousMinutes}-minute drive from the previous stop.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}

