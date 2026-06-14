import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { actionTokenRouteSchema, tokenActionRequestSchema } from "../domain/schemas.js";
import { createActionToken, isTokenUsable } from "../lib/action-token-service.js";
import { badRequest, created, notFound, ok, conflict } from "../lib/http.js";
import { workflowRepository } from "../lib/repository-factory.js";
import { verifyTurnstileToken } from "../lib/turnstile.js";
import { notifyWineryApprovalRequested } from "../lib/notifications.js";

export async function createWineryApprovalTokenHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const bookingId = request.query.get("booking_id");
    const targetId = request.query.get("winery_id") ?? undefined;

    if (!bookingId) {
      return badRequest("booking_id is required.");
    }

    const booking = await workflowRepository.getBooking(bookingId);
    if (!booking) {
      return notFound("Booking not found.");
    }

    const { token, actionUrl } = createActionToken({
      bookingId,
      tokenType: "winery_approve",
      targetType: "winery",
      targetId,
    });

    await workflowRepository.saveActionToken(token);
    const notification = await notifyWineryApprovalRequested({
      wineryName: targetId ?? undefined,
      actionUrl,
      bookingId,
    });

    return created({ token_id: token.tokenId, action_url: actionUrl, expires_at: token.expiresAt, notification });
  } catch (error) {
    context.error(error);
    return badRequest(error instanceof Error ? error.message : "Unable to create action token.");
  }
}

export async function getBookingByTokenHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const tokenId = actionTokenRouteSchema.parse(request.params).tokenId;
    const token = await workflowRepository.getActionToken(tokenId);

    if (!token) {
      return notFound("Action token not found.");
    }

    const booking = await workflowRepository.getBooking(token.bookingId);
    if (!booking) {
      return notFound("Booking not found.");
    }

    // Only expose the booking details a partner needs to make a decision,
    // including the safety-critical dietary/accessibility/special-request notes.
    return ok({
      booking_id: booking.bookingId,
      lead_name: booking.leadName,
      booking_date: booking.bookingDate,
      preferred_start_time: booking.preferredStartTime,
      preferred_end_time: booking.preferredEndTime,
      pickup_location: booking.pickupLocation,
      party_size: booking.partySize,
      dietary_requirements: booking.dietaryRequirements,
      accessibility_requirements: booking.accessibilityRequirements,
      occasion: booking.occasion,
      special_requests: booking.specialRequests,
    });
  } catch (error) {
    context.error(error);
    return badRequest(error instanceof Error ? error.message : "Unable to fetch booking for token.");
  }
}

export async function approveByTokenHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const tokenId = actionTokenRouteSchema.parse(request.params).tokenId;
    const payload = tokenActionRequestSchema.parse(await request.json().catch(() => ({})));
    await verifyTurnstileToken({
      token: payload.turnstile_token,
      action: "winery_confirm",
      remoteIp: request.headers.get("cf-connecting-ip") ?? undefined,
    });
    const token = await workflowRepository.getActionToken(tokenId);

    if (!token) {
      return notFound("Action token not found.");
    }

    if (!isTokenUsable(token)) {
      return conflict("Action token is no longer valid.");
    }

    const usedToken = await workflowRepository.markActionTokenUsed(tokenId);
    await workflowRepository.markWineryBookingRequestAccepted(tokenId);
    return ok({ status: "confirmed", booking_id: usedToken?.bookingId, token_id: tokenId });
  } catch (error) {
    context.error(error);
    return badRequest(error instanceof Error ? error.message : "Unable to approve token.");
  }
}

export async function acceptByTokenHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const tokenId = actionTokenRouteSchema.parse(request.params).tokenId;
    const token = await workflowRepository.getActionToken(tokenId);

    if (!token) {
      return notFound("Action token not found.");
    }

    if (!isTokenUsable(token)) {
      return conflict("Action token is no longer valid.");
    }

    const usedToken = await workflowRepository.markActionTokenUsed(tokenId);
    return ok({ status: "accepted", booking_id: usedToken?.bookingId, token_id: tokenId });
  } catch (error) {
    context.error(error);
    return badRequest(error instanceof Error ? error.message : "Unable to accept token.");
  }
}

app.http("create-winery-approval-token", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "v1/action-tokens/winery-approve",
  handler: createWineryApprovalTokenHandler,
});

app.http("get-booking-by-token", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "v1/action-tokens/{tokenId}/booking",
  handler: getBookingByTokenHandler,
});

app.http("approve-booking-by-token", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "v1/action-tokens/{tokenId}/approve",
  handler: approveByTokenHandler,
});

app.http("accept-transport-by-token", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "v1/action-tokens/{tokenId}/accept",
  handler: acceptByTokenHandler,
});
