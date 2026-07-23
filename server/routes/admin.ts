import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import {
  ADMIN_COOKIE_MAX_AGE_MS,
  ADMIN_COOKIE_NAME,
  checkAdminPassword,
  signAdminToken,
} from "../lib/adminAuth";
import { upload } from "../lib/upload";
import { requireAdmin } from "../middleware/requireAdmin";
import { createSignedImageUpload, uploadProductImage } from "../services/uploads";
import adminBannersRouter from "./adminBanners";
import adminBrevoRouter from "./adminBrevo";
import adminCouponsRouter from "./adminCoupons";
import adminCustomersRouter from "./adminCustomers";
import adminDashboardRouter from "./adminDashboard";
import adminMelhorEnvioRouter from "./adminMelhorEnvio";
import adminMercadoPagoRouter from "./adminMercadoPago";
import adminMetaCatalogRouter from "./adminMetaCatalog";
import adminNotificationsRouter from "./adminNotifications";
import adminOrdersRouter from "./adminOrders";
import adminQuizRouter from "./adminQuiz";
import adminRegionsRouter from "./adminRegions";

const router = Router();

/** Envolve o multer para transformar erros (arquivo grande/tipo inválido) em JSON em vez de HTML. */
function handleSingleImageUpload(
  req: Request,
  res: Response,
  next: NextFunction
) {
  upload.single("file")(req, res, (error: unknown) => {
    if (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao processar upload";
      res.status(400).json({ error: message });
      return;
    }
    next();
  });
}

router.post("/login", (req, res) => {
  const password =
    typeof req.body?.password === "string" ? req.body.password : "";

  if (!password) {
    res.status(400).json({ error: "Informe a senha" });
    return;
  }

  let isValid: boolean;
  try {
    isValid = checkAdminPassword(password);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao validar senha",
    });
    return;
  }

  if (!isValid) {
    res.status(401).json({ error: "Senha inválida" });
    return;
  }

  const token = signAdminToken();

  res.cookie(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_COOKIE_MAX_AGE_MS,
    path: "/",
  });

  res.json({ authenticated: true });
});

router.post("/logout", (_req, res) => {
  res.clearCookie(ADMIN_COOKIE_NAME, { path: "/" });
  res.json({ authenticated: false });
});

router.get("/me", requireAdmin, (_req, res) => {
  res.json({ authenticated: true });
});

router.use("/orders", adminOrdersRouter);
router.use("/customers", adminCustomersRouter);
router.use("/notifications", adminNotificationsRouter);
router.use("/dashboard", adminDashboardRouter);
router.use("/banners", adminBannersRouter);
router.use("/coupons", adminCouponsRouter);
router.use("/brevo", adminBrevoRouter);
router.use("/quiz", adminQuizRouter);
router.use("/regions", adminRegionsRouter);
router.use("/melhor-envio", adminMelhorEnvioRouter);
router.use("/mercado-pago", adminMercadoPagoRouter);
router.use("/meta-catalog", adminMetaCatalogRouter);

router.post(
  "/uploads",
  requireAdmin,
  handleSingleImageUpload,
  async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Nenhum arquivo enviado" });
        return;
      }

      const folderRaw =
        typeof req.body?.folder === "string" ? req.body.folder : "products";
      const folder =
        folderRaw === "banners" ? "banners" : folderRaw === "quiz" ? "quiz" : "products";
      const url = await uploadProductImage(req.file, folder);
      res.json({ url });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Erro ao enviar imagem",
      });
    }
  }
);

/** Prepara upload direto ao Supabase (evita limite de payload da Vercel). */
router.post("/uploads/sign", requireAdmin, async (req, res) => {
  try {
    const folderRaw = typeof req.body?.folder === "string" ? req.body.folder : "products";
    const folder =
      folderRaw === "banners" ? "banners" : folderRaw === "quiz" ? "quiz" : "products";
    const contentType =
      typeof req.body?.contentType === "string" ? req.body.contentType : "";

    if (!contentType) {
      res.status(400).json({ error: "Informe o contentType do arquivo" });
      return;
    }

    const signed = await createSignedImageUpload({ folder, contentType });
    res.json(signed);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Erro ao preparar upload",
    });
  }
});

export default router;
