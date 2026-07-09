import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin";
import { getCustomerById, listAllCustomers } from "../services/adminCustomers";

const router = Router();

router.get("/", requireAdmin, async (_req, res) => {
  try {
    const customers = await listAllCustomers();
    res.json(customers);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar clientes",
    });
  }
});

router.get("/:id", requireAdmin, async (req, res) => {
  try {
    const customer = await getCustomerById(req.params.id);
    res.json(customer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar cliente";
    const status = message.includes("não encontrado") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

export default router;
