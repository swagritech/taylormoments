"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ExploreSummaryMap } from "@/components/explore-summary-map";
import { createBooking, formatDisplayTime, type BookingResponse } from "@/lib/live-api";
import { loadExploreTourSummary } from "@/lib/explore-tour-summary";
import { useRemoteWineryProfiles, type RemoteWineryProfile } from "@/lib/remote-winery-profiles";
import { wineryCatalog } from "@/lib/winery-catalog";
import { slugToWineryUuid } from "@/lib/winery-id";
import { getLocale, setLocale, type AppLocale } from "@/lib/locale";
import { EXPLORE_I18N, fillTemplate, intlForLocale, scriptForLocale } from "../explore-i18n";
import { LangSelect, Wordmark } from "../quiz-atoms";
import "../explore-flow.css";

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

  const script = scriptForLocale(locale);

  function changeLocale(code: AppLocale) {
    setLocaleState(code);
    setLocale(code);
  }

  function tastingPriceForStop(stop: { winery_id: string; tasting_price?: number }) {
    const profile = profilesById[stop.winery_id];
    return profile?.tasting_price ?? stop.tasting_price;
  }

  function renderStop(stop: (typeof orderedSummaryStops)[number], key: string) {
    const arrival = formatDisplayTimeSafe(stop.arrival_time);
    const departure = formatDisplayTimeSafe(stop.departure_time);
    const price = tastingPriceForStop(stop);
    return (
      <div className="stop" key={`stop-${key}`}>
        <div className="stop__time">{arrival || "—"}</div>
        <div className="stop__body">
          <div className="stop__row">
            <span className="stop__name">{stop.winery_name}</span>
            <span className="stop__tag">
              {typeof price === "number" ? `$${price} ${t.result.pp}` : t.summary.tastingFeeTbd}
            </span>
          </div>
          <p className="stop__fee">
            {departure ? fillTemplate(t.summary.departAt, { time: departure }) : t.summary.timeTbd}
          </p>
        </div>
      </div>
    );
  }

  function renderLunch(lunch: NonNullable<NonNullable<typeof summary>["lunch"]>, key: string) {
    const arrival = formatDisplayTimeSafe(lunch.arrival_time);
    const departure = formatDisplayTimeSafe(lunch.departure_time);
    return (
      <div className="stop stop--lunch" key={`lunch-${key}`}>
        <div className="stop__time">{arrival || "—"}</div>
        <div className="stop__body">
          <div className="stop__row">
            <span className="stop__name">
              {t.result.lunchLabel} · {lunch.winery_name}
            </span>
          </div>
          <p className="stop__note">{lunch.food_description || t.result.lunchNote}</p>
          {departure ? (
            <p className="stop__fee">{fillTemplate(t.summary.departAt, { time: departure })}</p>
          ) : null}
        </div>
      </div>
    );
  }

  function renderWeather(weather: NonNullable<NonNullable<typeof summary>["weather"]>) {
    return (
      <div className="weather">
        <div className="weather__head">
          <span className="weather__summary">{weather.summary}</span>
          <span className="weather__source">
            {weather.source === "forecast" ? t.result.weatherForecast : t.result.weatherTypical}
          </span>
        </div>
        <div className="weather__stats">
          <span>
            {weather.temp_min_c}° – {weather.temp_max_c}°C
          </span>
          <span>{fillTemplate(t.result.rainChance, { n: weather.rain_probability_percent })}</span>
        </div>
        <p className="weather__wearLabel">{t.result.weatherWear}</p>
        <ul className="weather__list">
          {weather.clothing.map((tip, index) => (
            <li key={index}>{tip}</li>
          ))}
        </ul>
      </div>
    );
  }

  type SummaryDay = {
    index: number;
    label?: string;
    justification?: string;
    stops: typeof orderedSummaryStops;
    lunch: NonNullable<typeof summary>["lunch"];
    weather: NonNullable<typeof summary>["weather"];
  };

  const needTransport = summary?.need_transport ?? "yes";

  function renderDrive(minutes: number, key: string, fromOrigin: boolean) {
    if (!minutes || minutes <= 0) {
      return null;
    }
    const template = fromOrigin
      ? needTransport === "yes"
        ? t.result.driveFromYes
        : t.result.driveFromNo
      : needTransport === "yes"
        ? t.result.driveYes
        : t.result.driveNo;
    return (
      <div className="drive" key={`drive-${key}`}>
        {fillTemplate(template, { n: minutes })}
      </div>
    );
  }

  function renderDay(day: SummaryDay, multi: boolean) {
    const rows: ReactNode[] = [];
    let lunchPlaced = false;
    // The first stop's drive_minutes is the leg from the pickup/start to it.
    const firstLeg = day.stops[0]?.drive_minutes ?? 0;
    const originRow = renderDrive(firstLeg, `${day.index}-origin`, true);
    if (originRow) {
      rows.push(originRow);
    }
    day.stops.forEach((stop, index) => {
      rows.push(renderStop(stop, `${day.index}-${index}`));
      if (day.lunch && !lunchPlaced && day.lunch.winery_id === stop.winery_id) {
        rows.push(renderLunch(day.lunch, `${day.index}`));
        lunchPlaced = true;
      }
      const nextLeg = day.stops[index + 1]?.drive_minutes ?? 0;
      const betweenRow = renderDrive(nextLeg, `${day.index}-${index}-next`, false);
      if (betweenRow) {
        rows.push(betweenRow);
      }
    });
    if (day.lunch && !lunchPlaced) {
      rows.push(renderLunch(day.lunch, `${day.index}`));
    }
    return (
      <Fragment key={`day-${day.index}`}>
        {day.label ? (
          <div className="itinDay">
            <span className="itinDay__label">{day.label}</span>
          </div>
        ) : null}
        {multi && day.justification ? (
          <div className="itinDay">
            <span className="stop__note">{day.justification}</span>
          </div>
        ) : null}
        {rows}
        {day.weather ? renderWeather(day.weather) : null}
      </Fragment>
    );
  }

  const isMulti = Boolean(summary?.days && summary.days.length > 1);
  const days: SummaryDay[] = !summary
    ? []
    : isMulti
      ? summary.days!.map((day) => ({
          index: day.day_index,
          label: `${fillTemplate(t.result.dayHeading, { n: day.day_index + 1 })} · ${formatSummaryDate(day.date)}`,
          justification: day.justification,
          stops: day.stops,
          lunch: day.lunch,
          weather: day.weather,
        }))
      : [
          {
            index: 0,
            stops: orderedSummaryStops,
            lunch: summary.lunch,
            weather: summary.weather,
          },
        ];

  return (
    <div className="tm-flow" lang={locale} data-script={script}>
      <div className="result">
        <div className="result__bar">
          <Wordmark />
          <LangSelect locale={locale} onChange={changeLocale} label={t.ui.language} />
        </div>
        <div className="result__inner">
          {!summary ? (
            <div style={{ textAlign: "center", marginTop: 40 }}>
              <p className="tm-kicker">{t.summary.pageTitle}</p>
              <h1 className="result__title tm-display" style={{ marginTop: 10 }}>
                {t.summary.noSummaryTitle}
              </h1>
              <p className="result__note">{t.summary.noSummaryDesc}</p>
              <div className="result__actions">
                <button type="button" className="btn btn--primary" onClick={() => router.push("/explore")}>
                  {t.summary.backToExplore}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="result__hero reveal">
                <p className="tm-kicker">{t.summary.pageTitle}</p>
                <h1 className="result__title tm-display">
                  {fillTemplate(t.result.title, { name: leadName.trim() || t.guestFallback })}
                </h1>
                <p className="result__em">{formatSummaryDate(summary.preview_date)}</p>
              </div>

              <div className="result__meta">
                <span className="result__metaItem">
                  <b>{summary.party_size}</b>
                  <span>{t.result.metaGuests}</span>
                </span>
                <span className="result__metaItem">
                  <b>{orderedSummaryStops.length}</b>
                  <span>{t.result.metaCellar}</span>
                </span>
                <span className="result__metaItem">
                  <b>{t.pace[summary.day_pace].label}</b>
                  <span>{t.result.metaPace}</span>
                </span>
              </div>

              {!isMulti && summary.justification ? (
                <div className="concierge reveal">
                  <p className="tm-kicker concierge__kicker">{t.result.whyLabel}</p>
                  <p className="concierge__body">{summary.justification}</p>
                </div>
              ) : null}

              <div className="itin">
                {days.map((day) => renderDay(day, isMulti))}
                <div className="result__footer">
                  <div className="result__subtotal">
                    {t.summary.subtotalLabel} <b>${pricing.subtotal.toFixed(0)}</b>
                  </div>
                </div>
              </div>

              <p className="result__note">
                {fillTemplate(t.summary.pricedNote, { priced: pricing.pricedStops, missing: pricing.missingStops })}
              </p>
              <p className="result__note">{t.summary.transportNote}</p>

              <div className="concierge" style={{ marginTop: 22 }}>
                <p className="tm-kicker concierge__kicker">{t.summary.contactTitle}</p>
                <div className="field">
                  <label className="field__label" htmlFor="summary-name">{t.summary.contactName}</label>
                  <input
                    id="summary-name"
                    className="input"
                    value={leadName}
                    placeholder={t.summary.contactNamePh}
                    onChange={(event) => setLeadName(event.target.value)}
                  />
                </div>
                <div className="field">
                  <label className="field__label" htmlFor="summary-email">{t.summary.contactEmail}</label>
                  <input
                    id="summary-email"
                    className="input"
                    type="email"
                    value={leadEmail}
                    placeholder={t.summary.contactEmailPh}
                    onChange={(event) => setLeadEmail(event.target.value)}
                  />
                </div>
              </div>

              <div className="result__actions">
                <button type="button" className="btn btn--ghost" onClick={() => router.push("/custom")}>
                  {t.summary.customise}
                </button>
                <button type="button" className="btn btn--primary" onClick={handleBook} disabled={submitting}>
                  {submitting ? t.summary.booking : t.summary.bookTour}
                </button>
              </div>
              {booking ? (
                <p className="result__note" style={{ color: "var(--tm-teal)" }}>
                  {fillTemplate(t.summary.bookingCreated, { ref: booking.bookingId })}
                </p>
              ) : null}
              {error ? (
                <p className="result__note" style={{ color: "var(--tm-danger)" }}>
                  {error}
                </p>
              ) : null}

              <div className="itin" style={{ marginTop: 24 }}>
                <div style={{ padding: "20px 24px" }}>
                  <p className="chapter__label">{t.summary.mapTitle}</p>
                  <p className="stop__note" style={{ margin: "8px 0 14px" }}>{t.summary.mapNote}</p>
                  <ExploreSummaryMap stops={routeMapStops} pickupLocation={summary.pickup_location} />
                  {stopsMissingCoordinates > 0 ? (
                    <p className="stop__note" style={{ marginTop: 10 }}>
                      {fillTemplate(t.summary.mapMissing, { n: stopsMissingCoordinates })}
                    </p>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
