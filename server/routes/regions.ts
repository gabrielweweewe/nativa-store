import { Router } from "express";
import { getRegionById, listRegions } from "../services/regions";

const router = Router();

/** Lista pública das regiões do Mapa Vivo das Origens, já com os produtos associados. */
router.get("/", async (_req, res) => {
  try {
    const regions = await listRegions();
    res.json(regions);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar regiões",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const region = await getRegionById(req.params.id);

    if (!region) {
      res.status(404).json({ error: "Região não encontrada" });
      return;
    }

    res.json(region);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar região",
    });
  }
});

export default router;
