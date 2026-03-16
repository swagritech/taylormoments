import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";

export default function Home() {
  return (
    <AppShell
      eyebrow="Tailor Moments"
      title="Tailor Moments"
      intro="Create personalised Margaret River winery days with easy confirmations for wineries and transport partners."
      showWorkflowStatus={false}
    >
      <div className="grid two">
        <SectionCard
          title="Start here"
          description="Choose what you need to do."
        >
          <div className="list compactList">
            <div className="listRow">
              <div className="listTop">
                <div>
                  <h3>Plan a booking</h3>
                  <p className="subtle">Enter guest details and receive recommended winery itineraries.</p>
                </div>
                <Link href="/customer" className="buttonPrimary">Open</Link>
              </div>
            </div>
            <div className="listRow">
              <div className="listTop">
                <div>
                  <h3>Explore winery options</h3>
                  <p className="subtle">Answer quick preferences and preview an optimized schedule without logging in.</p>
                </div>
                <Link href="/explore" className="buttonGhost">Open</Link>
              </div>
            </div>
            <div className="listRow">
              <div className="listTop">
                <div>
                  <h3>Partner portal</h3>
                  <p className="subtle">Winery, transport, and ops teams can sign in from a dedicated partner area.</p>
                </div>
                <Link href="/partner" className="buttonGhost">Open</Link>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="How it works"
          description="Simple booking flow for guests and partners."
        >
          <div className="list compactList">
            <div className="listRow">
              <h3>1. Guest submits request</h3>
              <p className="subtle">Guests choose date, pickup, group size, and preferred wineries.</p>
            </div>
            <div className="listRow">
              <h3>2. Wineries confirm quickly</h3>
              <p className="subtle">Wineries can approve from a direct link or from their portal queue.</p>
            </div>
            <div className="listRow">
              <h3>3. Transport is arranged</h3>
              <p className="subtle">Transport jobs can be reviewed and accepted with minimal steps.</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
