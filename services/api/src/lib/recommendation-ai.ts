import { getOpenAIApiKey, getOpenAIModel } from "./config.js";
import type { ItineraryOption } from "../domain/models.js";

// Best-effort AI justification for the expert-pick itinerary. This runs on the
// booking-critical recommend path, so it is strictly optional: if no OpenAI key
// is configured, or the call errors/times out, we return the deterministic
// justifications unchanged. Never let this throw into the caller.

const OPENAI_TIMEOUT_MS = 4000;
const MAX_JUSTIFICATION_TOKENS = 110;
const MAX_DESCRIPTION_CHARS = 220;

// Real, DB-sourced facts about a winery, keyed by winery id. Used to ground the
// justification so the model describes the actual wineries rather than relying on
// its own (possibly inaccurate) general knowledge.
export type WineryFacts = {
  name: string;
  famousFor?: string;
  description?: string;
};
export type WineryFactsById = Record<string, WineryFacts>;

export function isAiJustificationEnabled() {
  return getOpenAIApiKey().length > 0;
}

function clockFromIso(value: string | undefined): string {
  if (!value || value.length < 16) {
    return "";
  }
  return value.slice(11, 16);
}

function buildItinerarySummary(itinerary: ItineraryOption, factsById?: WineryFactsById): string {
  const lines = itinerary.stops.map((stop, index) => {
    const arrival = clockFromIso(stop.arrivalTime);
    const facts = factsById?.[stop.wineryId];
    const detailParts: string[] = [];
    if (facts?.famousFor) {
      detailParts.push(`known for ${facts.famousFor}`);
    }
    if (facts?.description) {
      detailParts.push(facts.description.slice(0, MAX_DESCRIPTION_CHARS));
    }
    const detail = detailParts.length > 0 ? ` — ${detailParts.join(". ")}` : "";
    return `${index + 1}. ${stop.wineryName}${arrival ? ` (arrive ${arrival})` : ""}${detail}`;
  });
  return `A ${itinerary.stops.length}-stop Margaret River day:\n${lines.join("\n")}`;
}

export async function generateExpertJustification(
  itinerary: ItineraryOption,
  factsById?: WineryFactsById,
): Promise<string | null> {
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
              "You are a Margaret River wine-tour concierge for Tailor Moments. In 1-2 warm, concrete sentences, explain why this curated day flows well. Use ONLY the facts provided for each winery (and the arrival times). Do NOT add wine varieties, ratings, awards, prices, or descriptors that are not in the provided facts — if a winery has no facts listed, just refer to it by name. Never contradict the facts given.",
          },
          { role: "user", content: buildItinerarySummary(itinerary, factsById) },
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
  factsById?: WineryFactsById,
): Promise<ItineraryOption[]> {
  if (candidates.length === 0 || !isAiJustificationEnabled()) {
    return candidates;
  }

  const topPick = candidates[0];
  if (!topPick) {
    return candidates;
  }

  const aiJustification = await generateExpertJustification(topPick, factsById);
  if (!aiJustification) {
    return candidates;
  }

  return candidates.map((candidate, index) =>
    index === 0 ? { ...candidate, justification: aiJustification } : candidate,
  );
}
