import { metaCatalogSettingsSchema } from "@shared/schemas/metaCatalog";
import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  getMetaCatalogAdminStatus,
  testMetaCatalogFeed,
  updateMetaCatalogSettings,
} from "../services/metaCatalog";

const router = Router();

router.get("/status", requireAdmin, async (_req, res) => {
  try {
    res.json(await getMetaCatalogAdminStatus());
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar",
    });
  }
});

router.put("/settings", requireAdmin, async (req, res) => {
  const parsed = metaCatalogSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Dados inválidos", issues: parsed.error.issues });
    return;
  }

  try {
    res.json(await updateMetaCatalogSettings(parsed.data));
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao salvar",
    });
  }
});

router.post("/test", requireAdmin, async (_req, res) => {
  try {
    res.json(await testMetaCatalogFeed());
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao testar feed",
    });
  }
});

export default router;
