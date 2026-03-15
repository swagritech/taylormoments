import type { HttpRequest } from "@azure/functions";
import type { UserRole } from "../domain/models.js";
import { parseSessionFromAuthHeader, type AuthSession } from "./auth-token.js";

export function requireSession(request: HttpRequest): AuthSession | null {
  return parseSessionFromAuthHeader(request.headers.get("authorization"));
}

export function hasRole(session: AuthSession | null, roles: UserRole[]) {
  if (!session) {
    return false;
  }

  return roles.includes(session.role);
}
