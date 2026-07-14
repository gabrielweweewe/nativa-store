import { regionSchema } from "@shared/schemas/region";
import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  createRegion,
  deleteRegion,
  getRegionByIdRaw,
  listAllRegionsRaw,
  updateRegion,
} from "../services/regions";

const router = Router();

router.get("/", requireAdmin, async (_req, res) => {
  try {
    const regions = await listAllRegionsRaw();
    res.json(regions);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar regiões",
    });
  }
});

router.get("/:id", requireAdmin, async (req, res) => {
  try {
    const region = await getRegionByIdRaw(req.params.id);
    res.json(region);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar região";
    const status = message.includes("não encontrada") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const parsed = regionSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", issues: parsed.error.issues });
      return;
    }

    const region = await createRegion(parsed.data);
    res.status(201).json(region);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao criar região",
    });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const parsed = regionSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", issues: parsed.error.issues });
      return;
    }

    const region = await updateRegion(req.params.id, parsed.data);

    if (!region) {
      res.status(404).json({ error: "Região não encontrada" });
      return;
    }

    res.json(region);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao atualizar região",
    });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const deleted = await deleteRegion(req.params.id);

    if (!deleted) {
      res.status(404).json({ error: "Região não encontrada" });
      return;
    }

    res.status(204).end();
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao excluir região",
    });
  }
});

export default router;
