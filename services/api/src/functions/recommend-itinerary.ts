import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { recommendItineraryRequestSchema } from "../domain/schemas.js";
import { readJson, badRequest, internalServerError, ok } from "../lib/http.js";
import { normalizeRequest } from "../lib/config.js";
import { workflowRepository } from "../lib/repository-factory.js";
import { recommendItineraries } from "../lib/recommendation-service.js";
import { makeId } from "../lib/crypto.js";
import { logItineraryGeneration } from "../lib/itinerary-generation-log.js";
import { getCachedWineries } from "../lib/winery-list-cache.js";
import type { RecommendItineraryRequest } from "../domain/models.js";
import { ZodError } from "zod";

type AvailabilityForDate = Awaited<ReturnType<typeof workflowRepository.getAvailabilityForDate>>;
type AvailabilityCache = {
  availability: AvailabilityForDate;
  expiresAt: number;
};

const availabilityCache = new Map<string, AvailabilityCache>();
const AVAILABILITY_CACHE_TTL_MS = 60 * 1000;

async function getCachedAvailability(date: string): Promise<AvailabilityForDate> {
  const now = Date.now();
  const cached = availabilityCache.get(date);
  if (cached && now < cached.expiresAt) {
    return cached.availability;
  }

  const availability = await workflowRepository.getAvailabilityForDate(date);
  availabilityCache.set(date, {
    availability,
    expiresAt: now + AVAILABILITY_CACHE_TTL_MS,
  });

  for (const [key, entry] of availabilityCache.entries()) {
    if (entry.expiresAt <= now) {
      availabilityCache.delete(key);
    }
  }
  return availability;
}

export async function recommendItineraryHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  const generationId = makeId();
  const startedAt = Date.now();
  const requestTraceId =
    request.headers.get("x-request-id") ??
    request.headers.get("traceparent") ??
    request.headers.get("cf-ray") ??
    undefined;
  let parsedInput: RecommendItineraryRequest | undefined;
  let normalizedInput: RecommendItineraryRequest | undefined;

  try {
    parsedInput = await readJson(request, recommendItineraryRequestSchema) as RecommendItineraryRequest;
    const input = normalizeRequest(parsedInput);
    if ((input.preferred_wineries?.length ?? 0) > 0) {
      input.preferred_wineries = await workflowRepository.remapWineryIdsToCanonical(input.preferred_wineries ?? []);
    }
    normalizedInput = input;
    const wineries = await getCachedWineries(workflowRepository);
    const availability = await getCachedAvailability(input.booking_date);
    const response = await recommendItineraries({ request: input, wineries, availability });
    const responseWithGeneration = {
      ...response,
      generation_id: generationId,
    };
    const durationMs = Date.now() - startedAt;

    void logItineraryGeneration({
      generationId,
      requestTraceId,
      status: response.itineraries.length > 0 ? "success" : "no_match",
      durationMs,
      inputSnapshot: parsedInput,
      normalizedInputSnapshot: normalizedInput,
      resultSnapshot: responseWithGeneration,
      schedulingTrace: response.scheduling_trace,
    }).catch((loggingError) => {
      context.error("itinerary_generation_log_failed", loggingError);
    });

    if (response.scheduling_trace) {
      context.log("scheduling_trace", JSON.stringify(response.scheduling_trace));
    }
    context.log("itinerary_generation_id", generationId);

    return ok(responseWithGeneration);
  } catch (error) {
    context.error(error);
    void logItineraryGeneration({
      generationId,
      requestTraceId,
      status: "error",
      durationMs: Date.now() - startedAt,
      inputSnapshot: parsedInput,
      normalizedInputSnapshot: normalizedInput,
      errorMessage: error instanceof Error ? error.message : "Unknown itinerary error.",
    }).catch((loggingError) => {
      context.error("itinerary_generation_log_failed", loggingError);
    });
    context.log("itinerary_generation_id", generationId);
    if (error instanceof ZodError) {
      return badRequest(error.issues[0]?.message ?? "Invalid itinerary recommendation request.");
    }
    return internalServerError("Unable to generate itinerary right now.");
  }
}

app.http("recommend-itinerary", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "v1/itinerary/recommend",
  handler: recommendItineraryHandler,
});
