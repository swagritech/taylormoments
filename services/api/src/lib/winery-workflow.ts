import type { WorkflowRepository } from "../domain/ports.js";
import { createActionToken } from "./action-token-service.js";
import { makeId, nowIso } from "./crypto.js";
import { notifyWineryApprovalRequested, type NotificationPreview } from "./notifications.js";

export type WineryDispatchResult = {
  winery_id: string;
  token_id: string;
  action_url: string;
  expires_at: string;
  notification: NotificationPreview;
};

export async function dispatchWineryApprovalRequests(params: {
  repository: WorkflowRepository;
  bookingId: string;
  wineryIds: string[];
}) {
  const uniqueWineryIds = Array.from(new Set(params.wineryIds.filter(Boolean)));
  const results: WineryDispatchResult[] = [];

  for (const wineryId of uniqueWineryIds) {
    const { token, actionUrl } = createActionToken({
      bookingId: params.bookingId,
      tokenType: "winery_approve",
      targetType: "winery",
      targetId: wineryId,
    });

    await params.repository.saveActionToken(token);

    const contact = await params.repository.getWineryContact(wineryId);
    const notification = await notifyWineryApprovalRequested({
      wineryName: wineryId,
      bookingId: params.bookingId,
      actionUrl,
      recipientEmail: contact?.email,
      recipientPhone: contact?.phone,
    });

    await params.repository.createWineryBookingRequest({
      requestId: makeId(),
      bookingId: params.bookingId,
      wineryId,
      actionTokenId: token.tokenId,
      actionUrl,
      status: "pending",
      sentChannel: notification.channel,
      sentRecipient: notification.recipient,
      sentAt: nowIso(),
      approvedAt: undefined,
    });

    results.push({
      winery_id: wineryId,
      token_id: token.tokenId,
      action_url: actionUrl,
      expires_at: token.expiresAt,
      notification,
    });
  }

  return results;
}
