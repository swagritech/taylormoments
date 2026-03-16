import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import {
  createWineryMediaUploadRequestSchema,
  wineryProfileUpdateSchema,
  wineryMediaRouteSchema,
  wineryRouteSchema,
} from "../domain/schemas.js";
import { badRequest, created, forbidden, notFound, ok, unauthorized } from "../lib/http.js";
import { workflowRepository } from "../lib/repository-factory.js";
import { hasRole, requireSession } from "../lib/auth-guard.js";
import { makeId } from "../lib/crypto.js";
import type { AuthSession } from "../lib/auth-token.js";
import {
  assertWineryImageExists,
  createWineryImageUploadTicket,
  deleteWineryImage,
  isMediaStorageConfigured,
} from "../lib/media-storage.js";

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
        tasting_price: winery.tastingPrice,
        description: winery.description,
        famous_for: winery.famousFor,
        offers_cheese_board: winery.offersCheeseBoard,
        unique_experience_offers: winery.uniqueExperienceOffers,
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

function canAccessWinery(session: AuthSession, wineryId: string) {
  if (session.role === "ops") {
    return true;
  }
  return session.role === "winery" && session.wineryId === wineryId;
}

export async function listWineryMediaHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const session = requireSession(request);
    if (!session) {
      return unauthorized("You must be signed in.");
    }
    if (!hasRole(session, ["winery", "ops"])) {
      return forbidden("You are not permitted to view winery media.");
    }

    const { wineryId } = wineryRouteSchema.parse(request.params);
    if (!canAccessWinery(session, wineryId)) {
      return forbidden("You can only view media for your own winery.");
    }

    const assets = await workflowRepository.listWineryMediaAssets(wineryId);
    return ok({
      storage_configured: isMediaStorageConfigured(),
      assets: assets.map((asset) => ({
        media_id: asset.mediaId,
        winery_id: asset.wineryId,
        public_url: asset.publicUrl,
        object_key: asset.objectKey,
        file_name: asset.fileName,
        content_type: asset.contentType,
        file_size_bytes: asset.fileSizeBytes,
        caption: asset.caption,
        status: asset.status,
        created_at: asset.createdAt,
        updated_at: asset.updatedAt,
      })),
    });
  } catch (error) {
    context.error(error);
    return badRequest(error instanceof Error ? error.message : "Unable to fetch winery media.");
  }
}

export async function getWineryProfileHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const session = requireSession(request);
    if (!session) {
      return unauthorized("You must be signed in.");
    }
    if (!hasRole(session, ["winery", "ops"])) {
      return forbidden("You are not permitted to view winery profile data.");
    }

    const { wineryId } = wineryRouteSchema.parse(request.params);
    if (!canAccessWinery(session, wineryId)) {
      return forbidden("You can only view your own winery profile.");
    }

    const winery = await workflowRepository.getWineryById(wineryId);
    if (!winery) {
      return notFound("Winery not found.");
    }

    return ok({
      winery_id: winery.wineryId,
      name: winery.name,
      region: winery.region,
      tasting_price: winery.tastingPrice,
      description: winery.description,
      famous_for: winery.famousFor,
      offers_cheese_board: winery.offersCheeseBoard,
      unique_experience_offers: winery.uniqueExperienceOffers,
    });
  } catch (error) {
    context.error(error);
    return badRequest(error instanceof Error ? error.message : "Unable to fetch winery profile.");
  }
}

export async function updateWineryProfileHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const session = requireSession(request);
    if (!session) {
      return unauthorized("You must be signed in.");
    }
    if (!hasRole(session, ["winery", "ops"])) {
      return forbidden("You are not permitted to update winery profile data.");
    }

    const { wineryId } = wineryRouteSchema.parse(request.params);
    if (!canAccessWinery(session, wineryId)) {
      return forbidden("You can only update your own winery profile.");
    }

    const payload = wineryProfileUpdateSchema.parse(await request.json());
    const updated = await workflowRepository.updateWineryProfile({
      wineryId,
      tastingPrice: payload.tasting_price,
      description: payload.description?.trim() || undefined,
      famousFor: payload.famous_for?.trim() || undefined,
      offersCheeseBoard: payload.offers_cheese_board,
      uniqueExperienceOffers: payload.unique_experience_offers.map((entry) => ({
        name: entry.name.trim(),
        price: Number(entry.price),
      })),
    });

    if (!updated) {
      return notFound("Winery not found.");
    }

    return ok({
      winery_id: updated.wineryId,
      name: updated.name,
      region: updated.region,
      tasting_price: updated.tastingPrice,
      description: updated.description,
      famous_for: updated.famousFor,
      offers_cheese_board: updated.offersCheeseBoard,
      unique_experience_offers: updated.uniqueExperienceOffers,
    });
  } catch (error) {
    context.error(error);
    return badRequest(error instanceof Error ? error.message : "Unable to update winery profile.");
  }
}

export async function createWineryMediaUploadUrlHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const session = requireSession(request);
    if (!session) {
      return unauthorized("You must be signed in.");
    }
    if (!hasRole(session, ["winery", "ops"])) {
      return forbidden("You are not permitted to upload winery media.");
    }

    const { wineryId } = wineryRouteSchema.parse(request.params);
    if (!canAccessWinery(session, wineryId)) {
      return forbidden("You can only upload media for your own winery.");
    }

    if (!isMediaStorageConfigured()) {
      return badRequest("R2 media storage is not configured.");
    }

    const payload = createWineryMediaUploadRequestSchema.parse(await request.json());
    const mediaId = makeId();
    const ticket = await createWineryImageUploadTicket({
      wineryId,
      fileName: payload.file_name,
      contentType: payload.content_type,
    });

    await workflowRepository.createWineryMediaAsset({
      mediaId,
      wineryId,
      objectKey: ticket.objectKey,
      publicUrl: ticket.publicUrl,
      fileName: payload.file_name,
      contentType: payload.content_type,
      fileSizeBytes: payload.file_size_bytes,
      caption: payload.caption,
      status: "pending",
      uploadedByUserId: session.userId,
    });

    return created({
      media_id: mediaId,
      winery_id: wineryId,
      object_key: ticket.objectKey,
      public_url: ticket.publicUrl,
      upload_url: ticket.uploadUrl,
      upload_method: "PUT",
      upload_headers: {
        "Content-Type": payload.content_type,
      },
      expires_at: ticket.expiresAt,
    });
  } catch (error) {
    context.error(error);
    return badRequest(error instanceof Error ? error.message : "Unable to create upload URL.");
  }
}

export async function completeWineryMediaUploadHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const session = requireSession(request);
    if (!session) {
      return unauthorized("You must be signed in.");
    }
    if (!hasRole(session, ["winery", "ops"])) {
      return forbidden("You are not permitted to finalize winery media.");
    }

    const { wineryId, mediaId } = wineryMediaRouteSchema.parse(request.params);
    if (!canAccessWinery(session, wineryId)) {
      return forbidden("You can only finalize media for your own winery.");
    }

    const assets = await workflowRepository.listWineryMediaAssets(wineryId);
    const asset = assets.find((entry) => entry.mediaId === mediaId);
    if (!asset) {
      return notFound("Media asset not found.");
    }

    await assertWineryImageExists(asset.objectKey);
    const completed = await workflowRepository.markWineryMediaAssetUploaded(
      mediaId,
      wineryId,
      asset.fileSizeBytes,
    );

    if (!completed) {
      return notFound("Media asset not found.");
    }

    return ok({
      media_id: completed.mediaId,
      winery_id: completed.wineryId,
      public_url: completed.publicUrl,
      object_key: completed.objectKey,
      file_name: completed.fileName,
      content_type: completed.contentType,
      file_size_bytes: completed.fileSizeBytes,
      caption: completed.caption,
      status: completed.status,
      created_at: completed.createdAt,
      updated_at: completed.updatedAt,
    });
  } catch (error) {
    context.error(error);
    return badRequest(error instanceof Error ? error.message : "Unable to finalize upload.");
  }
}

export async function deleteWineryMediaHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const session = requireSession(request);
    if (!session) {
      return unauthorized("You must be signed in.");
    }
    if (!hasRole(session, ["winery", "ops"])) {
      return forbidden("You are not permitted to delete winery media.");
    }

    const { wineryId, mediaId } = wineryMediaRouteSchema.parse(request.params);
    if (!canAccessWinery(session, wineryId)) {
      return forbidden("You can only delete media for your own winery.");
    }

    const assets = await workflowRepository.listWineryMediaAssets(wineryId);
    const asset = assets.find((entry) => entry.mediaId === mediaId);
    if (!asset) {
      return notFound("Media asset not found.");
    }

    const archived = await workflowRepository.archiveWineryMediaAsset(mediaId, wineryId);
    if (!archived) {
      return notFound("Media asset not found.");
    }

    if (isMediaStorageConfigured()) {
      try {
        await deleteWineryImage(asset.objectKey);
      } catch (storageError) {
        context.warn(
          `Failed to delete winery media object from storage. wineryId=${wineryId} mediaId=${mediaId} error=${storageError instanceof Error ? storageError.message : String(storageError)}`,
        );
      }
    }

    return ok({
      media_id: archived.mediaId,
      winery_id: archived.wineryId,
      status: archived.status,
    });
  } catch (error) {
    context.error(error);
    return badRequest(error instanceof Error ? error.message : "Unable to delete media.");
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

app.http("list-winery-media", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "v1/wineries/{wineryId}/media",
  handler: listWineryMediaHandler,
});

app.http("get-winery-profile", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "v1/wineries/{wineryId}/profile",
  handler: getWineryProfileHandler,
});

app.http("update-winery-profile", {
  methods: ["PUT"],
  authLevel: "anonymous",
  route: "v1/wineries/{wineryId}/profile",
  handler: updateWineryProfileHandler,
});

app.http("create-winery-media-upload-url", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "v1/wineries/{wineryId}/media/upload-url",
  handler: createWineryMediaUploadUrlHandler,
});

app.http("complete-winery-media-upload", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "v1/wineries/{wineryId}/media/{mediaId}/complete",
  handler: completeWineryMediaUploadHandler,
});

app.http("delete-winery-media", {
  methods: ["DELETE"],
  authLevel: "anonymous",
  route: "v1/wineries/{wineryId}/media/{mediaId}",
  handler: deleteWineryMediaHandler,
});
