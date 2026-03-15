"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { getDataMode } from "@/lib/config";
import { useAuth } from "@/lib/auth-state";
import {
  approveWineryToken,
  getWineryPortalRequestsAuthed,
  listWineries,
  type WineryPortalItem,
} from "@/lib/live-api";

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

function tokenFromActionUrl(actionUrl: string) {
  try {
    const url = new URL(actionUrl);
    return url.searchParams.get("token") ?? "";
  } catch {
    return "";
  }
}

export default function WineriesPage() {
  const { user, token, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null);
  const [wineries, setWineries] = useState<Array<{ winery_id: string; name: string; region: string }>>([]);
  const [selectedWineryId, setSelectedWineryId] = useState<string>("");
  const [requests, setRequests] = useState<WineryPortalItem[]>([]);
  const [summary, setSummary] = useState({ pending: 0, accepted: 0, declined: 0, expired: 0 });
  const [wineryName, setWineryName] = useState<string>("Winery");
  const dataMode = getDataMode();

  const loadRequests = useCallback(async (wineryId: string) => {
    if (!wineryId || !token) {
      setRequests([]);
      setSummary({ pending: 0, accepted: 0, declined: 0, expired: 0 });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await getWineryPortalRequestsAuthed(wineryId, token);
      setRequests(response.requests);
      setSummary(response.summary);
      setWineryName(response.winery?.name ?? "Winery");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load winery request queue.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (authLoading || !user || !token) {
      return;
    }
    const currentUser = user;

    let active = true;

    async function loadWineries() {
      try {
        setLoading(true);
        setError(null);

        if (currentUser.role === "winery" && currentUser.winery_id) {
          const response = await listWineries();
          if (!active) {
            return;
          }
          const found = response.wineries.find((item) => item.winery_id === currentUser.winery_id);
          if (found) {
            setWineries([{ winery_id: found.winery_id, name: found.name, region: found.region }]);
            setSelectedWineryId(found.winery_id);
          }
          return;
        }

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
  }, [authLoading, token, user]);

  useEffect(() => {
    void loadRequests(selectedWineryId);
  }, [loadRequests, selectedWineryId]);

  async function handleApprove(item: WineryPortalItem) {
    const tokenId = tokenFromActionUrl(item.action_url);
    if (!tokenId) {
      setError("Approval token could not be parsed for this booking.");
      return;
    }

    try {
      setApprovingRequestId(item.request_id);
      setError(null);
      await approveWineryToken(tokenId);
      await loadRequests(selectedWineryId);
    } catch (approveError) {
      setError(approveError instanceof Error ? approveError.message : "Unable to approve this booking.");
    } finally {
      setApprovingRequestId(null);
    }
  }

  const pendingItems = useMemo(
    () => requests.filter((item) => item.status === "pending"),
    [requests],
  );

  const acceptedItems = useMemo(
    () => requests.filter((item) => item.status === "accepted"),
    [requests],
  );

  if (!authLoading && !user) {
    return (
      <AppShell
        eyebrow="Winery portal"
        title="Winery partner access"
        intro="Log in with your winery account to view and approve booking requests."
        showWorkflowStatus={false}
      >
        <div className="actionPageShell">
          <SectionCard title="Sign in required" description="This portal is restricted to signed-in winery users and ops users.">
            <div className="ctaRow">
              <Link href="/login" className="buttonPrimary">Log in</Link>
              <Link href="/register" className="buttonGhost">Create account</Link>
            </div>
          </SectionCard>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      eyebrow="Winery portal"
      title="Booking requests"
      intro="Review pending requests and approve bookings for your winery."
    >
      <SectionCard
        title="Winery queue"
        description="Bookings waiting for action and those already accepted."
      >
        <div className="fieldRow">
          <div className="field">
            <label htmlFor="winerySelect">Winery</label>
            <select
              id="winerySelect"
              className="inputLike inputField"
              value={selectedWineryId}
              onChange={(event) => setSelectedWineryId(event.target.value)}
              disabled={loading || wineries.length === 0 || user?.role === "winery"}
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
          description="These requests need a response."
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
                  <div className="ctaRow">
                    <button
                      type="button"
                      className="buttonPrimary"
                      onClick={() => handleApprove(item)}
                      disabled={approvingRequestId === item.request_id}
                    >
                      {approvingRequestId === item.request_id ? "Approving..." : "Approve booking"}
                    </button>
                    <a className="buttonGhost" href={item.action_url} target="_blank" rel="noreferrer">
                      Open magic link
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Accepted requests"
          description="History of accepted bookings."
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
