import type { ActionTokenType, RecommendItineraryRequest } from "../domain/models.js";

export function getEnv(name: string, fallback = "") {
  return process.env[name] ?? fallback;
}

export function getActionTokenSecret() {
  return getEnv("TM_ACTION_TOKEN_SECRET", "replace-me");
}

export function getAuthTokenSecret() {
  return getEnv("TM_AUTH_TOKEN_SECRET", getActionTokenSecret());
}

export function getDataMode() {
  return getEnv("TM_DATA_MODE", "memory");
}

export function getOpenAIModel() {
  return getEnv("TM_OPENAI_MODEL", "gpt-4o-mini");
}

export function getMagicLinkBaseUrl(tokenType: ActionTokenType) {
  const siteBase = getEnv("TM_SITE_BASE_URL", "https://booking.swagritech.com.au");
  const path = tokenType === "winery_approve" ? "approve" : tokenType === "transporter_accept" ? "accept" : "calendar";
  return `${siteBase}/${path}`;
}

export function getTurnstileSecretKey() {
  return getEnv("TM_TURNSTILE_SECRET_KEY", "");
}

export function getTurnstileExpectedHostname() {
  return getEnv("TM_TURNSTILE_EXPECTED_HOSTNAME", "");
}

export function getAcsSmsConnectionString() {
  return getEnv("TM_ACS_SMS_CONNECTION_STRING", "");
}

export function getAcsSmsFromNumber() {
  return getEnv("TM_ACS_SMS_FROM_NUMBER", "");
}

export function getAcsEmailConnectionString() {
  return getEnv("TM_ACS_EMAIL_CONNECTION_STRING", "");
}

export function getAcsEmailSenderAddress() {
  return getEnv("TM_ACS_EMAIL_SENDER_ADDRESS", "");
}

export function getR2AccountId() {
  return getEnv("TM_R2_ACCOUNT_ID", "");
}

export function getR2AccessKeyId() {
  return getEnv("TM_R2_ACCESS_KEY_ID", "");
}

export function getR2SecretAccessKey() {
  return getEnv("TM_R2_SECRET_ACCESS_KEY", "");
}

export function getR2BucketName() {
  return getEnv("TM_R2_BUCKET_NAME", "");
}

export function getR2PublicBaseUrl() {
  return getEnv("TM_R2_PUBLIC_BASE_URL", "");
}

export function getR2SignedUrlExpirySeconds() {
  const parsed = Number(getEnv("TM_R2_SIGNED_URL_EXPIRY_SECONDS", "900"));
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 900;
  }
  return Math.min(Math.floor(parsed), 3600);
}

export function normalizeRequest(input: RecommendItineraryRequest): RecommendItineraryRequest {
  return {
    ...input,
    preferred_wineries: input.preferred_wineries ?? [],
    preferred_region: input.preferred_region?.trim() || undefined,
  };
}
