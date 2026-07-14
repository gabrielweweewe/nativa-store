import { brevoNewsletterSchema } from "@shared/schemas/brevo";
import { Router } from "express";
import { supabase } from "../lib/supabase";
import { subscribeToNewsletter } from "../services/brevo";

const router = Router();

router.post("/", async (req, res) => {
  const parsed = brevoNewsletterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Dados inválidos",
      issues: parsed.error.issues,
    });
    return;
  }

  // Campo invisível para humanos. Bots recebem sucesso sem gravar dados.
  if (parsed.data.website?.trim()) {
    res.status(202).json({ subscribed: true });
    return;
  }

  try {
    const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { count, error: rateError } = await supabase
      .from("marketing_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("consent_ip", req.ip)
      .gte("consented_at", since);
    if (rateError) throw new Error(rateError.message);
    if ((count ?? 0) >= 10) {
      res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
      return;
    }

    await subscribeToNewsletter(parsed.data, {
      ip: req.ip,
      userAgent: req.header("user-agent"),
    });
    res.status(202).json({ subscribed: true });
  } catch (error) {
    console.error("Erro ao registrar newsletter:", error);
    res.status(500).json({ error: "Não foi possível concluir a inscrição" });
  }
});

export default router;
