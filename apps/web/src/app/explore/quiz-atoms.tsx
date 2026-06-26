"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AppLocale } from "@/lib/locale";
import { EXPLORE_LOCALES } from "./explore-i18n";

// The Tailor Moments wordmark, rendered in the flow's brand face. `light` is used
// on the dark concierge rail. Links back to the top of the homepage.
export function Wordmark({ light }: { light?: boolean }) {
  return (
    <Link
      href="/"
      className="tm-wordmark"
      style={{ color: light ? "var(--tm-cream)" : "var(--tm-heading)" }}
      aria-label="Tailor Moments — back to homepage"
    >
      <span className="tm-wordmark__name">Tailor Moments</span>
      <span className="tm-wordmark__rule" />
      <span className="tm-wordmark__tag">Your Way</span>
    </Link>
  );
}

// Language selector carried through every screen of the flow. Click-outside closes.
export function LangSelect({
  locale,
  onChange,
  light,
  label,
}: {
  locale: AppLocale;
  onChange: (code: AppLocale) => void;
  light?: boolean;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onDoc = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const current = EXPLORE_LOCALES.find((l) => l.code === locale) ?? EXPLORE_LOCALES[0];

  return (
    <div className={`tm-lang ${light ? "tm-lang--light" : ""}`} ref={ref}>
      <button
        type="button"
        className="tm-lang__btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="tm-lang__globe" aria-hidden="true">◍</span>
        <span className="tm-lang__current">{current.label}</span>
        <span className="tm-lang__caret" aria-hidden="true">▾</span>
      </button>
      {open ? (
        <ul className="tm-lang__menu" role="listbox">
          {EXPLORE_LOCALES.map((l) => (
            <li key={l.code} role="option" aria-selected={l.code === locale}>
              <button
                type="button"
                className={`tm-lang__opt ${l.code === locale ? "is-active" : ""}`}
                onClick={() => {
                  onChange(l.code);
                  setOpen(false);
                }}
              >
                {l.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// A multi/single-select choice card (title + optional description + check).
export function Card({
  selected,
  onClick,
  title,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  desc?: string;
}) {
  return (
    <button type="button" className={`card ${selected ? "is-selected" : ""}`} onClick={onClick} aria-pressed={selected}>
      <span className="card__check">✓</span>
      <span className="card__title">{title}</span>
      {desc ? <span className="card__desc">{desc}</span> : null}
    </button>
  );
}

// A single-line row card with a note on the right (pace, budget).
export function RowCard({
  selected,
  onClick,
  title,
  note,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  note?: string;
}) {
  return (
    <button
      type="button"
      className={`card rowcard ${selected ? "is-selected" : ""}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      <span className="rowcard__main">
        <span className="card__title">{title}</span>
        {note ? <span className="rowcard__note">{note}</span> : null}
      </span>
      <span className="card__check" style={{ position: "static" }}>✓</span>
    </button>
  );
}

// Google Places languageCode per app locale (localized suggestions).
const GOOGLE_LANGUAGE: Record<AppLocale, string> = { en: "en", "zh-Hans": "zh-CN", vi: "vi" };

export type PlaceSelection = {
  placeId: string;
  formattedAddress?: string;
  latitude?: number;
  longitude?: number;
};

// Address input with Google Places autocomplete (new Places REST API),
// region-restricted to Western Australia and localized to the active locale.
// Falls back to a plain text input if no API key is configured.
export function PlacesAutocomplete({
  id,
  value,
  locale,
  placeholder,
  onChange,
  onSelect,
}: {
  id?: string;
  value: string;
  locale: AppLocale;
  placeholder?: string;
  onChange: (value: string) => void;
  onSelect: (selection: PlaceSelection) => void;
}) {
  const [suggestions, setSuggestions] = useState<{ label: string; placeId: string }[]>([]);
  const [open, setOpen] = useState(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const languageCode = GOOGLE_LANGUAGE[locale] ?? "en";

  useEffect(() => {
    const query = value.trim();
    if (!query || query.length < 3 || !apiKey) {
      setSuggestions([]);
      return;
    }
    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text",
          },
          body: JSON.stringify({
            input: query,
            includedRegionCodes: ["AU"],
            languageCode,
            // Restrict to the Western Australia region.
            locationRestriction: {
              rectangle: {
                low: { latitude: -35.2, longitude: 112.9 },
                high: { latitude: -13.5, longitude: 129.0 },
              },
            },
          }),
        });
        if (!response.ok) {
          throw new Error("Places autocomplete failed");
        }
        const payload = (await response.json()) as {
          suggestions?: Array<{ placePrediction?: { placeId?: string; text?: { text?: string } } }>;
        };
        if (!active) {
          return;
        }
        setSuggestions(
          (payload.suggestions ?? [])
            .map((entry) => ({
              label: entry.placePrediction?.text?.text?.trim() ?? "",
              placeId: entry.placePrediction?.placeId?.trim() ?? "",
            }))
            .filter((entry) => entry.label && entry.placeId)
            .slice(0, 6),
        );
      } catch {
        if (active) {
          setSuggestions([]);
        }
      }
    }, 220);
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [value, apiKey, languageCode]);

  async function resolveCoords(placeId: string) {
    if (!apiKey || !placeId) {
      onSelect({ placeId });
      return;
    }
    try {
      const response = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
        method: "GET",
        headers: { "X-Goog-Api-Key": apiKey, "X-Goog-FieldMask": "formattedAddress,location" },
      });
      if (!response.ok) {
        throw new Error("Place details failed");
      }
      const payload = (await response.json()) as {
        formattedAddress?: string;
        location?: { latitude?: number; longitude?: number };
      };
      onSelect({
        placeId,
        formattedAddress: payload.formattedAddress?.trim(),
        latitude: payload.location?.latitude,
        longitude: payload.location?.longitude,
      });
    } catch {
      onSelect({ placeId });
    }
  }

  return (
    <div className="autocomplete">
      <input
        id={id}
        className="input"
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 140)}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
      />
      {open && suggestions.length > 0 ? (
        <div className="autocomplete__menu">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.placeId}
              type="button"
              className="autocomplete__opt"
              onMouseDown={(event) => {
                event.preventDefault();
                onChange(suggestion.label);
                void resolveCoords(suggestion.placeId);
                setOpen(false);
              }}
            >
              {suggestion.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// A rounded pill toggle (occasion, dietary).
export function Pill({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button type="button" className={`pill ${selected ? "is-selected" : ""}`} onClick={onClick} aria-pressed={selected}>
      {children}
    </button>
  );
}
