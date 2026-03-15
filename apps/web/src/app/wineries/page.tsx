"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { getDataMode } from "@/lib/config";
import { getWineryPortalRequests, listWineries, type WineryPortalItem } from "@/lib/live-api";

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function statusClass(value: string) {
  return value.replace(/[^a-z]+/gi, "").toLowerCase();
}

export default function WineriesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wineries, setWineries] = useState<Array<{ winery_id: string; name: string; region: string }>>([]);
  const [selectedWineryId, setSelectedWineryId] = useState<string>("");
  const [requests, setRequests] = useState<WineryPortalItem[]>([]);
  const [summary, setSummary] = useState({ pending: 0, accepted: 0, declined: 0, expired: 0 });
  const [wineryName, setWineryName] = useState<string>("Winery");
  const dataMode = getDataMode();

  useEffect(() => {
    let active = true;

    async function loadWineries() {
      try {
        setLoading(true);
        setError(null);
        const response = await listWineries();
        if (!active) {
          return;
        }

        const sorted = response.wineries.map((item) => ({
          winery_id: item.winery_id,
          name: item.name,
          region: item.region,
        }));

        setWineries(sorted);
        setSelectedWineryId((current) => current || sorted[0]?.winery_id || "");
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load winery list.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadWineries();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedWineryId) {
      setRequests([]);
      setSummary({ pending: 0, accepted: 0, declined: 0, expired: 0 });
      return;
    }

    let active = true;

    async function loadRequests() {
      try {
        setLoading(true);
        setError(null);
        const response = await getWineryPortalRequests(selectedWineryId);
        if (!active) {
          return;
        }

        setRequests(response.requests);
        setSummary(response.summary);
        setWineryName(response.winery?.name ?? "Winery");
      } catch (loadError) {
        if (!active) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : "Unable to load winery request queue.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadRequests();

    return () => {
      active = false;
    };
  }, [selectedWineryId]);

  const pendingItems = useMemo(
    () => requests.filter((item) => item.status === "pending"),
    [requests],
  );

  const acceptedItems = useMemo(
    () => requests.filter((item) => item.status === "accepted"),
    [requests],
  );

  return (
    <AppShell
      eyebrow="Winery portal"
      title="Bookings flow automatically to winery queues with one-click approval links."
      intro="Each booking now creates partner requests instantly. Wineries can view pending and accepted requests, and approve directly from email/SMS links."
    >
      <SectionCard
        title="Winery queue selector"
        description="Select a winery to review bookings waiting for action and those already accepted."
      >
        <div className="fieldRow">
          <div className="field">
            <label htmlFor="winerySelect">Winery</label>
            <select
              id="winerySelect"
              className="inputLike inputField"
              value={selectedWineryId}
              onChange={(event) => setSelectedWineryId(event.target.value)}
              disabled={loading || wineries.length === 0}
            >
              {wineries.map((winery) => (
                <option key={winery.winery_id} value={winery.winery_id}>
                  {winery.name} ({winery.region})
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Mode</label>
            <div className="inputLike" style={{ display: "flex", alignItems: "center" }}>
              {dataMode === "remote" ? "Remote API" : "Demo mode"}
            </div>
          </div>
        </div>

        <div className="summaryRibbon" style={{ marginTop: 14 }}>
          <div className="summaryChip">
            <span className="miniLabel">Pending</span>
            <strong>{summary.pending}</strong>
          </div>
          <div className="summaryChip">
            <span className="miniLabel">Accepted</span>
            <strong>{summary.accepted}</strong>
          </div>
          <div className="summaryChip">
            <span className="miniLabel">Declined</span>
            <strong>{summary.declined}</strong>
          </div>
          <div className="summaryChip">
            <span className="miniLabel">Expired</span>
            <strong>{summary.expired}</strong>
          </div>
        </div>
      </SectionCard>

      {error ? <div className="callout errorCallout">{error}</div> : null}

      <div className="grid two">
        <SectionCard
          title={`Pending approvals for ${wineryName}`}
          description="These are requests that still need a partner action."
        >
          <div className="list">
            {pendingItems.length === 0 ? (
              <div className="listRow">
                <p className="subtle">No pending requests right now.</p>
              </div>
            ) : (
              pendingItems.map((item) => (
                <div key={item.request_id} className="listRow">
                  <div className="listTop">
                    <div>
                      <h3>{item.booking?.leadName ?? "Guest booking"}</h3>
                      <p className="subtle">
                        {item.booking?.bookingDate} | {item.booking?.pickupLocation} | {item.booking?.partySize} guests
                      </p>
                    </div>
                    <span className={`status ${statusClass(item.status)}`}>{item.status}</span>
                  </div>
                  <div className="metaRow">
                    <span className="meta">Sent via {item.sent_channel}</span>
                    <span className="meta">Recipient {item.sent_recipient ?? "(not configured)"}</span>
                    <span className="meta">Sent {formatDateTime(item.sent_at)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Accepted requests"
          description="Accepted bookings remain visible so winery teams can review what they have committed to."
        >
          <div className="list">
            {acceptedItems.length === 0 ? (
              <div className="listRow">
                <p className="subtle">No accepted requests yet.</p>
              </div>
            ) : (
              acceptedItems.map((item) => (
                <div key={item.request_id} className="listRow">
                  <div className="listTop">
                    <div>
                      <h3>{item.booking?.leadName ?? "Guest booking"}</h3>
                      <p className="subtle">
                        {item.booking?.bookingDate} | {item.booking?.pickupLocation} | {item.booking?.partySize} guests
                      </p>
                    </div>
                    <span className={`status ${statusClass(item.status)}`}>{item.status}</span>
                  </div>
                  <div className="metaRow">
                    <span className="meta">Approved {formatDateTime(item.approved_at)}</span>
                    <span className="meta">Booking {item.booking_id}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
