import { getTurnstileExpectedHostname, getTurnstileSecretKey } from "./config.js";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstileToken(params: {
  token?: string;
  action: "request_quote" | "winery_confirm";
  remoteIp?: string;
}) {
  const secret = getTurnstileSecretKey();

  if (!secret) {
    return { enabled: false, success: true };
  }

  if (!params.token) {
    throw new Error("Security check missing. Please try again.");
  }

  const form = new URLSearchParams({
    secret,
    response: params.token,
  });

  if (params.remoteIp) {
    form.set("remoteip", params.remoteIp);
  }

  const response = await fetch(VERIFY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form,
  });

  if (!response.ok) {
    throw new Error("Unable to verify security check.");
  }

  const result = (await response.json()) as {
    success?: boolean;
    action?: string;
    hostname?: string;
    "error-codes"?: string[];
  };

  const expectedHostname = getTurnstileExpectedHostname();
  if (!result.success) {
    throw new Error("Security check failed. Please refresh and try again.");
  }

  if (result.action && result.action !== params.action) {
    throw new Error("Security check action mismatch.");
  }

  if (expectedHostname && result.hostname && result.hostname !== expectedHostname) {
    throw new Error("Security check hostname mismatch.");
  }

  return { enabled: true, success: true };
}
