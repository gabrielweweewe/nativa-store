import { melhorEnvioSettingsSchema } from "@shared/schemas/melhorEnvio";
import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  buildAuthorizeUrl,
  disconnectMelhorEnvio,
  exchangeAuthorizationCode,
  getDefaultRedirectUri,
  getMelhorEnvioStatus,
  updateMelhorEnvioSettings,
} from "../services/melhorEnvio";

const router = Router();

function adminIntegrationsUrl(query: Record<string, string>): string {
  const base =
    process.env.APP_URL?.trim() ||
    process.env.VITE_APP_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");

  const origin = base.replace(/\/$/, "").startsWith("http")
    ? base.replace(/\/$/, "")
    : `https://${base.replace(/\/$/, "")}`;

  const params = new URLSearchParams(query);
  return `${origin}/admin/integracoes?${params.toString()}`;
}

router.get("/status", requireAdmin, async (_req, res) => {
  try {
    const status = await getMelhorEnvioStatus();
    res.json({
      ...status,
      suggestedRedirectUri: getDefaultRedirectUri(),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar Melhor Envio",
    });
  }
});

router.put("/settings", requireAdmin, async (req, res) => {
  try {
    const parsed = melhorEnvioSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", issues: parsed.error.issues });
      return;
    }

    const status = await updateMelhorEnvioSettings(parsed.data);
    res.json({
      ...status,
      suggestedRedirectUri: getDefaultRedirectUri(),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao salvar Melhor Envio",
    });
  }
});

/** Inicia OAuth: redireciona o navegador para o Melhor Envio. */
router.get("/connect", requireAdmin, async (_req, res) => {
  try {
    const url = await buildAuthorizeUrl();
    res.redirect(url);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao iniciar autorização";
    res.redirect(adminIntegrationsUrl({ me_error: message }));
  }
});

/**
 * Callback OAuth do Melhor Envio.
 * Não exige cookie admin no middleware (o redirect vem do ME), mas valida o `state` assinado.
 */
router.get("/callback", async (req, res) => {
  try {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const errorParam = typeof req.query.error === "string" ? req.query.error : "";

    if (errorParam) {
      const description =
        typeof req.query.error_description === "string"
          ? req.query.error_description
          : errorParam;
      res.redirect(adminIntegrationsUrl({ me_error: description }));
      return;
    }

    if (!code || !state) {
      res.redirect(adminIntegrationsUrl({ me_error: "Código de autorização ausente" }));
      return;
    }

    await exchangeAuthorizationCode(code, state);
    res.redirect(adminIntegrationsUrl({ me_connected: "1" }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha na autorização";
    res.redirect(adminIntegrationsUrl({ me_error: message }));
  }
});

router.post("/disconnect", requireAdmin, async (_req, res) => {
  try {
    const status = await disconnectMelhorEnvio();
    res.json({
      ...status,
      suggestedRedirectUri: getDefaultRedirectUri(),
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao desconectar Melhor Envio",
    });
  }
});

export default router;
