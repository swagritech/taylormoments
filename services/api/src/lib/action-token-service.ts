import { makeId, nowIso, addHoursIso, hashToken } from "../lib/crypto.js";
import { getActionTokenSecret, getMagicLinkBaseUrl } from "../lib/config.js";
import type { ActionToken, ActionTokenType } from "../domain/models.js";

export function createActionToken(params: {
  bookingId: string;
  tokenType: ActionTokenType;
  targetType: ActionToken["targetType"];
  targetId?: string;
}) {
  const rawToken = makeId();
  const secret = getActionTokenSecret();

  const token: ActionToken = {
    tokenId: rawToken,
    bookingId: params.bookingId,
    tokenType: params.tokenType,
    targetType: params.targetType,
    targetId: params.targetId,
    tokenHash: hashToken(rawToken, secret),
    expiresAt: addHoursIso(4),
    status: "active",
    createdAt: nowIso(),
  };

  return {
    token,
    actionUrl: `${getMagicLinkBaseUrl(params.tokenType)}/${rawToken}`,
  };
}

export function isTokenUsable(token: ActionToken) {
  if (token.status !== "active") {
    return false;
  }

  return new Date(token.expiresAt).getTime() > Date.now();
}
