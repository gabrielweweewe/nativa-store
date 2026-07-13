import { Router } from "express";
import { getMercadoPagoPublicConfig } from "../services/mercadoPago";

const router = Router();

router.get("/config", async (_req, res) => {
  try {
    res.json(await getMercadoPagoPublicConfig());
  } catch {
    res.status(503).json({ error: "Pagamento Mercado Pago indisponível" });
  }
});

export default router;
