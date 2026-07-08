import type { NextFunction, Request, Response } from "express";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

export interface CustomerAuthRequest extends Request {
  customerUserId?: string;
  customerUser?: User;
}

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;

  const [type, token] = header.split(" ");
  if (type?.toLowerCase() !== "bearer" || !token) return null;

  return token.trim();
}

export async function requireCustomer(req: CustomerAuthRequest, res: Response, next: NextFunction) {
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

  req.customerUserId = data.user.id;
  req.customerUser = data.user;
  next();
}
