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

export type BookingSafetyNotes = {
  dietaryRequirements?: string[];
  accessibilityRequirements?: string[];
  occasion?: string;
  specialRequests?: string;
};

function humanizeNote(value: string) {
  return value.replace(/_/g, " ").trim();
}

// Build a concise, clearly-labelled safety-notes line for partner notifications.
// Returns an empty string when there is nothing to surface so callers can skip it.
export function formatBookingSafetyNotes(notes: BookingSafetyNotes): string {
  const segments: string[] = [];

  const dietary = (notes.dietaryRequirements ?? []).map(humanizeNote).filter(Boolean);
  if (dietary.length > 0) {
    segments.push(`Dietary: ${dietary.join(", ")}`);
  }

  const accessibility = (notes.accessibilityRequirements ?? []).map(humanizeNote).filter(Boolean);
  if (accessibility.length > 0) {
    segments.push(`Accessibility: ${accessibility.join(", ")}`);
  }

  const occasion = notes.occasion ? humanizeNote(notes.occasion) : "";
  if (occasion) {
    segments.push(`Occasion: ${occasion}`);
  }

  const special = notes.specialRequests?.trim();
  if (special) {
    segments.push(`Notes: ${special}`);
  }

  return segments.join(" / ");
}

export async function notifyWineryApprovalRequested(params: {
  wineryName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  actionUrl: string;
  bookingId: string;
  safetyNotes?: BookingSafetyNotes;
}) {
  const safetyLine = params.safetyNotes ? formatBookingSafetyNotes(params.safetyNotes) : "";
  const message = `New Tailor Moments booking requires approval. Review booking ${params.bookingId}: ${params.actionUrl}${
    safetyLine ? ` | ${safetyLine}` : ""
  }`;

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

export async function notifyPasswordResetRequested(params: {
  recipientEmail?: string;
  resetUrl: string;
}) {
  const message = `Tailor Moments password reset requested. Use this secure link: ${params.resetUrl}`;
  const emailConfigured = Boolean(getAcsEmailConnectionString() && getAcsEmailSenderAddress() && params.recipientEmail);

  if (emailConfigured) {
    return {
      channel: "email",
      configured: true,
      recipient: params.recipientEmail,
      message,
    } satisfies NotificationPreview;
  }

  return {
    channel: "preview",
    configured: false,
    message,
  } satisfies NotificationPreview;
}
