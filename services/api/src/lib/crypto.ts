import { createHash, randomBytes, randomUUID } from "node:crypto";

export function nowIso() {
  return new Date().toISOString();
}

export function addHoursIso(hours: number) {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

export function makeId() {
  return randomUUID();
}

export function makeSecretToken(size = 32) {
  return randomBytes(size).toString("hex");
}

export function hashToken(token: string, secret: string) {
  return createHash("sha256").update(`${token}:${secret}`).digest("hex");
}
