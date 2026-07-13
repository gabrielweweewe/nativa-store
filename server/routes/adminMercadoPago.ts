import { mercadoPagoSettingsSchema } from "@shared/schemas/mercadoPago";
import type { MercadoPagoEnvironment } from "@shared/types/mercadoPago";
import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  getMercadoPagoAdminStatus,
  testMercadoPagoCredentials,
  updateMercadoPagoSettings,
} from "../services/mercadoPago";

const router = Router();

function environmentFrom(value: unknown): MercadoPagoEnvironment {
  return value === "production" ? "production" : "test";
}

router.get("/status", requireAdmin, async (req, res) => {
  try {
    res.json(
      await getMercadoPagoAdminStatus(environmentFrom(req.query.environment))
    );
  } catch (error) {
    res
      .status(500)
      .json({
        error: error instanceof Error ? error.message : "Erro ao carregar",
      });
  }
});

router.put("/settings", requireAdmin, async (req, res) => {
  const parsed = mercadoPagoSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Dados inválidos", issues: parsed.error.issues });
    return;
  }
  try {
    res.json(await updateMercadoPagoSettings(parsed.data));
  } catch (error) {
    res
      .status(500)
      .json({
        error: error instanceof Error ? error.message : "Erro ao salvar",
      });
  }
});

router.post("/test", requireAdmin, async (req, res) => {
  try {
    res.json(
      await testMercadoPagoCredentials(environmentFrom(req.body?.environment))
    );
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Credenciais inválidas",
    });
  }
});

export default router;
