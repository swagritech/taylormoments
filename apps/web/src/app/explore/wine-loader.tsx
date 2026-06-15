"use client";

import { useEffect, useState } from "react";

// On-brand itinerary loader: a wine glass fills with garnet wine on a loop, under a
// cycling concierge caption + foil meter. Indeterminate (no real progress). Captions
// are passed in localized; cycling is gated off under reduced-motion.
export function WineGlassLoader({
  messages,
  kicker = "Tailor Moments",
}: {
  messages: string[];
  kicker?: string;
}) {
  const [index, setIndex] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || messages.length <= 1) {
      return;
    }
    const interval = window.setInterval(() => {
      setFadingOut(true);
      window.setTimeout(() => {
        setIndex((current) => (current + 1) % messages.length);
        setFadingOut(false);
      }, 560);
    }, 2600);
    return () => window.clearInterval(interval);
  }, [messages.length]);

  return (
    <div className="tmLoader" role="status" aria-live="polite">
      <div className="tmGlassWrap">
        <svg viewBox="0 0 188 360" aria-label="Composing your itinerary">
          <defs>
            <clipPath id="tmBowlClip">
              <path d="M44,46 C44,128 64,184 94,190 C124,184 144,128 144,46 Z" />
            </clipPath>
            <linearGradient id="tmWineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8e1f33" />
              <stop offset="48%" stopColor="#6a1226" />
              <stop offset="100%" stopColor="#45091a" />
            </linearGradient>
            <linearGradient id="tmGlintGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          </defs>

          <path className="tmGlassFill" d="M44,46 C44,128 64,184 94,190 C124,184 144,128 144,46 Z" />

          <g clipPath="url(#tmBowlClip)">
            <g className="tmWine">
              <rect x="-30" y="46" width="248" height="200" fill="url(#tmWineGrad)" />
              <g className="tmWave tmWaveBack">
                <path
                  fill="url(#tmWineGrad)"
                  d="M-30,46 q15,-9 30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 L218,70 L-30,70 Z"
                />
              </g>
              <g className="tmWave">
                <path
                  fill="url(#tmWineGrad)"
                  d="M-30,46 q15,8 30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 t30,0 L218,70 L-30,70 Z"
                />
              </g>
              <circle className="tmMote tmMote1" cx="78" cy="178" r="1.7" />
              <circle className="tmMote tmMote2" cx="104" cy="184" r="1.3" />
              <circle className="tmMote tmMote3" cx="92" cy="180" r="1.5" />
            </g>
          </g>

          <path
            className="tmGlassGlint"
            fill="url(#tmGlintGrad)"
            d="M58,66 C54,104 60,142 78,168 C66,140 64,104 70,68 Z"
          />

          <path className="tmGlassLine" d="M44,46 C44,128 64,184 94,190 C124,184 144,128 144,46" />
          <path className="tmGlassLine" d="M94,190 L94,300" />
          <path className="tmGlassLine" d="M62,312 C62,304 126,304 126,312 C126,320 62,320 62,312 Z" />
          <ellipse className="tmGlassRim" cx="94" cy="46" rx="50" ry="9" />
        </svg>
      </div>

      <div className="tmCap">
        <span className="tmCapKicker">{kicker}</span>
        <p className={`tmCapLine ${fadingOut ? "is-out" : ""}`}>{messages[index] ?? messages[0]}</p>
        <div className="tmMeter" />
      </div>
    </div>
  );
}
