export type DataMode = "demo" | "remote";
const DEFAULT_LIVE_API_BASE_URL = "https://swagri-tailormoments-api-01.azurewebsites.net";

export function getDataMode(): DataMode {
  const value = process.env.NEXT_PUBLIC_DATA_MODE?.toLowerCase();
  return value === "remote" ? "remote" : "demo";
}

export function getApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ??
    DEFAULT_LIVE_API_BASE_URL
  );
}

export function getTurnstileSiteKey() {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
}

export function getPartnerSignInUrl() {
  return process.env.NEXT_PUBLIC_PARTNER_SIGN_IN_URL ?? "";
}

export function getOpsSignInUrl() {
  return process.env.NEXT_PUBLIC_OPS_SIGN_IN_URL ?? "";
}

export function getCustomerSignInUrl() {
  return process.env.NEXT_PUBLIC_CUSTOMER_SIGN_IN_URL ?? "";
}
