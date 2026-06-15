"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ExploreSummaryMap } from "@/components/explore-summary-map";
import { SectionCard } from "@/components/section-card";
import { createBooking, formatDisplayTime, type BookingResponse } from "@/lib/live-api";
import { loadExploreTourSummary } from "@/lib/explore-tour-summary";
import { useRemoteWineryProfiles, type RemoteWineryProfile } from "@/lib/remote-winery-profiles";
import { wineryCatalog } from "@/lib/winery-catalog";
import { slugToWineryUuid } from "@/lib/winery-id";
import { getLocale, type AppLocale } from "@/lib/locale";
import { EXPLORE_I18N, fillTemplate, intlForLocale } from "../explore-i18n";

export default function ExploreSummaryPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [booking, setBooking] = useState<BookingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const summary = useMemo(() => loadExploreTourSummary(), []);
  const { profilesById } = useRemoteWineryProfiles();
  const [locale, setLocaleState] = useState<AppLocale>("en");
  useEffect(() => {
    setLocaleState(getLocale());
  }, []);
  const t = EXPLORE_I18N[locale];
  const intlTag = intlForLocale(locale);
  // Contact details for the booking. Name carries through from the quiz; email is
  // collected here (the wizard doesn't ask for it).
  const [leadName, setLeadName] = useState("");
  const [leadEmail, setLeadEmail] = useState("");
  useEffect(() => {
    if (summary) {
      setLeadName((current) => current || summary.lead_name || "");
      setLeadEmail((current) => current || summary.lead_email || "");
    }
  }, [summary]);

  function formatSummaryDate(iso: string) {
    const parsed = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) {
      return iso;
    }
    try {
      return parsed.toLocaleDateString(intlTag, { weekday: "long", day: "numeric", month: "long" });
    } catch {
      return parsed.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
    }
  }

  const orderedSummaryStops = useMemo(() => {
    if (!summary) {
      return [];
    }

    const stopsByUuid = new Map(summary.stops.map((stop) => [stop.winery_id, stop]));
    const stopsByName = new Map(summary.stops.map((stop) => [stop.winery_name.trim().toLowerCase(), stop]));
    const fallbackBySlug = new Map(wineryCatalog.map((entry) => [entry.id, entry] as const));

    if (summary.matched_winery_ids.length === 0) {
      return summary.stops;
    }

    return summary.matched_winery_ids.map((slug) => {
      const wineryUuid = slugToWineryUuid(slug);
      const existingStop = stopsByUuid.get(wineryUuid);
      if (existingStop) {
        return existingStop;
      }

      const fallbackCatalog = fallbackBySlug.get(slug);
      const fallbackName = fallbackCatalog?.name?.trim().toLowerCase() ?? "";
      const fallbackStop = fallbackName ? stopsByName.get(fallbackName) : undefined;
      if (fallbackStop) {
        return {
          ...fallbackStop,
          winery_id: wineryUuid,
        };
      }

      return {
        winery_id: wineryUuid,
        winery_name: fallbackCatalog?.name ?? slug,
        arrival_time: "",
        departure_time: "",
        drive_minutes: 0,
      };
    });
  }, [summary]);

  const pricing = useMemo(() => {
    if (!summary) {
      return { subtotal: 0, pricedStops: 0, missingStops: 0 };
    }

    let subtotal = 0;
    let pricedStops = 0;
    let missingStops = 0;
    for (const stop of orderedSummaryStops) {
      const profile = profilesById[stop.winery_id];
      const tastingPrice = profile?.tasting_price ?? stop.tasting_price;
      if (typeof tastingPrice === "number") {
        subtotal += tastingPrice;
        pricedStops += 1;
      } else {
        missingStops += 1;
      }
    }

    return { subtotal, pricedStops, missingStops };
  }, [orderedSummaryStops, profilesById, summary]);

  const routeMapStops = useMemo(() => {
    if (!summary) {
      return [];
    }

    const normalizedNameToProfile = new Map<string, RemoteWineryProfile>();
    for (const profile of Object.values(profilesById)) {
      normalizedNameToProfile.set(profile.name.trim().toLowerCase(), profile);
    }
    const slugToProfile = new Map<string, RemoteWineryProfile>();
    for (const winery of wineryCatalog) {
      const profile = profilesById[slugToWineryUuid(winery.id)];
      if (profile) {
        slugToProfile.set(winery.id, profile);
      }
    }

    function resolveProfileForStop(stop: { winery_id: string; winery_name: string }): RemoteWineryProfile | undefined {
      const byUuid = profilesById[stop.winery_id];
      if (byUuid) {
        return byUuid;
      }
      const bySlug = slugToProfile.get(stop.winery_id);
      if (bySlug) {
        return bySlug;
      }
      const stopName = stop.winery_name.trim().toLowerCase();
      return normalizedNameToProfile.get(stopName);
    }

    const normalizedNameToCatalog = new Map(
      wineryCatalog.map((entry) => [entry.name.trim().toLowerCase(), entry] as const),
    );
    const slugToCatalog = new Map(wineryCatalog.map((entry) => [entry.id, entry] as const));

    function resolveCatalogForStop(stop: { winery_id: string; winery_name: string }) {
      const bySlug = slugToCatalog.get(stop.winery_id);
      if (bySlug) {
        return bySlug;
      }
      const byUuid = wineryCatalog.find((entry) => slugToWineryUuid(entry.id) === stop.winery_id);
      if (byUuid) {
        return byUuid;
      }
      return normalizedNameToCatalog.get(stop.winery_name.trim().toLowerCase());
    }

    return orderedSummaryStops
      .map((stop) => {
        const winery = resolveProfileForStop(stop);
        const catalogFallback = resolveCatalogForStop(stop);
        const latitude = winery?.latitude ?? catalogFallback?.latitude;
        const longitude = winery?.longitude ?? catalogFallback?.longitude;
        const hasCoordinates =
          typeof latitude === "number" &&
          Number.isFinite(latitude) &&
          typeof longitude === "number" &&
          Number.isFinite(longitude);
        if (!hasCoordinates) {
          return null;
        }
        return {
          winery_id: stop.winery_id,
          winery_name: stop.winery_name,
          address: winery?.address ?? catalogFallback?.address,
          latitude,
          longitude,
        };
      })
      .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  }, [orderedSummaryStops, profilesById, summary]);

  const stopsMissingCoordinates = useMemo(() => {
    if (!summary) {
      return 0;
    }
    return Math.max(orderedSummaryStops.length - routeMapStops.length, 0);
  }, [orderedSummaryStops.length, routeMapStops.length, summary]);

  function formatDisplayTimeSafe(value: string) {
    if (!value) {
      return "";
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return "";
    }
    return formatDisplayTime(value);
  }

  async function handleBook() {
    if (!summary) {
      return;
    }

    if (!leadName.trim() || !leadEmail.trim()) {
      setError(t.summary.needContact);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const created = await createBooking({
        lead_name: leadName.trim(),
        lead_email: leadEmail.trim(),
        booking_date: summary.preview_date,
        preferred_start_time: summary.preferred_start_time,
        preferred_end_time: summary.preferred_end_time,
        pickup_location: summary.pickup_location,
        party_size: summary.party_size,
        preferred_wineries: summary.stops.map((stop) => stop.winery_id),
      });
      setBooking(created);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t.summary.bookingFailed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell
      eyebrow="Explore"
      title={t.summary.pageTitle}
      intro={t.summary.pageIntro}
      showWorkflowStatus={false}
      navMode="public"
    >
      <div className="exploreLayout">
        {!summary ? (
          <SectionCard title={t.summary.noSummaryTitle} description={t.summary.noSummaryDesc}>
            <div className="ctaRow">
              <button type="button" className="buttonPrimary" onClick={() => router.push("/explore")}>
                {t.summary.backToExplore}
              </button>
            </div>
          </SectionCard>
        ) : (
          <>
            <SectionCard
              title={t.summary.itinTitle}
              description={fillTemplate(t.summary.previewMeta, {
                date: formatSummaryDate(summary.preview_date),
                n: summary.party_size,
              })}
            >
              <div className="summaryPageSplit">
                <div className="summaryPageLeft">
                  {!summary.days || summary.days.length <= 1
                    ? summary.justification
                      ? (
                        <div className="summaryWhyCard">
                          <p className="summaryWhyLabel">{t.result.whyLabel}</p>
                          <p>{summary.justification}</p>
                        </div>
                      )
                      : null
                    : null}
                  <div className="schedulePreviewCard">
                    {(() => {
                      const renderStopRow = (
                        stop: (typeof orderedSummaryStops)[number],
                        index: number,
                        keyPrefix: string,
                      ) => {
                        const arrival = formatDisplayTimeSafe(stop.arrival_time);
                        const departure = formatDisplayTimeSafe(stop.departure_time);
                        const profile = profilesById[stop.winery_id];
                        const tastingPrice = profile?.tasting_price ?? stop.tasting_price;
                        return (
                          <div key={`${keyPrefix}-${stop.winery_id}-${index}`} className="tourSummaryRow">
                            <div>
                              {arrival ? <p className="timelineTime">{arrival}</p> : null}
                              <h3>{stop.winery_name}</h3>
                              {departure ? (
                                <p className="subtle">{fillTemplate(t.summary.departAt, { time: departure })}</p>
                              ) : (
                                <p className="subtle">{t.summary.timeTbd}</p>
                              )}
                            </div>
                            <div className="tourSummaryPrice">
                              {typeof tastingPrice === "number" ? `$${tastingPrice}` : t.summary.tastingFeeTbd}
                            </div>
                          </div>
                        );
                      };

                      const renderLunchRow = (
                        lunch: NonNullable<typeof summary.lunch>,
                        keyPrefix: string,
                      ) => {
                        const arrival = formatDisplayTimeSafe(lunch.arrival_time);
                        const departure = formatDisplayTimeSafe(lunch.departure_time);
                        return (
                          <div key={`${keyPrefix}-lunch`} className="tourSummaryRow tourSummaryLunchRow">
                            <div>
                              {arrival ? <p className="timelineTime">{arrival}</p> : null}
                              <h3>{t.result.lunchLabel} · {lunch.winery_name}</h3>
                              {lunch.food_description ? (
                                <p className="subtle">{lunch.food_description}</p>
                              ) : null}
                              {departure ? <p className="subtle">{fillTemplate(t.summary.departAt, { time: departure })}</p> : null}
                            </div>
                            <div className="tourSummaryPrice">{t.result.lunchLabel}</div>
                          </div>
                        );
                      };

                      const renderWeatherCard = (
                        weather: NonNullable<typeof summary.weather>,
                        keyPrefix: string,
                      ) => (
                        <div key={`${keyPrefix}-weather`} className="summaryWeatherCard">
                          <h4>{weather.summary}</h4>
                          <p className="summaryWeatherSource">
                            {weather.source === "forecast" ? t.result.weatherForecast : t.result.weatherTypical}
                          </p>
                          <div className="summaryWeatherStats">
                            <span>
                              {weather.temp_min_c}&deg; – {weather.temp_max_c}&deg;C
                            </span>
                            <span>{fillTemplate(t.result.rainChance, { n: weather.rain_probability_percent })}</span>
                          </div>
                          <ul>
                            {weather.clothing.map((tip, index) => (
                              <li key={index}>{tip}</li>
                            ))}
                          </ul>
                        </div>
                      );

                      // Render the stops in order, slotting the lunch row in right
                      // after the winery that hosts it (lunch occupies the gap after
                      // that tasting), so the timeline stays chronological. If the
                      // host winery isn't among these stops, append lunch at the end.
                      const renderStopsWithLunch = (
                        stops: typeof orderedSummaryStops,
                        lunch: typeof summary.lunch,
                        keyPrefix: string,
                      ) => {
                        const rows: ReactNode[] = [];
                        let lunchPlaced = false;
                        stops.forEach((stop, index) => {
                          rows.push(renderStopRow(stop, index, keyPrefix));
                          if (lunch && !lunchPlaced && lunch.winery_id === stop.winery_id) {
                            rows.push(renderLunchRow(lunch, keyPrefix));
                            lunchPlaced = true;
                          }
                        });
                        if (lunch && !lunchPlaced) {
                          rows.push(renderLunchRow(lunch, keyPrefix));
                        }
                        return rows;
                      };

                      // Multi-day plans render one labelled section per day; single-day
                      // plans keep the original flat list (combined `stops`).
                      if (summary.days && summary.days.length > 1) {
                        return summary.days.map((day) => (
                          <div key={`day-${day.day_index}`} className="multiDaySummarySection">
                            <h4 className="multiDaySummaryHeading">
                              {fillTemplate(t.result.dayHeading, { n: day.day_index + 1 })} - {formatSummaryDate(day.date)}
                            </h4>
                            {day.justification ? (
                              <div className="summaryWhyCard">
                                <p className="summaryWhyLabel">{t.summary.whyDay}</p>
                                <p>{day.justification}</p>
                              </div>
                            ) : null}
                            {renderStopsWithLunch(day.stops, day.lunch, `day-${day.day_index}`)}
                            {day.weather ? renderWeatherCard(day.weather, `day-${day.day_index}`) : null}
                          </div>
                        ));
                      }

                      return (
                        <>
                          {renderStopsWithLunch(orderedSummaryStops, summary.lunch, "all")}
                          {summary.weather ? renderWeatherCard(summary.weather, "all") : null}
                        </>
                      );
                    })()}
                  </div>
                  <div className="callout">
                    <p>
                      <strong>{t.summary.subtotalLabel}:</strong> ${pricing.subtotal.toFixed(2)}
                    </p>
                    <p className="subtle">
                      {fillTemplate(t.summary.pricedNote, {
                        priced: pricing.pricedStops,
                        missing: pricing.missingStops,
                      })}
                    </p>
                    <p className="subtle">{t.summary.transportNote}</p>
                  </div>
                  <div className="field">
                    <label htmlFor="summary-name">{t.summary.contactTitle}</label>
                    <input
                      id="summary-name"
                      className="inputLike inputField"
                      value={leadName}
                      placeholder={t.summary.contactNamePh}
                      aria-label={t.summary.contactName}
                      onChange={(event) => setLeadName(event.target.value)}
                    />
                    <input
                      className="inputLike inputField"
                      type="email"
                      value={leadEmail}
                      placeholder={t.summary.contactEmailPh}
                      aria-label={t.summary.contactEmail}
                      onChange={(event) => setLeadEmail(event.target.value)}
                      style={{ marginTop: 8 }}
                    />
                  </div>
                  <div className="ctaRow">
                    <button type="button" className="buttonGhost" onClick={() => router.push("/custom")}>
                      {t.summary.customise}
                    </button>
                    <button type="button" className="buttonPrimary" onClick={handleBook} disabled={submitting}>
                      {submitting ? t.summary.booking : t.summary.bookTour}
                    </button>
                  </div>
                  {booking ? (
                    <div className="callout successCallout">
                      {fillTemplate(t.summary.bookingCreated, { ref: booking.bookingId })}
                    </div>
                  ) : null}
                  {error ? <div className="callout errorCallout">{error}</div> : null}
                </div>
                <div className="summaryPageRight">
                  <div className="summaryMapCard">
                    <h3>{t.summary.mapTitle}</h3>
                    <p className="subtle">{t.summary.mapNote}</p>
                    <ExploreSummaryMap stops={routeMapStops} pickupLocation={summary.pickup_location} />
                    {stopsMissingCoordinates > 0 ? (
                      <p className="subtle">
                        {fillTemplate(t.summary.mapMissing, { n: stopsMissingCoordinates })}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </SectionCard>
          </>
        )}
      </div>
    </AppShell>
  );
}
