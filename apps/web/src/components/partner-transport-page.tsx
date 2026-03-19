"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { useDemoState } from "@/lib/demo-state";
import { useAuth } from "@/lib/auth-state";
import { transportProviders } from "@/lib/demo-data";

type TransportSectionKey = "fleet" | "service" | "availability" | "pricing" | "compliance";

type VehicleDraft = {
  id: string;
  vehicle_type: string;
  vehicle_make_model: string;
  max_passengers: string;
  wheelchair_accessible: boolean;
  vehicle_features: string[];
};

type PickupZonePriceDraft = {
  id: string;
  zone: string;
  price_aud: string;
};

type TransportProfileDraft = {
  vehicles: VehicleDraft[];
  languages: string[];
  pickup_zones: string[];
  available_days: string[];
  available_hours_start: string;
  available_hours_end: string;
  advance_notice: string;
  blocked_dates: string[];
  max_charters_per_day: string;
  auto_confirm: boolean;
  full_day_available: boolean;
  multi_day_available: boolean;
  pickup_zone_prices: PickupZonePriceDraft[];
  abn: string;
  bank_details: string;
  gst: string;
  insurance_confirmed: boolean;
};

const VEHICLE_TYPE_OPTIONS = ["Sedan", "Premium van", "Mini bus", "Midi coach", "SUV"] as const;
const VEHICLE_FEATURE_OPTIONS = [
  "Child seats",
  "Refrigerated water",
  "Onboard Wi-Fi",
  "Luggage trailer",
  "Luxury interior",
  "Wheelchair lift",
] as const;
const LANGUAGE_OPTIONS = ["English", "Mandarin", "Cantonese", "Vietnamese", "Japanese", "Korean"] as const;
const PICKUP_ZONE_OPTIONS = [
  "Margaret River town",
  "Wilyabrup",
  "Yallingup",
  "Dunsborough",
  "Busselton",
  "Prevelly/Gnarabup",
] as const;
const DAY_OPTIONS = [
  { value: "mon", label: "Monday" },
  { value: "tue", label: "Tuesday" },
  { value: "wed", label: "Wednesday" },
  { value: "thu", label: "Thursday" },
  { value: "fri", label: "Friday" },
  { value: "sat", label: "Saturday" },
  { value: "sun", label: "Sunday" },
] as const;
const ADVANCE_NOTICE_OPTIONS = [
  { value: "same_day", label: "Same day" },
  { value: "24_hours", label: "24 hours" },
  { value: "48_hours", label: "48 hours (default)" },
  { value: "72_hours", label: "72 hours" },
  { value: "1_week", label: "1 week" },
] as const;
const TRANSPORT_SECTION_MENU: Array<{ key: TransportSectionKey; label: string }> = [
  { key: "fleet", label: "Fleet" },
  { key: "service", label: "Service area" },
  { key: "availability", label: "Availability" },
  { key: "pricing", label: "Pricing" },
  { key: "compliance", label: "Compliance" },
];

function makeVehicleDraft(): VehicleDraft {
  return {
    id: crypto.randomUUID(),
    vehicle_type: "Premium van",
    vehicle_make_model: "",
    max_passengers: "",
    wheelchair_accessible: false,
    vehicle_features: [],
  };
}

function makePickupZonePriceDraft(): PickupZonePriceDraft {
  return {
    id: crypto.randomUUID(),
    zone: "",
    price_aud: "",
  };
}

function makeDefaultProfile(): TransportProfileDraft {
  return {
    vehicles: [makeVehicleDraft()],
    languages: ["English"],
    pickup_zones: ["Margaret River town"],
    available_days: ["mon", "tue", "wed", "thu", "fri"],
    available_hours_start: "09:00",
    available_hours_end: "18:00",
    advance_notice: "48_hours",
    blocked_dates: [],
    max_charters_per_day: "",
    auto_confirm: false,
    full_day_available: true,
    multi_day_available: false,
    pickup_zone_prices: [makePickupZonePriceDraft()],
    abn: "",
    bank_details: "",
    gst: "",
    insurance_confirmed: false,
  };
}

