import { bannerReorderSchema, bannerSchema } from "@shared/schemas/banner";
import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  createBanner,
  deleteBanner,
  getBannerById,
  listAllBanners,
  reorderBanners,
  updateBanner,
} from "../services/banners";

const router = Router();

router.get("/", requireAdmin, async (_req, res) => {
  try {
    const banners = await listAllBanners();
    res.json(banners);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar banners",
    });
  }
});

router.patch("/reorder", requireAdmin, async (req, res) => {
  try {
    const parsed = bannerReorderSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", issues: parsed.error.issues });
      return;
    }

    const banners = await reorderBanners(parsed.data.orderedIds);
    res.json(banners);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao reordenar banners",
    });
  }
});

router.get("/:id", requireAdmin, async (req, res) => {
  try {
    const banner = await getBannerById(req.params.id);
    res.json(banner);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar banner";
    const status = message.includes("não encontrado") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const parsed = bannerSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", issues: parsed.error.issues });
      return;
    }

    const banner = await createBanner(parsed.data);
    res.status(201).json(banner);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao criar banner",
    });
  }
});

router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const parsed = bannerSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", issues: parsed.error.issues });
      return;
    }

    const banner = await updateBanner(req.params.id, parsed.data);
    res.json(banner);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar banner";
    const status = message.includes("não encontrado") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await deleteBanner(req.params.id);
    res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao excluir banner";
    const status = message.includes("não encontrado") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});

export default router;
