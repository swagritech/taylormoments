"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PortalGate, PortalShell, PortalToast, type PortalNavItem } from "@/components/portal-shell";
import { useDemoState } from "@/lib/demo-state";
import { useAuth } from "@/lib/auth-state";
import { transportProviders } from "@/lib/demo-data";

type View = "offers" | "schedule" | "fleet" | "profile";
type OfferStatus = "new" | "accepted" | "declined";
type OfferFilter = "new" | "accepted" | "all";

type VehicleDraft = {
  id: string;
  vehicle_type: string;
  vehicle_make_model: string;
  max_passengers: string;
  offDuty?: boolean;
};

type TransportProfileDraft = {
  vehicles: VehicleDraft[];
  languages: string[];
  pickup_zones: string[];
  vehicle_classes: string[];
  auto_confirm: boolean;
  base: string;
  dispatch: string;
};

const VEHICLE_CLASS_OPTIONS = ["Luxury sedan", "Premium SUV", "Luxury van", "Mini-coach"] as const;
const LANGUAGE_OPTIONS = ["English", "Mandarin", "Cantonese", "Vietnamese", "Japanese", "Korean"] as const;
const SERVICE_AREA_OPTIONS = [
  "Margaret River",
  "Dunsborough",
  "Busselton + airport",
  "Prevelly",
  "Perth CBD",
] as const;

const STORAGE_KEY = "tm_transport_profiles_v2";

function makeDefaultProfile(): TransportProfileDraft {
  return {
    vehicles: [
      { id: "v1", vehicle_type: "Luxury van", vehicle_make_model: "Mercedes V-Class", max_passengers: "7" },
      { id: "v2", vehicle_type: "Premium SUV", vehicle_make_model: "Toyota LandCruiser", max_passengers: "6" },
    ],
    languages: ["English", "Mandarin"],
    pickup_zones: ["Margaret River", "Dunsborough"],
    vehicle_classes: ["Luxury van", "Premium SUV"],
    auto_confirm: false,
    base: "Margaret River",
    dispatch: "Caves Rd depot",
  };
}

function toggleInList(list: string[], value: string, on: boolean) {
  const next = new Set(list);
  if (on) {
    next.add(value);
  } else {
    next.delete(value);
  }
  return Array.from(next);
}

function pillClass(status: OfferStatus) {
  if (status === "accepted") {
    return "pt-pill pt-pill--accepted";
  }
  if (status === "declined") {
    return "pt-pill pt-pill--declined";
  }
  return "pt-pill pt-pill--new";
}

