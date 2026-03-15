import { createHmac } from "node:crypto";
import { getAuthTokenSecret } from "./config.js";
import type { UserRole } from "../domain/models.js";

type AuthPayload = {
  sub: string;
  role: UserRole;
  winery_id?: string;
  transport_company?: string;
  exp: number;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payloadEncoded: string) {
  return createHmac("sha256", getAuthTokenSecret()).update(payloadEncoded).digest("base64url");
}

export function issueAuthToken(params: {
  userId: string;
  role: UserRole;
  wineryId?: string;
  transportCompany?: string;
  ttlHours?: number;
}) {
  const payload: AuthPayload = {
    sub: params.userId,
    role: params.role,
    winery_id: params.wineryId,
    transport_company: params.transportCompany,
    exp: Date.now() + (params.ttlHours ?? 24) * 60 * 60 * 1000,
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  const sig = signPayload(encoded);
  return `${encoded}.${sig}`;
}

export function verifyAuthToken(token: string): AuthPayload | null {
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) {
    return null;
  }

  const expectedSig = signPayload(encoded);
  if (expectedSig !== sig) {
    return null;
  }

  try {
    const parsed = JSON.parse(base64UrlDecode(encoded)) as AuthPayload;
    if (!parsed?.sub || !parsed?.role || !parsed?.exp) {
      return null;
    }
    if (parsed.exp < Date.now()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export type AuthSession = {
  userId: string;
  role: UserRole;
  wineryId?: string;
  transportCompany?: string;
};

export function readBearerToken(header: string | null) {
  if (!header) {
    return "";
  }
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return "";
  }

  return token.trim();
}

export function parseSessionFromAuthHeader(authorizationHeader: string | null): AuthSession | null {
  const token = readBearerToken(authorizationHeader);
  if (!token) {
    return null;
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return null;
  }

  return {
    userId: payload.sub,
    role: payload.role,
    wineryId: payload.winery_id,
    transportCompany: payload.transport_company,
  };
}
