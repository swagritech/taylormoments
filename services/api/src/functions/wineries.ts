import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { wineryRouteSchema } from "../domain/schemas.js";
import { badRequest, forbidden, ok, unauthorized } from "../lib/http.js";
import { workflowRepository } from "../lib/repository-factory.js";
import { hasRole, requireSession } from "../lib/auth-guard.js";

export async function listWineriesHandler(
  _request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const wineries = await workflowRepository.getWineries();
    return ok({
      wineries: wineries.map((winery) => ({
        winery_id: winery.wineryId,
        name: winery.name,
        region: winery.region,
        confirmation_mode: winery.confirmationMode,
      })),
    });
  } catch (error) {
    context.error(error);
    return badRequest(error instanceof Error ? error.message : "Unable to fetch wineries.");
  }
}

export async function listWineryRequestsHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const session = requireSession(request);
    if (!session) {
      return unauthorized("You must be signed in.");
    }
    if (!hasRole(session, ["winery", "ops"])) {
      return forbidden("You are not permitted to view winery requests.");
    }

    const { wineryId } = wineryRouteSchema.parse(request.params);
    if (session.role === "winery" && session.wineryId !== wineryId) {
      return forbidden("You can only view requests for your own winery.");
    }

    const [wineries, requests] = await Promise.all([
      workflowRepository.getWineries(),
      workflowRepository.listWineryBookingRequests(wineryId),
    ]);

    const winery = wineries.find((item) => item.wineryId === wineryId);
    const withBooking = await Promise.all(
      requests.map(async (entry) => ({
        request_id: entry.requestId,
        booking_id: entry.bookingId,
        status: entry.status,
        action_url: entry.actionUrl,
        sent_channel: entry.sentChannel,
        sent_recipient: entry.sentRecipient,
        sent_at: entry.sentAt,
        approved_at: entry.approvedAt,
        created_at: entry.createdAt,
        booking: await workflowRepository.getBooking(entry.bookingId),
      })),
    );

    return ok({
      winery: winery
        ? {
            winery_id: winery.wineryId,
            name: winery.name,
            region: winery.region,
            confirmation_mode: winery.confirmationMode,
          }
        : null,
      summary: {
        pending: withBooking.filter((item) => item.status === "pending").length,
        accepted: withBooking.filter((item) => item.status === "accepted").length,
        declined: withBooking.filter((item) => item.status === "declined").length,
        expired: withBooking.filter((item) => item.status === "expired").length,
      },
      requests: withBooking,
    });
  } catch (error) {
    context.error(error);
    return badRequest(error instanceof Error ? error.message : "Unable to fetch winery requests.");
  }
}

app.http("list-wineries", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "v1/wineries",
  handler: listWineriesHandler,
});

app.http("list-winery-requests", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "v1/wineries/{wineryId}/requests",
  handler: listWineryRequestsHandler,
});
