import { orderStatusUpdateSchema } from "@shared/schemas/order";
import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  getOrderById,
  listAllOrders,
  updateOrderStatus,
} from "../services/orders";
import { ensurePaidOrderInMelhorEnvioCart } from "../services/melhorEnvio";

const router = Router();

router.get("/", requireAdmin, async (_req, res) => {
  try {
    const orders = await listAllOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar pedidos",
    });
  }
});

router.get("/:id", requireAdmin, async (req, res) => {
  try {
    const order = await getOrderById(req.params.id);
    res.json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar pedido";
    const status = message.includes("não encontrado") || message.includes("0 rows") ? 404 : 500;
    res.status(status).json({ error: "Pedido não encontrado" });
  }
});

router.patch("/:id/status", requireAdmin, async (req, res) => {
  try {
    const parsed = orderStatusUpdateSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", issues: parsed.error.issues });
      return;
    }

    const order = await updateOrderStatus(req.params.id, parsed.data.status);
    res.json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar pedido";
    const status = message.includes("não encontrado") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

router.post("/:id/shipment/retry", requireAdmin, async (req, res) => {
  try {
    await ensurePaidOrderInMelhorEnvioCart(req.params.id);
    res.json(await getOrderById(req.params.id));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao reenviar para o Melhor Envio";
    res.status(400).json({ error: message });
  }
});

export default router;
