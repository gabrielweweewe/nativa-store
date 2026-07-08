import crypto from "node:crypto";
import type { Response } from "express";
import { CART_SESSION_COOKIE, CART_SESSION_MAX_AGE_MS } from "@shared/const/cart";

export function generateCartSessionId(): string {
  return crypto.randomUUID();
}

export function getCartSessionFromCookie(cookies: Record<string, string | undefined>): string | null {
  const value = cookies[CART_SESSION_COOKIE];
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function setCartSessionCookie(res: Response, sessionId: string): void {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie(CART_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: CART_SESSION_MAX_AGE_MS,
    path: "/",
  });
}

export function clearCartSessionCookie(res: Response): void {
  const isProduction = process.env.NODE_ENV === "production";

  res.cookie(CART_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}
