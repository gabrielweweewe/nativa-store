import { Router } from "express";
import type { MercadoPagoEnvironment } from "@shared/types/mercadoPago";
import { supabase } from "../lib/supabase";
import {
  getMercadoPagoOrder,
  mercadoPagoOrderIdentity,
  verifyMercadoPagoSignature,
} from "../services/mercadoPago";

const router = Router();

router.post("/", async (req, res) => {
  const dataId = String(req.query["data.id"] ?? req.body?.data?.id ?? "");
  const requestId = req.header("x-request-id") ?? undefined;
  const signature = req.header("x-signature") ?? undefined;

  try {
    const { data: attempt } = await supabase
      .from("payment_attempts")
      .select("environment")
      .eq("mercado_pago_order_id", dataId)
      .maybeSingle();
    const environment = attempt?.environment as
      | MercadoPagoEnvironment
      | undefined;
    const valid = await verifyMercadoPagoSignature({
      dataId,
      requestId,
      signature,
      environment,
    });
    if (!valid) {
      res.status(401).json({ error: "Assinatura inválida" });
      return;
    }

    const payload = await getMercadoPagoOrder(dataId, environment);
    const identity = mercadoPagoOrderIdentity(payload);
    const { error } = await supabase.rpc("reconcile_mercado_pago_payment", {
      p_mercado_pago_order_id: identity.orderId,
      p_mercado_pago_payment_id: identity.paymentId,
      p_payment_status: identity.status,
      p_status_detail: identity.statusDetail,
      p_response: payload,
    });
    if (error) throw new Error(error.message);

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Erro no webhook Mercado Pago:", error);
    res.status(500).json({ error: "Falha ao processar notificação" });
  }
});

export default router;
