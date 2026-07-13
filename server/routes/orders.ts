import { checkoutSchema } from "@shared/schemas/order";
import { Router } from "express";
import {
  requireCustomer,
  type CustomerAuthRequest,
} from "../middleware/requireCustomer";
import {
  createOrderFromCheckout,
  getCustomerOrder,
  listCustomerOrders,
} from "../services/orders";

const router = Router();

router.get("/me", requireCustomer, async (req: CustomerAuthRequest, res) => {
  try {
    const orders = await listCustomerOrders(req.customerUserId!);
    res.json(orders);
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Erro ao carregar pedidos",
    });
  }
});

router.get("/:id", requireCustomer, async (req: CustomerAuthRequest, res) => {
  try {
    const order = await getCustomerOrder(req.customerUserId!, req.params.id);
    res.json(order);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao carregar pedido";
    const status =
      message.includes("not found") || message.includes("0 rows") ? 404 : 500;
    res.status(status).json({ error: "Pedido não encontrado" });
  }
});

router.post(
  "/checkout",
  requireCustomer,
  async (req: CustomerAuthRequest, res) => {
    try {
      const parsed = checkoutSchema.safeParse(req.body);

      if (!parsed.success) {
        res
          .status(400)
          .json({ error: "Dados inválidos", issues: parsed.error.issues });
        return;
      }

      const result = await createOrderFromCheckout(
        req.customerUserId!,
        parsed.data
      );
      res.json(result);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao finalizar compra";
      const status =
        message.includes("Carrinho vazio") || message.includes("inválido")
          ? 400
          : 500;
      res.status(status).json({ error: message });
    }
  }
);

export default router;
