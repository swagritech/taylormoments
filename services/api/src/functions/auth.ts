import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { workflowRepository } from "../lib/repository-factory.js";
import { badRequest, conflict, created, ok, unauthorized } from "../lib/http.js";
import {
  changePasswordRequestSchema,
  forgotPasswordRequestSchema,
  loginRequestSchema,
  resetPasswordRequestSchema,
  registerUserRequestSchema,
} from "../domain/schemas.js";
import { hashPassword, verifyPassword } from "../lib/passwords.js";
import { issueAuthToken } from "../lib/auth-token.js";
import { requireSession } from "../lib/auth-guard.js";
import { addHoursIso, hashToken, makeId, makeSecretToken, nowIso } from "../lib/crypto.js";
import {
  getPasswordResetBaseUrl,
  getPasswordResetExpiryHours,
  getPasswordResetTokenSecret,
} from "../lib/config.js";
import { notifyPasswordResetRequested } from "../lib/notifications.js";

function toUserView(user: {
  userId: string;
  email: string;
  role: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  homeCountry?: string;
  ageGroup?: string;
  gender?: string;
  wineryId?: string;
  transportCompany?: string;
}) {
  return {
    user_id: user.userId,
    email: user.email,
    role: user.role,
    display_name: user.displayName,
    first_name: user.firstName,
    last_name: user.lastName,
    phone: user.phone,
    home_country: user.homeCountry,
    age_group: user.ageGroup,
    gender: user.gender,
    winery_id: user.wineryId,
    transport_company: user.transportCompany,
  };
}

export async function registerHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const payload = registerUserRequestSchema.parse(await request.json());

    if (payload.role === "winery" && !payload.winery_id) {
      return badRequest("winery_id is required for winery role.");
    }

    if (payload.role === "transport" && !payload.transport_company) {
      return badRequest("transport_company is required for transport role.");
    }

    if (payload.role === "customer") {
      if (!payload.first_name || !payload.last_name || !payload.phone || !payload.home_country) {
        return badRequest("first_name, last_name, phone, and home_country are required for customer role.");
      }
    }

    const existing = await workflowRepository.getUserByEmail(payload.email);
    if (existing) {
      return conflict("An account with this email already exists.");
    }

    const user = await workflowRepository.createUserAccount({
      ...payload,
      password_hash: hashPassword(payload.password),
    });

    const authToken = issueAuthToken({
      userId: user.userId,
      role: user.role,
      wineryId: user.wineryId,
      transportCompany: user.transportCompany,
    });

    return created({
      token: authToken,
      user: toUserView(user),
    });
  } catch (error) {
    context.error(error);
    return badRequest(error instanceof Error ? error.message : "Unable to create account.");
  }
}

export async function loginHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const payload = loginRequestSchema.parse(await request.json());
    const user = await workflowRepository.getUserByEmail(payload.email);
    if (!user) {
      return unauthorized("Invalid email or password.");
    }

    if (!verifyPassword(payload.password, user.passwordHash)) {
      return unauthorized("Invalid email or password.");
    }

    const authToken = issueAuthToken({
      userId: user.userId,
      role: user.role,
      wineryId: user.wineryId,
      transportCompany: user.transportCompany,
    });

    return ok({
      token: authToken,
      user: toUserView(user),
    });
  } catch (error) {
    context.error(error);
    return badRequest(error instanceof Error ? error.message : "Unable to sign in.");
  }
}

export async function meHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const session = requireSession(request);
    if (!session) {
      return unauthorized("You must be signed in.");
    }

    const user = await workflowRepository.getUserById(session.userId);
    if (!user) {
      return unauthorized("Session is no longer valid.");
    }

    return ok({ user: toUserView(user) });
  } catch (error) {
    context.error(error);
    return badRequest(error instanceof Error ? error.message : "Unable to load account.");
  }
}

