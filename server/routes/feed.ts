import { Router } from "express";
import { getPublicProductFeedXml } from "../services/metaCatalog";

const router = Router();

router.get("/products.xml", async (req, res) => {
  try {
    const token =
      typeof req.query.token === "string" ? req.query.token : undefined;
    const xml = await getPublicProductFeedXml(token);

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=900");
    res.status(200).send(xml);
  } catch (error) {
    const status =
      error instanceof Error &&
      typeof (error as Error & { status?: number }).status === "number"
        ? (error as Error & { status: number }).status
        : 500;

    res.status(status).json({
      error: error instanceof Error ? error.message : "Erro ao gerar feed",
    });
  }
});

export default router;