export function PartnerTransportPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { cannedTransportJobs, liveTransportJob } = useDemoState();
  const jobs = useMemo(
    () => (liveTransportJob ? [liveTransportJob, ...cannedTransportJobs] : cannedTransportJobs),
    [liveTransportJob, cannedTransportJobs],
  );

  const [view, setView] = useState<View>("offers");
  const [offerFilter, setOfferFilter] = useState<OfferFilter>("new");
  const [offerStatus, setOfferStatus] = useState<Record<string, OfferStatus>>({});
  const [toast, setToast] = useState("");
  const [profile, setProfile] = useState<TransportProfileDraft>(makeDefaultProfile);
  const [profileSavedAt, setProfileSavedAt] = useState<string | null>(null);

  const companyName = user?.transport_company || transportProviders[0]?.name || "Your company";

  useEffect(() => {
    if (loading || !user) {
      return;
    }
    if (user.role === "winery") {
      router.replace("/partner/wineries");
    } else if (user.role === "customer") {
      router.replace("/plan");
    }
  }, [loading, router, user]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setProfile({ ...makeDefaultProfile(), ...(JSON.parse(raw) as TransportProfileDraft) });
      }
    } catch {
      /* keep defaults */
    }
  }, []);

  useEffect(() => {
    setOfferStatus((current) => {
      const next = { ...current };
      for (const job of jobs) {
        if (!next[job.id]) {
          next[job.id] = job.status === "Accepted" ? "accepted" : "new";
        }
      }
      return next;
    });
  }, [jobs]);

  function flashToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  }

  function setStatus(jobId: string, status: OfferStatus) {
    setOfferStatus((current) => ({ ...current, [jobId]: status }));
    flashToast(status === "accepted" ? "Offer accepted — added to schedule." : "Offer declined — run released.");
  }

  function saveProfile(next: TransportProfileDraft) {
    setProfile(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  function commitProfile() {
    saveProfile(profile);
    setProfileSavedAt(new Date().toISOString());
    flashToast("Company profile saved.");
  }

  const statusOf = (jobId: string, fallback: string): OfferStatus => offerStatus[jobId] ?? (fallback === "Accepted" ? "accepted" : "new");

  const filteredOffers = useMemo(() => {
    return jobs.filter((job) => {
      const status = statusOf(job.id, job.status);
      if (offerFilter === "all") {
        return true;
      }
      if (offerFilter === "new") {
        return status === "new";
      }
      return status === "accepted";
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs, offerFilter, offerStatus]);

  const newCount = jobs.filter((job) => statusOf(job.id, job.status) === "new").length;
  const acceptedJobs = jobs.filter((job) => statusOf(job.id, job.status) === "accepted");
  const seatsThisWeek = acceptedJobs.reduce((sum, job) => sum + job.passengers, 0);

  if (!loading && !user) {
    return (
      <PortalGate
        portalTag="Transport Portal"
        title="Sign in to dispatch"
        lead="This portal is restricted to signed-in transport and ops accounts. Log in to review and accept transfer offers."
      />
    );
  }

  if (!loading && user && user.role !== "transport" && user.role !== "ops") {
    return (
      <PortalGate
        portalTag="Transport Portal"
        title="Transport access only"
        lead="Your account does not have transport access. Use a transport or ops account to view this portal."
      />
    );
  }

  const navItems: PortalNavItem[] = [
    { key: "offers", label: "Transfer offers", icon: "◷", badge: newCount || undefined },
    { key: "schedule", label: "Schedule", icon: "▦" },
    { key: "fleet", label: "Fleet & drivers", icon: "◍" },
    { key: "profile", label: "Company profile", icon: "▤" },
  ];

  return (
    <>
      <PortalShell
        portalTag="Transport Portal"
        navLabel="Company"
        navItems={navItems}
        activeKey={view}
        onSelect={(key) => setView(key as View)}
        accountName={user?.display_name || companyName}
        accountRole={`${companyName} · Transport partner`}
        kicker="Transport Portal"
        title={
          view === "offers" ? "Transfer offers" :
          view === "schedule" ? "Schedule" :
          view === "fleet" ? "Fleet & drivers" : "Company profile"
        }
        lead={
          view === "offers" ? "Review open transfer offers and confirm the runs you can cover." :
          view === "schedule" ? "Your confirmed runs, in date order." :
          view === "fleet" ? "Manage vehicle availability and driver coverage." :
          "Keep your service areas, vehicle classes and dispatch details current."
        }
        crossLink={user?.role === "ops" ? { href: "/partner/wineries", label: "Winery portal →" } : undefined}
      >
        {view === "offers" ? (
          <>
            <div className="pt-stats">
              <div className="pt-stat"><span className="pt-stat__num pt-stat__num--accent">{newCount}</span><span className="pt-stat__label">New offers</span></div>
              <div className="pt-stat"><span className="pt-stat__num">{acceptedJobs.length}</span><span className="pt-stat__label">Confirmed runs</span></div>
              <div className="pt-stat"><span className="pt-stat__num">{seatsThisWeek}</span><span className="pt-stat__label">Seats this week</span></div>
              <div className="pt-stat"><span className="pt-stat__num">98%</span><span className="pt-stat__label">On-time rate</span></div>
            </div>

            <div className="pt-block__head">
              <div className="pt-seg">
                {([
                  { key: "new", label: `New · ${newCount}` },
                  { key: "accepted", label: `Accepted · ${acceptedJobs.length}` },
                  { key: "all", label: "All" },
                ] as const).map((option) => (
                  <button key={option.key} type="button" className={`pt-seg__btn ${offerFilter === option.key ? "is-active" : ""}`} onClick={() => setOfferFilter(option.key)}>
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-cards">
              {filteredOffers.length === 0 ? (
                <div className="pt-empty"><div className="pt-empty__mark">◷</div><p>No {offerFilter === "all" ? "" : offerFilter} offers right now.</p></div>
              ) : (
                filteredOffers.map((job) => {
                  const status = statusOf(job.id, job.status);
                  const pickup = job.routeLabel.split("->")[0]?.trim() ?? "—";
                  return (
                    <article key={job.id} className="pt-card">
                      <div className="pt-card__top">
                        <div className="pt-card__when">
                          <span className="pt-card__date">{job.date}</span>
                          <span className="pt-card__time">{job.pickupTime} · {job.id}</span>
                        </div>
                        <span className={pillClass(status)}>{status}</span>
                      </div>
                      <div className="pt-context">
                        <span className="pt-context__dot" aria-hidden="true" />
                        <span>Route: <strong>{job.routeLabel}</strong></span>
                      </div>
                      <div className="pt-detail">
                        <div className="pt-detail__item"><span className="pt-detail__k">Passengers</span><span className="pt-detail__v">{job.passengers} guests</span></div>
                        <div className="pt-detail__item"><span className="pt-detail__k">Vehicle class</span><span className="pt-detail__v">{job.vehicleType}</span></div>
                        <div className="pt-detail__item"><span className="pt-detail__k">Pickup</span><span className="pt-detail__v">{pickup}</span></div>
                        <div className="pt-detail__item"><span className="pt-detail__k">Provider</span><span className="pt-detail__v">{job.recommendedProvider}</span></div>
                      </div>
                      <div className="pt-card__foot">
                        <span className="pt-tags"><span className="pt-tag pt-tag--gold">Fare {job.payout}</span></span>
                        {status === "new" ? (
                          <div className="pt-actions">
                            <button type="button" className="pt-btn pt-btn--danger" onClick={() => setStatus(job.id, "declined")}>Decline</button>
                            <button type="button" className="pt-btn pt-btn--primary" onClick={() => setStatus(job.id, "accepted")}>Accept run</button>
                          </div>
                        ) : (
                          <span className="pt-resolved"><span className="pt-resolved__check">✓</span> {status === "accepted" ? "Scheduled" : "Declined"}</span>
                        )}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </>
        ) : null}

        {view === "schedule" ? (
          <div className="pt-avail">
            {acceptedJobs.length === 0 ? (
              <div className="pt-empty"><div className="pt-empty__mark">▦</div><p>No confirmed runs yet. Accept an offer to add it here.</p></div>
            ) : (
              acceptedJobs.map((job) => (
                <div key={job.id} className="pt-avail__day">
                  <div className="pt-avail__date">
                    <span className="pt-avail__dname">{job.date}</span>
                    <span className="pt-avail__dsub">{job.pickupTime} · {job.id}</span>
                  </div>
                  <div className="pt-slots" style={{ alignItems: "center" }}>
                    <span className="pt-slot pt-slot--open">{job.vehicleType}</span>
                    <span className="pt-slot pt-slot--open">{job.passengers} guests</span>
                    <span className="pt-slot pt-slot--open">{job.routeLabel.split("->")[0]?.trim()}</span>
                    <span className="pt-pill pt-pill--accepted">Confirmed</span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}

        {view === "fleet" ? (
          <>
            <div className="pt-block">
              <div className="pt-block__head"><h2 className="pt-block__title">Vehicles</h2></div>
              <div className="pt-cards">
                {profile.vehicles.map((vehicle) => (
                  <article key={vehicle.id} className="pt-card">
                    <div className="pt-card__top">
                      <div className="pt-card__when">
                        <span className="pt-card__date">{vehicle.vehicle_make_model || vehicle.vehicle_type}</span>
                        <span className="pt-card__time">{vehicle.vehicle_type} · {vehicle.max_passengers || "—"} seats</span>
                      </div>
                      <span className={`pt-pill ${vehicle.offDuty ? "pt-pill--declined" : "pt-pill--accepted"}`}>{vehicle.offDuty ? "Off duty" : "Available"}</span>
                    </div>
                    <div className="pt-card__foot">
                      <span className="pt-card__msg">{vehicle.offDuty ? "Not offered for new runs." : "Ready for new runs."}</span>
                      <button
                        type="button"
                        className="pt-btn pt-btn--ghost"
                        onClick={() => saveProfile({ ...profile, vehicles: profile.vehicles.map((v) => (v.id === vehicle.id ? { ...v, offDuty: !v.offDuty } : v)) })}
                      >
                        {vehicle.offDuty ? "Make available" : "Set off duty"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
            <div className="pt-block">
              <div className="pt-block__head"><h2 className="pt-block__title">Drivers</h2></div>
              <div className="pt-cards">
                <article className="pt-card">
                  <div className="pt-card__top">
                    <div className="pt-card__when"><span className="pt-card__date">Driver languages</span><span className="pt-card__time">Coverage across your roster</span></div>
                    <span className="pt-pill pt-pill--accepted">On roster</span>
                  </div>
                  <div className="pt-tags">
                    {profile.languages.length === 0 ? <span className="pt-block__note">No languages set.</span> : profile.languages.map((language) => <span key={language} className="pt-tag">{language}</span>)}
                  </div>
                </article>
              </div>
            </div>
          </>
        ) : null}

        {view === "profile" ? (
          <div className="pt-panel">
            <div className="pt-panel__row">
              <div className="pt-panel__k"><span className="pt-panel__klabel">Company name</span><span className="pt-panel__khint">Shown to operations and wineries.</span></div>
              <input className="pt-input" value={companyName} readOnly aria-label="Company name" />
            </div>
            <div className="pt-panel__row">
              <div className="pt-panel__k"><span className="pt-panel__klabel">Base & dispatch</span><span className="pt-panel__khint">Where your fleet is based and dispatched from.</span></div>
              <div className="pt-stack">
                <input className="pt-input" value={profile.base} onChange={(e) => setProfile({ ...profile, base: e.target.value })} placeholder="Base town" />
                <input className="pt-input" value={profile.dispatch} onChange={(e) => setProfile({ ...profile, dispatch: e.target.value })} placeholder="Dispatch depot" />
              </div>
            </div>
            <div className="pt-panel__row">
              <div className="pt-panel__k"><span className="pt-panel__klabel">Service areas</span><span className="pt-panel__khint">Zones you cover for pickups.</span></div>
              <div className="pt-chiprow">
                {SERVICE_AREA_OPTIONS.map((area) => {
                  const on = profile.pickup_zones.includes(area);
                  return (
                    <label key={area} className={`pt-chip ${on ? "is-on" : ""}`}>
                      <input type="checkbox" checked={on} onChange={(e) => setProfile({ ...profile, pickup_zones: toggleInList(profile.pickup_zones, area, e.target.checked) })} />
                      {area}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="pt-panel__row">
              <div className="pt-panel__k"><span className="pt-panel__klabel">Vehicle classes</span><span className="pt-panel__khint">The classes you can offer.</span></div>
              <div className="pt-chiprow">
                {VEHICLE_CLASS_OPTIONS.map((cls) => {
                  const on = profile.vehicle_classes.includes(cls);
                  return (
                    <label key={cls} className={`pt-chip ${on ? "is-on" : ""}`}>
                      <input type="checkbox" checked={on} onChange={(e) => setProfile({ ...profile, vehicle_classes: toggleInList(profile.vehicle_classes, cls, e.target.checked) })} />
                      {cls}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="pt-panel__row">
              <div className="pt-panel__k"><span className="pt-panel__klabel">Driver languages</span><span className="pt-panel__khint">Languages your drivers speak.</span></div>
              <div className="pt-chiprow">
                {LANGUAGE_OPTIONS.map((language) => {
                  const on = profile.languages.includes(language);
                  return (
                    <label key={language} className={`pt-chip ${on ? "is-on" : ""}`}>
                      <input type="checkbox" checked={on} onChange={(e) => setProfile({ ...profile, languages: toggleInList(profile.languages, language, e.target.checked) })} />
                      {language}
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="pt-panel__row" style={{ borderBottom: 0, paddingBottom: 0 }}>
              <div className="pt-panel__k"><span className="pt-panel__klabel">Instant-accept offers</span><span className="pt-panel__khint">Automatically accept offers that match your fleet.</span></div>
              <div className="pt-chiprow">
                <label className={`pt-chip ${profile.auto_confirm ? "is-on" : ""}`}>
                  <input type="checkbox" checked={profile.auto_confirm} onChange={(e) => setProfile({ ...profile, auto_confirm: e.target.checked })} />
                  {profile.auto_confirm ? "Enabled" : "Disabled"}
                </label>
              </div>
            </div>
            <div className="pt-panel__save">
              {profileSavedAt ? <span className="pt-block__note">Saved {new Date(profileSavedAt).toLocaleString("en-AU")}</span> : null}
              <button type="button" className="pt-btn pt-btn--primary" onClick={commitProfile}>Save changes</button>
            </div>
          </div>
        ) : null}
      </PortalShell>
      <PortalToast message={toast} show={Boolean(toast)} />
    </>
  );
}
