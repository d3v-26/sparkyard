import { randomBytes, createHash } from "node:crypto";

const PREFIX = "spky_"; // Sparkyard — lets a leaked key be recognized at a glance

export function generateApiKey(): { raw: string; hash: string } {
  const raw = PREFIX + randomBytes(24).toString("base64url");
  return { raw, hash: hashApiKey(raw) };
}

export function hashApiKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
