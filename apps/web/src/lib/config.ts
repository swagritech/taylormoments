export type DataMode = "demo" | "remote";

export function getDataMode(): DataMode {
  const value = process.env.NEXT_PUBLIC_DATA_MODE?.toLowerCase();
  return value === "remote" ? "remote" : "demo";
}

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "") ?? "";
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
