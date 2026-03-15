import {
  getAcsEmailConnectionString,
  getAcsEmailSenderAddress,
  getAcsSmsConnectionString,
  getAcsSmsFromNumber,
} from "./config.js";

export type NotificationPreview = {
  channel: "email" | "sms" | "preview";
  configured: boolean;
  recipient?: string;
  message: string;
};

export async function notifyWineryApprovalRequested(params: {
  wineryName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  actionUrl: string;
  bookingId: string;
}) {
  const message = `New Tailor Moments booking requires approval. Review booking ${params.bookingId}: ${params.actionUrl}`;

  const emailConfigured = Boolean(getAcsEmailConnectionString() && getAcsEmailSenderAddress() && params.recipientEmail);
  if (emailConfigured) {
    return {
      channel: "email",
      configured: true,
      recipient: params.recipientEmail,
      message,
    } satisfies NotificationPreview;
  }

  const smsConfigured = Boolean(getAcsSmsConnectionString() && getAcsSmsFromNumber() && params.recipientPhone);
  if (smsConfigured) {
    return {
      channel: "sms",
      configured: true,
      recipient: params.recipientPhone,
      message,
    } satisfies NotificationPreview;
  }

  return {
    channel: "preview",
    configured: false,
    message,
  } satisfies NotificationPreview;
}
