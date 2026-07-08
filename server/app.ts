import cookieParser from "cookie-parser";
import express from "express";
import adminRouter from "./routes/admin";
import cartRouter from "./routes/cart";
import customersRouter from "./routes/customers";
import productsRouter from "./routes/products";

export function createApiApp() {
  const app = express();

  app.use(express.json());
  app.use(cookieParser());
  app.use("/api/admin", adminRouter);
  app.use("/api/cart", cartRouter);
  app.use("/api/customers", customersRouter);
  app.use("/api/products", productsRouter);

  return app;
}
