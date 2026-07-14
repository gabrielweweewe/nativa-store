import cookieParser from "cookie-parser";
import express, { type NextFunction, type Request, type Response } from "express";
import adminRouter from "./routes/admin";
import analyticsRouter from "./routes/analytics";
import bannersRouter from "./routes/banners";
import cartRouter from "./routes/cart";
import customersRouter from "./routes/customers";
import ordersRouter from "./routes/orders";
import mercadoPagoRouter from "./routes/mercadoPago";
import mercadoPagoWebhookRouter from "./routes/mercadoPagoWebhook";
import productsRouter from "./routes/products";
import regionsRouter from "./routes/regions";
import shippingRouter from "./routes/shipping";
import seoRouter from "./routes/seo";

/**
 * No Vercel a única function é /api. Rewrites de /produto e /sitemap
 * caem aqui — redirecionamos internamente para /api/seo/*.
 */
function vercelSeoRewrite(req: Request, _res: Response, next: NextFunction) {
  const querySlug = req.query.nativaSeoProduct;
  if (typeof querySlug === "string" && querySlug.trim()) {
    req.url = `/api/seo/produto/${encodeURIComponent(querySlug.trim())}`;
    next();
    return;
  }

  // Alguns runtimes preservam o path original do rewrite
  const pathOnly = (req.path || "").split("?")[0];
  const productMatch = pathOnly.match(/^\/produto\/([^/]+)\/?$/);
  if (productMatch?.[1]) {
    req.url = `/api/seo/produto/${encodeURIComponent(decodeURIComponent(productMatch[1]))}`;
    next();
    return;
  }

  if (
    pathOnly === "/sitemap.xml" ||
    req.query.nativaSeoSitemap === "1" ||
    req.query.nativaSeoSitemap === "true"
  ) {
    req.url = "/api/seo/sitemap.xml";
    next();
    return;
  }

  next();
}

export function createApiApp() {
  const app = express();

  app.use(vercelSeoRewrite);
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/admin", adminRouter);
  app.use("/api/analytics", analyticsRouter);
  app.use("/api/banners", bannersRouter);
  app.use("/api/cart", cartRouter);
  app.use("/api/customers", customersRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/mercado-pago", mercadoPagoRouter);
  app.use("/api/webhooks/mercado-pago", mercadoPagoWebhookRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/regions", regionsRouter);
  app.use("/api/shipping", shippingRouter);
  app.use("/api/seo", seoRouter);

  return app;
}
