"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { useAuth } from "@/lib/auth-state";
import { getMyBookings, type MyBookingsResponse } from "@/lib/live-api";

type DashboardBooking = MyBookingsResponse["bookings"][number];

function toStatusLabel(status: string) {
  switch (status) {
    case "awaiting_winery":
      return "Awaiting winery";
    case "transport_pending":
      return "Transport pending";
    case "confirmed":
      return "Confirmed";
    case "exception":
      return "Needs review";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function toStatusClass(status: string) {
  switch (status) {
    case "confirmed":
      return "accepted";
    case "awaiting_winery":
    case "transport_pending":
      return "review";
    case "exception":
    case "cancelled":
      return "declined";
    default:
      return "review";
  }
}

export default function CustomerDashboardPage() {
  const { user, token, loading } = useAuth();
  const [bookings, setBookings] = useState<DashboardBooking[]>([]);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || !token || !user || user.role !== "customer") {
      return;
    }

    let active = true;
    async function run() {
      setFetching(true);
      setError(null);
      try {
        const response = await getMyBookings(token);
        if (!active) {
          return;
        }
        setBookings(response.bookings);
      } catch (requestError) {
        if (!active) {
          return;
        }
        setError(requestError instanceof Error ? requestError.message : "Unable to load bookings.");
      } finally {
        if (active) {
          setFetching(false);
        }
      }
    }

    void run();
    return () => {
      active = false;
    };
  }, [loading, token, user]);

  const todayIso = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString().slice(0, 10);
  }, []);

  const { currentBookings, historicalBookings } = useMemo(() => {
    const current: DashboardBooking[] = [];
    const history: DashboardBooking[] = [];

    bookings.forEach((booking) => {
      const isHistorical = booking.bookingDate < todayIso || booking.status === "cancelled";
      if (isHistorical) {
        history.push(booking);
      } else {
        current.push(booking);
      }
    });

    return {
      currentBookings: current,
      historicalBookings: history,
    };
  }, [bookings, todayIso]);

  const confirmedCount = bookings.filter((booking) => booking.status === "confirmed").length;
  const pendingCount = bookings.filter((booking) => booking.status === "awaiting_winery" || booking.status === "transport_pending").length;

  return (
    <AppShell
      eyebrow="Customer dashboard"
      title="Your winery day dashboard"
      intro="Track live booking status, review previous trips, and start a new schedule when you are ready."
      showWorkflowStatus={false}
    >
      {!user ? (
        <SectionCard title="Sign in required" description="Please sign in to view your dashboard and bookings.">
          <div className="ctaRow">
            <Link href="/login" className="buttonPrimary">Log in</Link>
            <Link href="/register" className="buttonGhost">Create customer account</Link>
          </div>
        </SectionCard>
      ) : null}

      {user && user.role !== "customer" ? (
        <SectionCard title="Customer account required" description="This dashboard is for customer profiles.">
          <p className="subtle">You are signed in as {user.role}. Use the partner portal for partner workflows.</p>
        </SectionCard>
      ) : null}

      {user?.role === "customer" ? (
        <>
          <section className="statsGrid">
            <article className="statCard">
              <p className="statLabel">Current bookings</p>
              <p className="statValue">{currentBookings.length}</p>
            </article>
            <article className="statCard">
              <p className="statLabel">Pending actions</p>
              <p className="statValue">{pendingCount}</p>
            </article>
            <article className="statCard">
              <p className="statLabel">Confirmed trips</p>
              <p className="statValue">{confirmedCount}</p>
            </article>
            <article className="statCard">
              <p className="statLabel">Past bookings</p>
              <p className="statValue">{historicalBookings.length}</p>
            </article>
          </section>

          <SectionCard
            title="Create a new schedule"
            description="Start from the winery catalog, add preferred venues to cart, then generate your tailored day."
          >
            <div className="ctaRow">
              <Link href="/customer" className="buttonPrimary">Create new schedule</Link>
            </div>
          </SectionCard>

          <div className="grid two">
            <SectionCard title="Current bookings" description="Upcoming bookings and active requests.">
              {fetching ? <p className="subtle">Loading bookings...</p> : null}
              {error ? <div className="callout errorCallout">{error}</div> : null}
              {!fetching && !error && currentBookings.length === 0 ? (
                <p className="subtle">No current bookings yet. Create a new schedule to get started.</p>
              ) : null}
              <div className="list">
                {currentBookings.map((booking) => (
                  <article key={booking.bookingId} className="listRow">
                    <div className="listTop">
                      <div>
                        <h3>{booking.bookingDate}</h3>
                        <p className="subtle">{booking.pickupLocation}</p>
                      </div>
                      <span className={`status ${toStatusClass(booking.status)}`}>{toStatusLabel(booking.status)}</span>
                    </div>
                    <p className="subtle">
                      {booking.partySize} guests
                      {booking.preferredStartTime && booking.preferredEndTime
                        ? ` · ${booking.preferredStartTime}-${booking.preferredEndTime}`
                        : ""}
                    </p>
                    <p className="subtle">Booking ID: {booking.bookingId}</p>
                  </article>
                ))}
              </div>
            </SectionCard>

            <SectionCard title="Booking history" description="Completed and closed bookings.">
              {fetching ? <p className="subtle">Loading bookings...</p> : null}
              {error ? <div className="callout errorCallout">{error}</div> : null}
              {!fetching && !error && historicalBookings.length === 0 ? (
                <p className="subtle">No historical bookings yet.</p>
              ) : null}
              <div className="list">
                {historicalBookings.map((booking) => (
                  <article key={booking.bookingId} className="listRow">
                    <div className="listTop">
                      <div>
                        <h3>{booking.bookingDate}</h3>
                        <p className="subtle">{booking.pickupLocation}</p>
                      </div>
                      <span className={`status ${toStatusClass(booking.status)}`}>{toStatusLabel(booking.status)}</span>
                    </div>
                    <p className="subtle">{booking.partySize} guests</p>
                    <p className="subtle">Booking ID: {booking.bookingId}</p>
                  </article>
                ))}
              </div>
            </SectionCard>
          </div>
        </>
      ) : null}
    </AppShell>
  );
}
