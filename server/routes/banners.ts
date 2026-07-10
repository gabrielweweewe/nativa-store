import { Router } from "express";
import { listActiveBanners } from "../services/banners";

const router = Router();

/** Lista pública dos banners ativos (carrossel da home). */
router.get("/", async (_req, res) => {
  try {
    const banners = await listActiveBanners();
    res.json(banners);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar banners",
    });
  }
});

export default router;
