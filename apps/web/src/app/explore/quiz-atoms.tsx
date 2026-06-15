"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AppLocale } from "@/lib/locale";
import { EXPLORE_LOCALES } from "./explore-i18n";

// The Tailor Moments wordmark, rendered in the flow's brand face. `light` is used
// on the dark concierge rail.
export function Wordmark({ light }: { light?: boolean }) {
  return (
    <span className="tm-wordmark" style={{ color: light ? "var(--tm-cream)" : "var(--tm-heading)" }}>
      <span className="tm-wordmark__name">Tailor Moments</span>
      <span className="tm-wordmark__rule" />
      <span className="tm-wordmark__tag">Your Way</span>
    </span>
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
