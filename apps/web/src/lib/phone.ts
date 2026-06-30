// Shared phone helpers + a registration error humanizer for the signup forms.
// Mirrors the API's phone rule (services/api domain schemas): an optional
// leading "+" then 8-15 digits, no leading 0, no spaces/punctuation.
export const PHONE_PATTERN = /^\+?[1-9]\d{7,14}$/;
export const PHONE_HINT = "Use international format with no spaces — e.g. +61412345678 (drop the leading 0).";

// Strip spaces, brackets and dashes, keeping a single leading "+".
export function normalizePhone(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");
  return trimmed.startsWith("+") ? `+${digits}` : digits;
}

type ZodIssue = { code?: string; message?: string; validation?: string; path?: (string | number)[] };

// Friendly per-field messages (override the generic "check your X" line).
const FIELD_MESSAGES: Record<string, string> = {
  phone: PHONE_HINT,
  email: "Please enter a valid email address.",
  password: "Your password must be at least 8 characters.",
  winery_website: "Please enter a valid website URL, including https://.",
  winery_id: "Please choose your winery from the list.",
  terms_accepted: "Please agree to the Partner Terms to continue.",
};

// Human-readable field names for the generic fallback message.
const FIELD_LABELS: Record<string, string> = {
  phone: "phone number",
  email: "email address",
  password: "password",
  winery_website: "winery website",
  winery_address: "winery address",
  winery_id: "winery",
  first_name: "first name",
  last_name: "last name",
  display_name: "display name",
  partner_role_title: "role at the winery",
  transport_company: "transport company",
  home_country: "home country",
};

function tryParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

// The API returns `{ "error": "<stringified Zod issues array>" }`, and live-api
// throws that whole body as the error message. Dig the issues array back out.
function extractZodIssues(message: string): ZodIssue[] | null {
  let data = tryParse(message);
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const errField = (data as { error?: unknown }).error;
    if (typeof errField === "string") {
      const inner = tryParse(errField);
      data = Array.isArray(inner) ? inner : data;
    }
  }
  return Array.isArray(data) ? (data as ZodIssue[]) : null;
}

// Turn a backend validation error into a clear, field-specific message — never
// show the raw Zod JSON.
export function friendlyRegistrationError(message: string): string {
  const issues = extractZodIssues(message);
  if (issues && issues.length > 0) {
    const fields = issues
      .map((issue) => String(issue.path?.[0] ?? ""))
      .filter((field, index, all) => field && all.indexOf(field) === index);
    const primary = fields[0] ?? "";
    if (FIELD_MESSAGES[primary]) {
      return FIELD_MESSAGES[primary];
    }
    if (primary) {
      const label = FIELD_LABELS[primary] ?? primary.replace(/_/g, " ");
      return `Please check your ${label} — it doesn't look valid.`;
    }
    return "Some details need attention — please review the form and try again.";
  }

  // Fallbacks for non-JSON messages.
  if (/phone/i.test(message) && /(regex|invalid_string|invalid)/i.test(message)) {
    return PHONE_HINT;
  }
  if (/^\s*[[{]/.test(message) || /"validation"|"code"\s*:\s*"invalid/.test(message)) {
    return "Some details need attention — please review the form and try again.";
  }
  return message;
}