function toggleInList(list: string[], value: string, checked: boolean) {
  const next = new Set(list);
  if (checked) {
    next.add(value);
  } else {
    next.delete(value);
  }
  return Array.from(next);
}

export function PartnerTransportPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { activeBooking, cannedTransportJobs, liveTransportJob, request } = useDemoState();
  const jobs = liveTransportJob ? [liveTransportJob, ...cannedTransportJobs] : cannedTransportJobs;

  const [activeSection, setActiveSection] = useState<TransportSectionKey>("fleet");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [profilesByCompany, setProfilesByCompany] = useState<Record<string, TransportProfileDraft>>({});
  const [profileSavedAt, setProfileSavedAt] = useState<string | null>(null);
  const [blockedDateDraft, setBlockedDateDraft] = useState("");

  const transportCompanies = useMemo(() => {
    const names = new Set<string>();
    for (const provider of transportProviders) {
      names.add(provider.name);
    }
    for (const job of jobs) {
      names.add(job.recommendedProvider);
    }
    if (user?.transport_company) {
      names.add(user.transport_company);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [jobs, user?.transport_company]);

  const profile = profilesByCompany[selectedCompany] ?? makeDefaultProfile();

  const companyJobs = useMemo(
    () => jobs.filter((job) => !selectedCompany || job.recommendedProvider === selectedCompany),
    [jobs, selectedCompany],
  );

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
      const raw = window.localStorage.getItem("tm_transport_profiles_v1");
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, TransportProfileDraft>;
        setProfilesByCompany(parsed);
      }
    } catch {
      setProfilesByCompany({});
    }
  }, []);

  useEffect(() => {
    if (transportCompanies.length === 0) {
      return;
    }
    if (user?.role === "transport") {
      setSelectedCompany(user.transport_company ?? transportCompanies[0] ?? "");
      return;
    }
    setSelectedCompany((current) => current || transportCompanies[0] || "");
  }, [transportCompanies, user?.role, user?.transport_company]);

  function updateProfile(updater: (current: TransportProfileDraft) => TransportProfileDraft) {
    if (!selectedCompany) {
      return;
    }
    setProfilesByCompany((current) => ({
      ...current,
      [selectedCompany]: updater(current[selectedCompany] ?? makeDefaultProfile()),
    }));
  }

  function updateVehicle(vehicleId: string, updater: (current: VehicleDraft) => VehicleDraft) {
    updateProfile((current) => ({
      ...current,
      vehicles: current.vehicles.map((vehicle) => (vehicle.id === vehicleId ? updater(vehicle) : vehicle)),
    }));
  }

  function saveTransportProfile() {
    try {
      window.localStorage.setItem("tm_transport_profiles_v1", JSON.stringify(profilesByCompany));
      setProfileSavedAt(new Date().toISOString());
    } catch {
      setProfileSavedAt(new Date().toISOString());
    }
  }

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
          <p className="statValue">{companyJobs.filter((job) => job.status === "Open").length}</p>
          <p className="statHint">Jobs currently available for acceptance.</p>
        </div>
        <div className="statCard">
          <p className="statLabel">Assigned jobs</p>
          <p className="statValue">{companyJobs.filter((job) => job.status !== "Open").length}</p>
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

      <SectionCard
        title="Transport provider settings"
        description="Manage fleet, service, availability, pricing, and compliance details."
      >
        <div className="profileEditorLayout">
          <aside className="profileEditorMenu" aria-label="Transport profile sections">
            {TRANSPORT_SECTION_MENU.map((entry) => (
              <button
                key={entry.key}
                type="button"
                className={`profileMenuItem ${activeSection === entry.key ? "active" : ""}`}
                onClick={() => setActiveSection(entry.key)}
              >
                {entry.label}
              </button>
            ))}
          </aside>

          <div className="profileEditorPane">
            <div className="fieldRow">
              <div className="field">
                <label htmlFor="transportCompanySelect">Transport company</label>
                <select
                  id="transportCompanySelect"
                  className="inputLike inputField"
                  value={selectedCompany}
                  onChange={(event) => setSelectedCompany(event.target.value)}
                  disabled={user?.role === "transport"}
                >
                  {transportCompanies.map((company) => (
                    <option key={company} value={company}>
                      {company}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {activeSection === "fleet" ? (
              <div className="field">
                <label>Vehicle setup</label>
                <div className="experienceList">
                  {profile.vehicles.map((vehicle) => (
                    <div key={vehicle.id} className="listRow">
                      <div className="fieldRow">
                        <div className="field">
                          <label>Vehicle type</label>
                          <select
                            className="inputLike inputField"
                            value={vehicle.vehicle_type}
                            onChange={(event) =>
                              updateVehicle(vehicle.id, (current) => ({ ...current, vehicle_type: event.target.value }))
                            }
                          >
                            {VEHICLE_TYPE_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="field">
                          <label>Vehicle make/model</label>
                          <input
                            className="inputLike inputField"
                            value={vehicle.vehicle_make_model}
                            onChange={(event) =>
                              updateVehicle(vehicle.id, (current) => ({ ...current, vehicle_make_model: event.target.value }))
                            }
                            placeholder="Mercedes Sprinter 319"
                          />
                        </div>
                      </div>
                      <div className="fieldRow">
                        <div className="field">
                          <label>Max passengers</label>
                          <input
                            type="number"
                            min={1}
                            className="inputLike inputField"
                            value={vehicle.max_passengers}
                            onChange={(event) =>
                              updateVehicle(vehicle.id, (current) => ({ ...current, max_passengers: event.target.value }))
                            }
                          />
                        </div>
                        <div className="field">
                          <label className="choicePill">
                            <input
                              type="checkbox"
                              checked={vehicle.wheelchair_accessible}
                              onChange={(event) =>
                                updateVehicle(vehicle.id, (current) => ({
                                  ...current,
                                  wheelchair_accessible: event.target.checked,
                                }))
                              }
                            />
                            Wheelchair accessible
                          </label>
                        </div>
                      </div>
                      <div className="field">
                        <label>Vehicle features</label>
                        <div className="choiceRow profileChoiceGrid">
                          {VEHICLE_FEATURE_OPTIONS.map((feature) => (
                            <label key={`${vehicle.id}-${feature}`} className="choicePill">
                              <input
                                type="checkbox"
                                checked={vehicle.vehicle_features.includes(feature)}
                                onChange={(event) =>
                                  updateVehicle(vehicle.id, (current) => ({
                                    ...current,
                                    vehicle_features: toggleInList(current.vehicle_features, feature, event.target.checked),
                                  }))
                                }
                              />
                              {feature}
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="ctaRow">
                        <button
                          type="button"
                          className="buttonGhost"
                          onClick={() =>
                            updateProfile((current) => ({
                              ...current,
                              vehicles:
                                current.vehicles.length > 1
                                  ? current.vehicles.filter((entry) => entry.id !== vehicle.id)
                                  : current.vehicles,
                            }))
                          }
                        >
                          Remove vehicle
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="ctaRow">
                  <button
                    type="button"
                    className="buttonGhost"
                    onClick={() =>
                      updateProfile((current) => ({
                        ...current,
                        vehicles: [...current.vehicles, makeVehicleDraft()],
                      }))
                    }
                  >
                    Add vehicle
                  </button>
                </div>
              </div>
            ) : null}

            {activeSection === "service" ? (
              <>
                <div className="field">
                  <label>Languages</label>
                  <div className="choiceRow profileChoiceGrid">
                    {LANGUAGE_OPTIONS.map((language) => (
                      <label key={language} className="choicePill">
                        <input
                          type="checkbox"
                          checked={profile.languages.includes(language)}
                          onChange={(event) =>
                            updateProfile((current) => ({
                              ...current,
                              languages: toggleInList(current.languages, language, event.target.checked),
                            }))
                          }
                        />
                        {language}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label>Pickup zones</label>
                  <div className="choiceRow profileChoiceGrid">
                    {PICKUP_ZONE_OPTIONS.map((zone) => (
                      <label key={zone} className="choicePill">
                        <input
                          type="checkbox"
                          checked={profile.pickup_zones.includes(zone)}
                          onChange={(event) =>
                            updateProfile((current) => ({
                              ...current,
                              pickup_zones: toggleInList(current.pickup_zones, zone, event.target.checked),
                            }))
                          }
                        />
                        {zone}
                      </label>
                    ))}
                  </div>
                </div>
              </>
            ) : null}

            {activeSection === "availability" ? (
              <>
                <div className="field">
                  <label>Available days</label>
                  <div className="choiceRow profileChoiceGrid">
                    {DAY_OPTIONS.map((day) => (
                      <label key={day.value} className="choicePill">
                        <input
                          type="checkbox"
                          checked={profile.available_days.includes(day.value)}
                          onChange={(event) =>
                            updateProfile((current) => ({
                              ...current,
                              available_days: toggleInList(current.available_days, day.value, event.target.checked),
                            }))
                          }
                        />
                        {day.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="fieldRow">
                  <div className="field">
                    <label>Available from</label>
                    <input
                      type="time"
                      className="inputLike inputField"
                      value={profile.available_hours_start}
                      onChange={(event) =>
                        updateProfile((current) => ({ ...current, available_hours_start: event.target.value }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label>Available until</label>
                    <input
                      type="time"
                      className="inputLike inputField"
                      value={profile.available_hours_end}
                      onChange={(event) =>
                        updateProfile((current) => ({ ...current, available_hours_end: event.target.value }))
                      }
                    />
                  </div>
                </div>
                <div className="field">
                  <label>Advance notice</label>
                  <div className="choiceRow profileChoiceGrid">
                    {ADVANCE_NOTICE_OPTIONS.map((notice) => (
                      <label key={notice.value} className="choicePill">
                        <input
                          type="radio"
                          name="transportAdvanceNotice"
                          checked={profile.advance_notice === notice.value}
                          onChange={() =>
                            updateProfile((current) => ({
                              ...current,
                              advance_notice: notice.value,
                            }))
                          }
                        />
                        {notice.label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label>Blocked dates</label>
                  <div className="ctaRow">
                    <input
                      type="date"
                      className="inputLike inputField"
                      value={blockedDateDraft}
                      onChange={(event) => setBlockedDateDraft(event.target.value)}
                    />
                    <button
                      type="button"
                      className="buttonGhost"
                      onClick={() => {
                        if (!blockedDateDraft) {
                          return;
                        }
                        updateProfile((current) => ({
                          ...current,
                          blocked_dates: toggleInList(current.blocked_dates, blockedDateDraft, true),
                        }));
                        setBlockedDateDraft("");
                      }}
                    >
                      Add blocked date
                    </button>
                  </div>
                  <div className="ctaRow">
                    {profile.blocked_dates.map((date) => (
                      <button
                        key={date}
                        type="button"
                        className="buttonGhost"
                        onClick={() =>
                          updateProfile((current) => ({
                            ...current,
                            blocked_dates: current.blocked_dates.filter((entry) => entry !== date),
                          }))
                        }
                      >
                        {date} x
                      </button>
                    ))}
                  </div>
                </div>
                <div className="fieldRow">
                  <div className="field">
                    <label>Max charters per day (optional)</label>
                    <input
                      type="number"
                      min={0}
                      className="inputLike inputField"
                      value={profile.max_charters_per_day}
                      onChange={(event) =>
                        updateProfile((current) => ({ ...current, max_charters_per_day: event.target.value }))
                      }
                    />
                  </div>
                  <div className="field">
                    <label className="choicePill">
                      <input
                        type="checkbox"
                        checked={profile.auto_confirm}
                        onChange={(event) =>
                          updateProfile((current) => ({ ...current, auto_confirm: event.target.checked }))
                        }
                      />
                      Auto confirm jobs
                    </label>
                    <label className="choicePill">
                      <input
                        type="checkbox"
                        checked={profile.full_day_available}
                        onChange={(event) =>
                          updateProfile((current) => ({ ...current, full_day_available: event.target.checked }))
                        }
                      />
                      Full-day available
                    </label>
                    <label className="choicePill">
                      <input
                        type="checkbox"
                        checked={profile.multi_day_available}
                        onChange={(event) =>
                          updateProfile((current) => ({ ...current, multi_day_available: event.target.checked }))
                        }
                      />
                      Multi-day available
                    </label>
                  </div>
                </div>
              </>
            ) : null}

            {activeSection === "pricing" ? (
              <div className="field">
                <label>Pickup zones and pricing</label>
                <div className="experienceList">
                  {profile.pickup_zone_prices.map((entry) => (
                    <div key={entry.id} className="experienceRow">
                      <select
                        className="inputLike inputField"
                        value={entry.zone}
                        onChange={(event) =>
                          updateProfile((current) => ({
                            ...current,
                            pickup_zone_prices: current.pickup_zone_prices.map((zoneEntry) =>
                              zoneEntry.id === entry.id ? { ...zoneEntry, zone: event.target.value } : zoneEntry,
                            ),
                          }))
                        }
                      >
                        <option value="">Select zone</option>
                        {PICKUP_ZONE_OPTIONS.map((zone) => (
                          <option key={zone} value={zone}>
                            {zone}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        className="inputLike inputField"
                        value={entry.price_aud}
                        onChange={(event) =>
                          updateProfile((current) => ({
                            ...current,
                            pickup_zone_prices: current.pickup_zone_prices.map((zoneEntry) =>
                              zoneEntry.id === entry.id ? { ...zoneEntry, price_aud: event.target.value } : zoneEntry,
                            ),
                          }))
                        }
                        placeholder="Price (AUD)"
                      />
                      <button
                        type="button"
                        className="buttonGhost"
                        onClick={() =>
                          updateProfile((current) => ({
                            ...current,
                            pickup_zone_prices:
                              current.pickup_zone_prices.length > 1
                                ? current.pickup_zone_prices.filter((zoneEntry) => zoneEntry.id !== entry.id)
                                : current.pickup_zone_prices,
                          }))
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <div className="ctaRow">
                  <button
                    type="button"
                    className="buttonGhost"
                    onClick={() =>
                      updateProfile((current) => ({
                        ...current,
                        pickup_zone_prices: [...current.pickup_zone_prices, makePickupZonePriceDraft()],
                      }))
                    }
                  >
                    Add pickup zone price
                  </button>
                </div>
              </div>
            ) : null}

            {activeSection === "compliance" ? (
              <>
                <div className="field">
                  <label htmlFor="abnField">ABN</label>
                  <input
                    id="abnField"
                    className="inputLike inputField"
                    value={profile.abn}
                    onChange={(event) => updateProfile((current) => ({ ...current, abn: event.target.value }))}
                    placeholder="ABN"
                  />
                </div>
                <div className="field">
                  <label htmlFor="bankDetailsField">Bank details</label>
                  <textarea
                    id="bankDetailsField"
                    className="inputLike inputField"
                    rows={3}
                    value={profile.bank_details}
                    onChange={(event) => updateProfile((current) => ({ ...current, bank_details: event.target.value }))}
                    placeholder="Account name, BSB, account number"
                  />
                </div>
                <div className="field">
                  <label htmlFor="gstField">GST registration</label>
                  <input
                    id="gstField"
                    className="inputLike inputField"
                    value={profile.gst}
                    onChange={(event) => updateProfile((current) => ({ ...current, gst: event.target.value }))}
                    placeholder="GST number or status"
                  />
                </div>
                <div className="field">
                  <label className="choicePill">
                    <input
                      type="checkbox"
                      checked={profile.insurance_confirmed}
                      onChange={(event) =>
                        updateProfile((current) => ({ ...current, insurance_confirmed: event.target.checked }))
                      }
                    />
                    Insurance confirmed (required for go-live)
                  </label>
                </div>
              </>
            ) : null}

            <div className="ctaRow">
              <button type="button" className="buttonPrimary profileSaveButton" onClick={saveTransportProfile}>
                Save transport settings
              </button>
              {profileSavedAt ? <span className="meta">Saved {new Date(profileSavedAt).toLocaleString("en-AU")}</span> : null}
            </div>
          </div>
        </div>
      </SectionCard>
    </AppShell>
  );
}

