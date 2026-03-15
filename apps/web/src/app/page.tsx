import Image from "next/image";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";

const operatingPillars = [
  {
    title: "Recommendation-led booking",
    text: "Guests see a premium, high-confidence plan first, then explore alternates only if they want more control.",
  },
  {
    title: "No-login partner actions",
    text: "Wineries and transport partners can approve, accept, or review jobs from one clean mobile screen.",
  },
  {
    title: "Exception-only operations",
    text: "Your internal team focuses on the bookings that need intervention instead of manually stitching every day together.",
  },
];

export default function Home() {
  return (
    <AppShell
      eyebrow="Premium booking platform"
      title="Margaret River bookings, approvals, and transport in one calm operating system."
      intro="Tailor Moments is evolving from prototype to live workflow: guests can request curated tasting days, partners can act from a link, and your team keeps sight of the whole journey."
    >
      <div className="brandShowcase">
        <div className="brandPanel brandPanelDark">
          <Image
            src="/brand/tailormoments-logo.jpeg"
            alt="Tailor Moments logo"
            width={920}
            height={540}
            className="brandHeroImage"
            priority
          />
        </div>
        <div className="brandPanel brandPanelLight">
          <p className="miniLabel">Visual direction</p>
          <h2>Coastal luxury, not loud tech.</h2>
          <p>
            The interface should feel warm, curated, and trustworthy. Sage, teal, gold, and sand do the heavy lifting while typography stays elegant and readable.
          </p>
          <div className="paletteRow">
            <span className="paletteSwatch sage">Sage</span>
            <span className="paletteSwatch teal">Ocean teal</span>
            <span className="paletteSwatch aqua">Coastal aqua</span>
            <span className="paletteSwatch gold">Luxury gold</span>
            <span className="paletteSwatch sand">Warm sand</span>
          </div>
        </div>
      </div>

      <div className="statsGrid">
        <div className="statCard">
          <p className="statLabel">Customer flow</p>
          <p className="statValue">Live</p>
          <p className="statHint">Quote request and itinerary recommendation are being moved onto the real Azure API.</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Partner actions</p>
          <p className="statValue">No login</p>
          <p className="statHint">Approve and accept flows are being shaped for one clear mobile action.</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Margaret River fit</p>
          <p className="statValue">Local</p>
          <p className="statHint">All current seed content is framed for Margaret River, Western Australia.</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Brand direction</p>
          <p className="statValue">Locked</p>
          <p className="statHint">Cinzel, Inter, and the Tailor Moments coastal palette now guide the frontend system.</p>
        </div>
      </div>

      <SectionCard
        title="Operating model"
        description="This is the service experience we are building toward, not just a pitch sequence."
      >
        <div className="journeyStrip">
          <div className="journeyStep">
            <strong>1. Guest request</strong>
            A guest asks for a tailored winery day and sees an expert-led recommendation instead of a complicated booking form.
          </div>
          <div className="journeyStep">
            <strong>2. Partner action</strong>
            Wineries and carriers receive direct action links that work beautifully on mobile and remove portal friction.
          </div>
          <div className="journeyStep">
            <strong>3. Orchestrated day</strong>
            Transport and timing are created from the itinerary so the whole day feels considered rather than patched together.
          </div>
          <div className="journeyStep">
            <strong>4. Controlled exceptions</strong>
            Internal ops only step in when the system finds a blocker, delay, or non-response that needs judgment.
          </div>
        </div>
      </SectionCard>

      <div className="grid two">
        <SectionCard
          title="Build focus"
          description="The current priority is to make the product feel real enough for testing, not just for presentation."
        >
          <div className="list compactList">
            {operatingPillars.map((pillar) => (
              <div key={pillar.title} className="listRow">
                <h3>{pillar.title}</h3>
                <p className="subtle">{pillar.text}</p>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Current entry points"
          description="These are the core surfaces we can now refine and test with real workflows."
        >
          <div className="list compactList">
            <div className="listRow">
              <div className="listTop">
                <div>
                  <h3>Plan a day</h3>
                  <p className="subtle">Live recommendation and quote-request surface for guests.</p>
                </div>
                <Link href="/customer" className="buttonPrimary">
                  Open planner
                </Link>
              </div>
            </div>
            <div className="listRow">
              <div className="listTop">
                <div>
                  <h3>Partner approvals</h3>
                  <p className="subtle">Token-based mobile actions for winery and transport decisions.</p>
                </div>
                <Link href="/approve" className="buttonGhost">
                  View approval page
                </Link>
              </div>
            </div>
            <div className="listRow">
              <div className="listTop">
                <div>
                  <h3>Operations view</h3>
                  <p className="subtle">Internal board for the bookings, routes, and exceptions that still need human judgment.</p>
                </div>
                <Link href="/ops" className="buttonGhost">
                  Open ops
                </Link>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
