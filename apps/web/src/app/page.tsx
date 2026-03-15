import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";

export default function Home() {
  return (
    <AppShell
      eyebrow="Operations dashboard"
      title="Tailor Moments"
      intro="Manage guest bookings, winery approvals, transport acceptance, and exceptions from one connected workspace."
    >
      <div className="statsGrid">
        <div className="statCard">
          <p className="statLabel">Customer requests</p>
          <p className="statValue">Live</p>
          <p className="statHint">Customers can submit booking requests through the live flow.</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Winery confirmations</p>
          <p className="statValue">Auto dispatch</p>
          <p className="statHint">Requests and approval links are generated when a booking is created.</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Transport decisions</p>
          <p className="statValue">Ready</p>
          <p className="statHint">Transport partners can accept from direct links and action pages.</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Deployment</p>
          <p className="statValue">Cloudflare + Azure</p>
          <p className="statHint">Frontend and backend are connected for live partner testing.</p>
        </div>
      </div>

      <div className="grid two">
        <SectionCard
          title="Primary workflows"
          description="Open the operational surfaces used by customers, partners, and internal staff."
        >
          <div className="list compactList">
            <div className="listRow">
              <div className="listTop">
                <div>
                  <h3>Customer booking</h3>
                  <p className="subtle">Create itinerary recommendations and submit bookings.</p>
                </div>
                <Link href="/customer" className="buttonPrimary">Open</Link>
              </div>
            </div>
            <div className="listRow">
              <div className="listTop">
                <div>
                  <h3>Winery portal</h3>
                  <p className="subtle">Review pending requests and approve bookings.</p>
                </div>
                <Link href="/wineries" className="buttonGhost">Open</Link>
              </div>
            </div>
            <div className="listRow">
              <div className="listTop">
                <div>
                  <h3>Transport board</h3>
                  <p className="subtle">Inspect open jobs and route coverage.</p>
                </div>
                <Link href="/transport" className="buttonGhost">Open</Link>
              </div>
            </div>
            <div className="listRow">
              <div className="listTop">
                <div>
                  <h3>Ops queue</h3>
                  <p className="subtle">Track exceptions and active day-of-tour tasks.</p>
                </div>
                <Link href="/ops" className="buttonGhost">Open</Link>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Current behavior"
          description="What is automatic today."
        >
          <div className="list compactList">
            <div className="listRow">
              <h3>Booking creation</h3>
              <p className="subtle">Creates the booking and immediately generates winery action tokens for selected venues.</p>
            </div>
            <div className="listRow">
              <h3>Winery queue</h3>
              <p className="subtle">Pending and accepted states are visible on the winery portal per venue.</p>
            </div>
            <div className="listRow">
              <h3>Token safety</h3>
              <p className="subtle">Approval/accept tokens are single-use with expiry protection.</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
