import type { NextFunction, Request, Response } from "express";
import { ADMIN_COOKIE_NAME, verifyAdminToken } from "../lib/adminAuth";

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[ADMIN_COOKIE_NAME];

  if (!token || !verifyAdminToken(token)) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }

  next();
}
