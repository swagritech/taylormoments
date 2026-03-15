import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `scrypt$${salt}$${derived}`;
}

export function verifyPassword(password: string, encoded: string) {
  const [algo, salt, expected] = encoded.split("$");
  if (algo !== "scrypt" || !salt || !expected) {
    return false;
  }

  const actual = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"));
}
