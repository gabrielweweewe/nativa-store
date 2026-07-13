import { Router } from "express";
import type { MercadoPagoEnvironment } from "@shared/types/mercadoPago";
import { supabase } from "../lib/supabase";
import {
  getMercadoPagoOrder,
  mercadoPagoOrderIdentity,
  verifyMercadoPagoSignature,
} from "../services/mercadoPago";
import { ensurePaidOrderInMelhorEnvioCart } from "../services/melhorEnvio";

const router = Router();

router.post("/", async (req, res) => {
  const nestedDataId =
    req.query.data &&
    typeof req.query.data === "object" &&
    "id" in req.query.data &&
    typeof req.query.data.id === "string"
      ? req.query.data.id
      : undefined;
  const signatureDataId =
    typeof req.query["data.id"] === "string"
      ? req.query["data.id"]
      : nestedDataId;
  const orderId = signatureDataId ?? String(req.body?.data?.id ?? "");
  const requestId = req.header("x-request-id") ?? undefined;
  const signature = req.header("x-signature") ?? undefined;

  try {
    const { data: attempt } = await supabase
      .from("payment_attempts")
      .select("environment")
      .eq("mercado_pago_order_id", orderId)
      .maybeSingle();
    const environment = attempt?.environment as
      | MercadoPagoEnvironment
      | undefined;
    const valid = await verifyMercadoPagoSignature({
      dataId: signatureDataId,
      requestId,
      signature,
      environment,
    });
    if (!valid) {
      res.status(401).json({ error: "Assinatura inválida" });
      return;
    }
    if (!attempt || !orderId) {
      res.status(200).json({ received: true, ignored: true });
      return;
    }

    const payload = await getMercadoPagoOrder(orderId, environment);
    const identity = mercadoPagoOrderIdentity(payload);
    const { data: reconciledOrderId, error } = await supabase.rpc("reconcile_mercado_pago_payment", {
      p_mercado_pago_order_id: identity.orderId,
      p_mercado_pago_payment_id: identity.paymentId,
      p_payment_status: identity.status,
      p_status_detail: identity.statusDetail,
      p_response: payload,
    });
    if (error) throw new Error(error.message);
    if (identity.status === "approved" && reconciledOrderId) {
      try {
        await ensurePaidOrderInMelhorEnvioCart(String(reconciledOrderId));
      } catch (shippingError) {
        console.error("Erro ao preparar etiqueta Melhor Envio:", shippingError);
      }
    }
    if (identity.instructions) {
      const { error: instructionsError } = await supabase
        .from("orders")
        .update({
          payment_instructions: identity.instructions,
          payment_expires_at: identity.instructions.expirationDate ?? null,
        })
        .eq("mercado_pago_order_id", identity.orderId);
      if (instructionsError) throw new Error(instructionsError.message);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Erro no webhook Mercado Pago:", error);
    res.status(500).json({ error: "Falha ao processar notificação" });
  }
});

export default router;
