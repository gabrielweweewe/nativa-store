import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin";
import { fetchTiendanubeImagesBySlugs } from "../services/tiendanubeImageFetch";

const router = Router();

router.post("/tiendanube-images", requireAdmin, async (req, res) => {
  try {
    const slugs = Array.isArray(req.body?.slugs)
      ? req.body.slugs.filter((item: unknown): item is string => typeof item === "string")
      : [];

    if (slugs.length === 0) {
      res.status(400).json({ error: "Envie um array 'slugs'" });
      return;
    }

    if (slugs.length > 100) {
      res.status(400).json({ error: "Máximo de 100 slugs por requisição" });
      return;
    }

    const images = await fetchTiendanubeImagesBySlugs(slugs);
    res.json({ images });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao buscar imagens da Tiendanube",
    });
  }
});

export default router;
