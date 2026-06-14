import { getOpenAIApiKey, getOpenAIModel } from "./config.js";
import type { ItineraryOption } from "../domain/models.js";

// Best-effort AI justification for the expert-pick itinerary. This runs on the
// booking-critical recommend path, so it is strictly optional: if no OpenAI key
// is configured, or the call errors/times out, we return the deterministic
// justifications unchanged. Never let this throw into the caller.

const OPENAI_TIMEOUT_MS = 4000;
const MAX_JUSTIFICATION_TOKENS = 90;

export function isAiJustificationEnabled() {
  return getOpenAIApiKey().length > 0;
}

function clockFromIso(value: string | undefined): string {
  if (!value || value.length < 16) {
    return "";
  }
  return value.slice(11, 16);
}

function buildItinerarySummary(itinerary: ItineraryOption): string {
  const stops = itinerary.stops
    .map((stop, index) => {
      const arrival = clockFromIso(stop.arrivalTime);
      return `${index + 1}. ${stop.wineryName}${arrival ? ` (arrive ${arrival})` : ""}`;
    })
    .join("; ");
  return `A ${itinerary.stops.length}-stop Margaret River day: ${stops}.`;
}

export async function generateExpertJustification(itinerary: ItineraryOption): Promise<string | null> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey || itinerary.stops.length === 0) {
    return null;
  }

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
        temperature: 0.7,
        max_tokens: MAX_JUSTIFICATION_TOKENS,
        messages: [
          {
            role: "system",
            content:
              "You are a Margaret River wine-tour concierge for Tailor Moments. In 1-2 warm, concrete sentences, explain why this curated day is a great pick. Reference the wineries by name and the natural flow of the day. Do NOT invent facts, prices, wine varieties, or details beyond the winery names and arrival times provided.",
          },
          { role: "user", content: buildItinerarySummary(itinerary) },
        ],
      }),
    });

    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json?.choices?.[0]?.message?.content;
    return typeof text === "string" && text.trim().length > 0 ? text.trim() : null;
  } catch {
    // Timeout, network error, or malformed response — fall back silently.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function enhanceWithAiJustifications(
  candidates: ItineraryOption[],
): Promise<ItineraryOption[]> {
  if (candidates.length === 0 || !isAiJustificationEnabled()) {
    return candidates;
  }

  const topPick = candidates[0];
  if (!topPick) {
    return candidates;
  }

  const aiJustification = await generateExpertJustification(topPick);
  if (!aiJustification) {
    return candidates;
  }

  return candidates.map((candidate, index) =>
    index === 0 ? { ...candidate, justification: aiJustification } : candidate,
  );
}
