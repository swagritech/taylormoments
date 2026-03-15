import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { createBookingRequestSchema } from "../domain/schemas.js";
import { workflowRepository } from "../lib/repository-factory.js";
import { badRequest, created, notFound, ok } from "../lib/http.js";
import { normalizeRequest } from "../lib/config.js";
import { verifyTurnstileToken } from "../lib/turnstile.js";

export async function createBookingHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const payload = createBookingRequestSchema.parse(await request.json());
    await verifyTurnstileToken({
      token: payload.turnstile_token,
      action: "request_quote",
      remoteIp: request.headers.get("cf-connecting-ip") ?? undefined,
    });
    const input = { ...payload, ...normalizeRequest(payload) };
    const booking = await workflowRepository.createBooking(input);
    return created(booking);
  } catch (error) {
    context.error(error);
    return badRequest(error instanceof Error ? error.message : "Unable to create booking.");
  }
}

export async function getBookingHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const bookingId = request.params.bookingId;
    if (!bookingId) {
      return badRequest("bookingId is required.");
    }

    const booking = await workflowRepository.getBooking(bookingId);
    if (!booking) {
      return notFound("Booking not found.");
    }

    return ok(booking);
  } catch (error) {
    context.error(error);
    return badRequest(error instanceof Error ? error.message : "Unable to fetch booking.");
  }
}

app.http("create-booking", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "v1/bookings",
  handler: createBookingHandler,
});

app.http("get-booking", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "v1/bookings/{bookingId}",
  handler: getBookingHandler,
});
