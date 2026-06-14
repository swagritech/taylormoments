"use client";

// Customer-facing language. English is the canonical content; zh-Hans (Simplified
// Chinese, for mainland/WeChat travellers) and vi (Vietnamese) are served from the
// DB's winery_translation table and used to set the AI commentary language.
// Persisted in localStorage so it survives across the explore flow. The language
// switcher (UI chrome) is a later phase; this is the data/seam layer.
export type AppLocale = "en" | "zh-Hans" | "vi";

const STORAGE_KEY = "tm_locale";
const SUPPORTED: AppLocale[] = ["en", "zh-Hans", "vi"];

export function getLocale(): AppLocale {
  if (typeof window === "undefined") {
    return "en";
  }
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored && SUPPORTED.includes(stored as AppLocale) ? (stored as AppLocale) : "en";
}

export function setLocale(locale: AppLocale) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, locale);
  }
}

export function isSupportedLocale(value: string): value is AppLocale {
  return SUPPORTED.includes(value as AppLocale);
}
