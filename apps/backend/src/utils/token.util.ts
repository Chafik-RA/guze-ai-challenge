import { randomBytes } from "node:crypto";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 วัน

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function getSessionExpiry(): Date {
  return new Date(Date.now() + SESSION_TTL_MS);
}