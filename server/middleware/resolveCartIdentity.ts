import type { NextFunction, Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { generateCartSessionId, getCartSessionFromCookie, setCartSessionCookie } from "../lib/cartSession";

export interface CartIdentity {
  customerId: string | null;
  sessionId: string | null;
}

export interface CartRequest extends Request {
  cartIdentity?: CartIdentity;
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;

  const [type, token] = header.split(" ");
  if (type?.toLowerCase() !== "bearer" || !token) return null;

  return token.trim();
}

export async function resolveCartIdentity(
  req: CartRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = getBearerToken(req);

    if (token) {
      const { data, error } = await supabase.auth.getUser(token);

      if (!error && data?.user?.id) {
        req.cartIdentity = {
          customerId: data.user.id,
          sessionId: null,
        };
        next();
        return;
      }
    }

    let sessionId = getCartSessionFromCookie(req.cookies ?? {});

    if (!sessionId) {
      sessionId = generateCartSessionId();
      setCartSessionCookie(res, sessionId);
    }

    req.cartIdentity = {
      customerId: null,
      sessionId,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export async function requireCustomerForMerge(
  req: CartRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = getBearerToken(req);

  if (!token) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data?.user?.id) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  req.cartIdentity = {
    customerId: data.user.id,
    sessionId: getCartSessionFromCookie(req.cookies ?? {}),
  };

  next();
}
