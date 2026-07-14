import cookieParser from "cookie-parser";
import express from "express";
import adminRouter from "./routes/admin";
import analyticsRouter from "./routes/analytics";
import bannersRouter from "./routes/banners";
import cartRouter from "./routes/cart";
import customersRouter from "./routes/customers";
import ordersRouter from "./routes/orders";
import mercadoPagoRouter from "./routes/mercadoPago";
import mercadoPagoWebhookRouter from "./routes/mercadoPagoWebhook";
import productsRouter from "./routes/products";
import shippingRouter from "./routes/shipping";
import seoRouter from "./routes/seo";

export function createApiApp() {
  const app = express();

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
  app.use("/api/shipping", shippingRouter);
  app.use("/api/seo", seoRouter);

  return app;
}
