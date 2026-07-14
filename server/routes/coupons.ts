import { Router } from "express";
import { getMapRewardCoupon } from "../services/coupons";

const router = Router();

/** Cupom público da recompensa do passaporte (Mapa das Origens). */
router.get("/map-reward", async (_req, res) => {
  try {
    const coupon = await getMapRewardCoupon();
    res.json(coupon);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar cupom do mapa",
    });
  }
});

export default router;
