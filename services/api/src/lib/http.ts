import type { HttpRequest, HttpResponseInit } from "@azure/functions";
import { ZodSchema } from "zod";

export async function readJson<T>(request: HttpRequest, schema: ZodSchema<T>) {
  const body = (await request.json()) as unknown;
  return schema.parse(body);
}

export function json(status: number, body: unknown): HttpResponseInit {
  return {
    status,
    jsonBody: body,
    headers: {
      "Content-Type": "application/json",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    },
  };
}

export function ok(body: unknown): HttpResponseInit {
  return json(200, body);
}

export function created(body: unknown): HttpResponseInit {
  return json(201, body);
}

export function badRequest(message: string): HttpResponseInit {
  return json(400, { error: message });
}

export function internalServerError(message = "An unexpected server error occurred."): HttpResponseInit {
  return json(500, { error: message });
}

export function notFound(message: string): HttpResponseInit {
  return json(404, { error: message });
}

export function conflict(message: string): HttpResponseInit {
  return json(409, { error: message });
}

export function unauthorized(message: string): HttpResponseInit {
  return json(401, { error: message });
}

export function forbidden(message: string): HttpResponseInit {
  return json(403, { error: message });
}
