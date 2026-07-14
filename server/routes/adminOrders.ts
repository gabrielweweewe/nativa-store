import {
  fulfillmentUpdateSchema,
  orderBulkExportSchema,
  orderBulkIdsSchema,
  orderStatusUpdateSchema,
} from "@shared/schemas/order";
import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  deleteOrdersByIds,
  getOrderById,
  getOrdersByIds,
  listAllOrders,
  updateOrderStatus,
  updateOrderFulfillment,
} from "../services/orders";
import { buildOrdersCsv } from "../services/ordersCsv";
import { buildOrdersPdfBuffer } from "../services/ordersPdf";
import { ensurePaidOrderInMelhorEnvioCart } from "../services/melhorEnvio";
import { retryOrderEmail } from "../services/orderEmails";

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

router.post("/bulk/delete", requireAdmin, async (req, res) => {
  try {
    const parsed = orderBulkIdsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", issues: parsed.error.issues });
      return;
    }

    const result = await deleteOrdersByIds(parsed.data.ids);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao excluir pedidos",
    });
  }
});

router.post("/bulk/export", requireAdmin, async (req, res) => {
  try {
    const parsed = orderBulkExportSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", issues: parsed.error.issues });
      return;
    }

    const orders = await getOrdersByIds(parsed.data.ids);
    const stamp = new Date().toISOString().slice(0, 10);

    if (parsed.data.format === "csv") {
      const csv = buildOrdersCsv(orders);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="pedidos-nativa-${stamp}.csv"`
      );
      res.send(csv);
      return;
    }

    const pdf = await buildOrdersPdfBuffer(orders);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="pedidos-nativa-${stamp}.pdf"`
    );
    res.send(pdf);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao exportar pedidos";
    const status = message.includes("encontrado") ? 404 : 500;
    res.status(status).json({ error: message });
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

router.patch("/:id/fulfillment", requireAdmin, async (req, res) => {
  try {
    const parsed = fulfillmentUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", issues: parsed.error.issues });
      return;
    }

    res.json(await updateOrderFulfillment(req.params.id, parsed.data));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar entrega";
    res.status(message.includes("não encontrado") ? 404 : 500).json({ error: message });
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

router.post("/:id/emails/:deliveryId/retry", requireAdmin, async (req, res) => {
  try {
    const result = await retryOrderEmail(req.params.id, req.params.deliveryId);
    if (result === "failed") {
      res.status(400).json({ error: "E-mail não encontrado ou limite atingido" });
      return;
    }
    res.json(await getOrderById(req.params.id));
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Erro ao reenviar e-mail",
    });
  }
});

export default router;
