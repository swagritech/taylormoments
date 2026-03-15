import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { recommendItineraryRequestSchema } from "../domain/schemas.js";
import { readJson, badRequest, ok } from "../lib/http.js";
import { normalizeRequest } from "../lib/config.js";
import { workflowRepository } from "../lib/repository-factory.js";
import { recommendItineraries } from "../lib/recommendation-service.js";

export async function recommendItineraryHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const input = normalizeRequest(await readJson(request, recommendItineraryRequestSchema));
    const wineries = await workflowRepository.getWineries();
    const availability = await workflowRepository.getAvailabilityForDate(input.booking_date);
    const response = await recommendItineraries({ request: input, wineries, availability });
    if (response.scheduling_trace) {
      context.log("scheduling_trace", JSON.stringify(response.scheduling_trace));
    }

    return ok(response);
  } catch (error) {
    context.error(error);
    return badRequest(error instanceof Error ? error.message : "Invalid itinerary recommendation request.");
  }
}

app.http("recommend-itinerary", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "v1/itinerary/recommend",
  handler: recommendItineraryHandler,
});
