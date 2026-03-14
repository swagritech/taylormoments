"use client";

import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { useDemoState } from "@/lib/demo-state";

function wineryStatusClass(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

export default function WineriesPage() {
  const { activeBooking, request, updateWinerySlots, updateWineryStatus, wineries } = useDemoState();

  return (
    <AppShell
      eyebrow="Winery portal"
      title="Partners manage availability in a simple browser portal, not in your inbox."
      intro="This view is now live: winery settings here feed directly back into the planner, operations queue, and transport readiness."
    >
      <SectionCard
        title="Current booking context"
        description="This tells a winery exactly which enquiry is being planned right now."
      >
        <div className="summaryRibbon">
          <div className="summaryChip">
            <span className="miniLabel">Active enquiry</span>
            <strong>{activeBooking?.label}</strong>
          </div>
          <div className="summaryChip">
            <span className="miniLabel">Date</span>
            <strong>{request.date}</strong>
          </div>
          <div className="summaryChip">
            <span className="miniLabel">Pickup</span>
            <strong>{request.pickup}</strong>
          </div>
          <div className="summaryChip">
            <span className="miniLabel">Guests</span>
            <strong>{request.partySize}</strong>
          </div>
        </div>
      </SectionCard>

      <div className="grid two">
        <SectionCard
          title="Partner value proposition"
          description="Use this screen to show wineries they stay in control while the itinerary updates elsewhere in the product."
        >
          <div className="list">
            <div className="listRow">
              <h3>Availability with almost no training</h3>
              <p className="subtle">Teams can change slot patterns, switch confirmation mode, and immediately see how that impacts planning.</p>
            </div>
            <div className="listRow">
              <h3>Visibility into what is coming</h3>
              <p className="subtle">Upcoming visits, group size, and transport timing are visible before the bus arrives.</p>
            </div>
            <div className="listRow">
              <h3>Optional calendar exports later</h3>
              <p className="subtle">Start with the portal now, then layer in Google or Outlook feeds when partners are ready.</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Live availability controls"
          description="Edit confirmation mode and slots here to see the planner react on the customer and ops pages."
        >
          <div className="list">
            {wineries.map((winery) => (
              <div key={winery.id} className="listRow">
                <div className="listTop">
                  <div>
                    <h3>{winery.name}</h3>
                    <p className="subtle">{winery.region}</p>
                  </div>
                  <select
                    className="inputLike inputField statusSelect"
                    value={winery.status}
                    onChange={(event) => updateWineryStatus(winery.id, event.target.value as typeof winery.status)}
                  >
                    <option value="Auto-confirm">Auto-confirm</option>
                    <option value="Manual review">Manual review</option>
                  </select>
                </div>
                <div className="metaRow">
                  <span className="meta">Capacity {winery.capacity}</span>
                  <span className="meta">{winery.tastingDurationMinutes} min tasting</span>
                  <span className={`status ${wineryStatusClass(winery.status)}`}>{winery.status}</span>
                </div>
                <div className="field">
                  <label htmlFor={`slots-${winery.id}`}>Available slots</label>
                  <input
                    id={`slots-${winery.id}`}
                    className="inputLike inputField"
                    value={winery.availableSlots.join(", ")}
                    onChange={(event) =>
                      updateWinerySlots(
                        winery.id,
                        event.target.value
                          .split(",")
                          .map((slot) => slot.trim())
                          .filter(Boolean),
                      )
                    }
                  />
                </div>
                <p className="subtle">{winery.notes}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="What wineries should react to"
        description="This is now a functional feedback session, not just a visual walkthrough."
      >
        <div className="grid three">
          <div className="miniCard">
            <p className="miniLabel">Ease of use</p>
            <p className="subtle">Can a cellar-door manager update slots or confirmation mode in under two minutes?</p>
          </div>
          <div className="miniCard">
            <p className="miniLabel">Control</p>
            <p className="subtle">Does switching between auto-confirm and manual review create the right behavior elsewhere?</p>
          </div>
          <div className="miniCard">
            <p className="miniLabel">Trust</p>
            <p className="subtle">Do partners feel the system reflects their actual operational guardrails?</p>
          </div>
        </div>
      </SectionCard>
    </AppShell>
  );
}
