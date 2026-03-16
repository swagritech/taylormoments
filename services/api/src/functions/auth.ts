import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { workflowRepository } from "../lib/repository-factory.js";
import { badRequest, conflict, created, ok, unauthorized } from "../lib/http.js";
import {
  changePasswordRequestSchema,
  forgotPasswordRequestSchema,
  loginRequestSchema,
  registerUserRequestSchema,
} from "../domain/schemas.js";
import { hashPassword, verifyPassword } from "../lib/passwords.js";
import { issueAuthToken } from "../lib/auth-token.js";
import { requireSession } from "../lib/auth-guard.js";

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
    await workflowRepository.updateUserPasswordByEmail(
      payload.email,
      hashPassword(payload.new_password),
    );

    return ok({
      status: "ok",
      message: "If this account exists, the password has been updated.",
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
