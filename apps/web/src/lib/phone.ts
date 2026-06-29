// Shared phone helpers for the registration forms. Mirrors the API's phone rule
// (services/api domain schemas): an optional leading "+" then 8-15 digits, no
// leading 0, no spaces/punctuation. E.g. +61412345678.
export const PHONE_PATTERN = /^\+?[1-9]\d{7,14}$/;
export const PHONE_HINT = "Use international format with no spaces — e.g. +61412345678 (drop the leading 0).";

// Strip spaces, brackets and dashes, keeping a single leading "+".
export function normalizePhone(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

// Backend validation errors arrive as a stringified Zod issues array. Never show
// that raw JSON to the user — map it to something readable.
export function friendlyRegistrationError(message: string) {
  if (/phone/i.test(message) && /(regex|invalid_string|invalid)/i.test(message)) {
    return PHONE_HINT;
  }
  if (/^\s*[[{]/.test(message) || /"validation"|"code"\s*:\s*"invalid/.test(message)) {
    return "Some details need attention — please review the form and try again.";
  }
  return message;
}
