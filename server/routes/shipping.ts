import {
  checkoutShippingQuoteSchema,
  shippingQuoteSchema,
} from "@shared/schemas/melhorEnvio";
import { Router } from "express";
import {
  requireCustomer,
  type CustomerAuthRequest,
} from "../middleware/requireCustomer";
import {
  calculateShipping,
  createCheckoutShippingQuote,
} from "../services/melhorEnvio";

const router = Router();

router.post("/quote", async (req, res) => {
  try {
    const parsed = shippingQuoteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", issues: parsed.error.issues });
      return;
    }

    const result = await calculateShipping(parsed.data);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao calcular frete";
    const status =
      message.includes("não conectado") || message.includes("CEP de origem") ? 503 : 500;
    res.status(status).json({ error: message });
  }
});

router.post(
  "/checkout-quote",
  requireCustomer,
  async (req: CustomerAuthRequest, res) => {
    try {
      const parsed = checkoutShippingQuoteSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "CEP inválido", issues: parsed.error.issues });
        return;
      }
      const result = await createCheckoutShippingQuote(
        req.customerUserId!,
        parsed.data.toPostalCode,
      );
      res.json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao calcular frete";
      const status = message.includes("Carrinho vazio") ? 400 : 500;
      res.status(status).json({ error: message });
    }
  },
);

export default router;