export async function forgotPasswordHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const payload = forgotPasswordRequestSchema.parse(await request.json());
    const user = await workflowRepository.getUserByEmail(payload.email);
    if (user) {
      await workflowRepository.expireActivePasswordResetTokensForUser(user.userId);

      const tokenId = makeId();
      const tokenSecret = makeSecretToken(24);
      const tokenHash = hashToken(tokenSecret, getPasswordResetTokenSecret());
      const resetToken = `${tokenId}.${tokenSecret}`;
      const resetUrl = `${getPasswordResetBaseUrl()}?token=${encodeURIComponent(resetToken)}`;

      await workflowRepository.savePasswordResetToken({
        tokenId,
        userId: user.userId,
        tokenHash,
        expiresAt: addHoursIso(getPasswordResetExpiryHours()),
        status: "active",
        createdAt: nowIso(),
      });

      const notification = await notifyPasswordResetRequested({
        recipientEmail: user.email,
        resetUrl,
      });

      if (!notification.configured) {
        context.warn(
          `Password reset email provider is not configured. user=${user.userId} reset_url=${resetUrl}`,
        );
      }
    }

    return ok({
      status: "ok",
      message: "If this account exists, a secure password reset email has been sent.",
    });
  } catch (error) {
    context.error(error);
    return badRequest(error instanceof Error ? error.message : "Unable to start password reset.");
  }
}

export async function resetPasswordHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const payload = resetPasswordRequestSchema.parse(await request.json());
    const parts = payload.token.split(".");
    if (parts.length !== 2) {
      return badRequest("Invalid or expired reset link.");
    }

    const [tokenId, tokenSecret] = parts;
    const savedToken = await workflowRepository.getPasswordResetToken(tokenId);
    if (!savedToken || savedToken.status !== "active") {
      return badRequest("Invalid or expired reset link.");
    }

    if (new Date(savedToken.expiresAt).getTime() <= Date.now()) {
      await workflowRepository.expireActivePasswordResetTokensForUser(savedToken.userId);
      return badRequest("Invalid or expired reset link.");
    }

    const expectedHash = hashToken(tokenSecret, getPasswordResetTokenSecret());
    if (savedToken.tokenHash !== expectedHash) {
      return badRequest("Invalid or expired reset link.");
    }

    await workflowRepository.updateUserPasswordByUserId(
      savedToken.userId,
      hashPassword(payload.new_password),
    );

    await workflowRepository.markPasswordResetTokenUsed(savedToken.tokenId);
    await workflowRepository.expireActivePasswordResetTokensForUser(savedToken.userId);

    return ok({
      status: "ok",
      message: "Password updated successfully.",
    });
  } catch (error) {
    context.error(error);
    return badRequest(error instanceof Error ? error.message : "Unable to reset password.");
  }
}

export async function changePasswordHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  try {
    const session = requireSession(request);
    if (!session) {
      return unauthorized("You must be signed in.");
    }

    const payload = changePasswordRequestSchema.parse(await request.json());
    const user = await workflowRepository.getUserById(session.userId);
    if (!user) {
      return unauthorized("Session is no longer valid.");
    }

    if (!verifyPassword(payload.current_password, user.passwordHash)) {
      return unauthorized("Current password is incorrect.");
    }

    await workflowRepository.updateUserPasswordByUserId(
      session.userId,
      hashPassword(payload.new_password),
    );

    return ok({
      status: "ok",
      message: "Password updated successfully.",
    });
  } catch (error) {
    context.error(error);
    return badRequest(error instanceof Error ? error.message : "Unable to change password.");
  }
}

app.http("auth-register", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "v1/auth/register",
  handler: registerHandler,
});

app.http("auth-login", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "v1/auth/login",
  handler: loginHandler,
});

app.http("auth-me", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "v1/auth/me",
  handler: meHandler,
});

app.http("auth-forgot-password", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "v1/auth/forgot-password",
  handler: forgotPasswordHandler,
});

app.http("auth-change-password", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "v1/auth/change-password",
  handler: changePasswordHandler,
});

app.http("auth-reset-password", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "v1/auth/reset-password",
  handler: resetPasswordHandler,
});
