import type { BrevoWebhookEvent } from "@shared/types/brevo";
import { createHash, timingSafeEqual } from "node:crypto";

export function bearerToken(authorization: string | undefined): string | null {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}

export function tokensMatch(candidate: string, expected: string): boolean {
  const candidateHash = createHash("sha256").update(candidate).digest();
  const expectedHash = createHash("sha256").update(expected).digest();
  return timingSafeEqual(candidateHash, expectedHash);
}

export function brevoEventKey(event: BrevoWebhookEvent): string {
  const providerId = event.id == null ? "" : String(event.id);
  const messageId = String(event["message-id"] ?? event.messageId ?? "");
  const timestamp = String(
    event.ts_epoch ?? event.ts_event ?? event.ts ?? event.date ?? ""
  );
  const identity = [
    String(event.event ?? "unknown"),
    providerId,
    messageId,
    String(event.email ?? "").toLowerCase(),
    timestamp,
  ].join("|");
  return createHash("sha256").update(identity).digest("hex");
}
