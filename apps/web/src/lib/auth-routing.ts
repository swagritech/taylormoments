import type { AuthUser } from "@/lib/live-api";

export function routeForUser(user: Pick<AuthUser, "role"> | null | undefined) {
  if (!user) {
    return "/";
  }
  if (user.role === "winery") {
    return "/partner/wineries";
  }
  if (user.role === "transport") {
    return "/partner/transport";
  }
  if (user.role === "ops") {
    return "/partner/ops";
  }
  return "/customer/dashboard";
}
