import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { createBookingRequestSchema } from "../domain/schemas.js";
import { workflowRepository } from "../lib/repository-factory.js";
import { badRequest, created, forbidden, internalServerError, notFound, ok, unauthorized } from "../lib/http.js";
import { normalizeRequest } from "../lib/config.js";
import { verifyTurnstileToken } from "../lib/turnstile.js";
import { dispatchWineryApprovalRequests } from "../lib/winery-workflow.js";
import { hasRole, requireSession } from "../lib/auth-guard.js";
import { ZodError } from "zod";

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
    const partnerDispatch = await dispatchWineryApprovalRequests({
      repository: workflowRepository,
      bookingId: booking.bookingId,
      wineryIds: input.preferred_wineries ?? [],
    });

    return created({
      ...booking,
      partner_dispatch: {
        winery_requests_created: partnerDispatch.length,
        winery_requests: partnerDispatch,
      },
    });
  } catch (error) {
    context.error(error);
    if (error instanceof ZodError) {
      return badRequest(error.issues[0]?.message ?? "Unable to create booking.");
    }
    if (
      error instanceof Error &&
      (
        error.message.includes("Security check") ||
        error.message.includes("turnstile") ||
        error.message.includes("hostname mismatch") ||
        error.message.includes("action mismatch")
      )
    ) {
      return badRequest(error.message);
    }
    return internalServerError("Unable to create booking right now.");
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
    if (error instanceof ZodError) {
      return badRequest(error.issues[0]?.message ?? "Unable to fetch booking.");
    }
    return internalServerError("Unable to fetch booking right now.");
  }
}

export async function listMyBookingsHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const session = requireSession(request);
    if (!session) {
      return unauthorized("You must be signed in.");
    }

    if (!hasRole(session, ["customer"])) {
      return forbidden("Customer account required.");
    }

    const bookings = await workflowRepository.listBookingsByUserId(session.userId);
    return ok({ bookings });
  } catch (error) {
    context.error(error);
    if (error instanceof ZodError) {
      return badRequest(error.issues[0]?.message ?? "Unable to fetch bookings.");
    }
    return internalServerError("Unable to fetch bookings right now.");
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

app.http("list-my-bookings", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "v1/bookings/mine",
  handler: listMyBookingsHandler,
});
