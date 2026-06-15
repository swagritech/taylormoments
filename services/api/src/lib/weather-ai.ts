import { getOpenAIApiKey, getOpenAIModel } from "./config.js";
import type { DayWeather, SupportedLocale } from "../domain/models.js";

const LOCALE_LANGUAGE: Record<SupportedLocale, string> = {
  en: "English",
  "zh-Hans": "Simplified Chinese (简体中文)",
  vi: "Vietnamese",
};

// Native-voice guidance so non-English output reads naturally, not like a translation.
const LOCALE_VOICE: Partial<Record<SupportedLocale, string>> = {
  "zh-Hans":
    " Write as a native Mandarin speaker for affluent mainland-Chinese travellers — graceful, idiomatic 简体中文 with natural rhythm, NOT a word-for-word translation from English.",
  vi: " Write as a native Vietnamese speaker — natural, idiomatic Vietnamese, never a literal translation.",
};

// Best-effort warm "concierge voice" + translation layer over the deterministic
// weather. It rewrites ONLY the wording of the summary and clothing tips — never
// the numbers, and never the practical meaning. If no OpenAI key is configured,
// or the call errors/times out/returns junk, the deterministic English text is
// returned unchanged. This must never throw into the caller.

const OPENAI_TIMEOUT_MS = 6000;
const MAX_TOKENS = 700;

// Cache the rewritten text so repeated plans for the same day+locale don't re-bill.
const aiCache = new Map<string, { value: { summary: string; clothing: string[] }; expiresAt: number }>();
const AI_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function cacheKey(day: DayWeather, locale: SupportedLocale): string {
  return `${locale}|${day.date}|${day.source}|${day.tempMinC}|${day.tempMaxC}|${day.rainProbabilityPercent}|${day.summary}`;
}

export function isWeatherAiEnabled() {
  return getOpenAIApiKey().length > 0;
}

type AiDayResult = { date?: string; summary?: string; clothing?: unknown };

export async function enhanceWeatherWithAi(
  days: DayWeather[],
  locale: SupportedLocale = "en",
): Promise<DayWeather[]> {
  const apiKey = getOpenAIApiKey();
  if (days.length === 0 || !apiKey) {
    return days;
  }

  // Serve from cache where possible; only ask the model for the uncached days.
  const now = Date.now();
  const result = days.map((day) => ({ day, key: cacheKey(day, locale) }));
  const pending = result.filter((entry) => {
    const cached = aiCache.get(entry.key);
    return !(cached && now < cached.expiresAt);
  });

  if (pending.length > 0) {
    const enhanced = await requestWeatherCopy(pending.map((entry) => entry.day), locale, apiKey);
    if (enhanced) {
      for (const entry of pending) {
        const match = enhanced.get(entry.day.date);
        if (match) {
          aiCache.set(entry.key, { value: match, expiresAt: now + AI_CACHE_TTL_MS });
        }
      }
    }
  }

  return result.map(({ day, key }) => {
    const cached = aiCache.get(key);
    if (!cached) {
      return day;
    }
    return { ...day, summary: cached.value.summary, clothing: cached.value.clothing };
  });
}

async function requestWeatherCopy(
  days: DayWeather[],
  locale: SupportedLocale,
  apiKey: string,
): Promise<Map<string, { summary: string; clothing: string[] }> | null> {
  const language = LOCALE_LANGUAGE[locale] ?? LOCALE_LANGUAGE.en;
  const voice = LOCALE_VOICE[locale] ?? "";
  const payload = {
    days: days.map((day) => ({
      date: day.date,
      temp_min_c: day.tempMinC,
      temp_max_c: day.tempMaxC,
      rain_probability_percent: day.rainProbabilityPercent,
      source: day.source,
      summary: day.summary,
      clothing: day.clothing,
    })),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: getOpenAIModel(),
        temperature: 0.6,
        max_tokens: MAX_TOKENS,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              `You are a warm, gracious Margaret River wine-tour concierge for Tailor Moments. ` +
              `Write everything in ${language}.${voice} You are given factual weather data and plain clothing tips ` +
              `for one or more touring days. For each day: rewrite "summary" as ONE warm, welcoming sentence, ` +
              `and rewrite each clothing tip in a warmer concierge voice. You MUST keep the same practical ` +
              `meaning and the same facts: do not change any temperature or rain numbers, do not invent new ` +
              `advice, and do not add or remove clothing tips (return exactly as many tips as you were given, ` +
              `in the same order). Return ONLY JSON of the form ` +
              `{"days":[{"date":"YYYY-MM-DD","summary":"...","clothing":["...","..."]}]}.`,
          },
          { role: "user", content: JSON.stringify(payload) },
        ],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim().length === 0) {
      return null;
    }

    const parsed = JSON.parse(content) as { days?: AiDayResult[] };
    const aiDays = Array.isArray(parsed.days) ? parsed.days : [];
    const byDate = new Map<string, { summary: string; clothing: string[] }>();
    for (const original of days) {
      const match = aiDays.find((entry) => entry.date === original.date);
      if (!match) {
        continue;
      }
      const summary =
        typeof match.summary === "string" && match.summary.trim().length > 0
          ? match.summary.trim()
          : original.summary;
      // Only accept the AI clothing list if it has the same number of tips as the
      // grounded original (a strong signal it rewrote rather than invented/dropped).
      const clothing =
        Array.isArray(match.clothing) &&
        match.clothing.length === original.clothing.length &&
        match.clothing.every((tip) => typeof tip === "string" && tip.trim().length > 0)
          ? (match.clothing as string[]).map((tip) => tip.trim())
          : original.clothing;
      byDate.set(original.date, { summary, clothing });
    }
    return byDate;
  } catch {
    // Timeout, network error, or malformed JSON — fall back silently.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
