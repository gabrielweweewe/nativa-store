// server/app.ts
import cookieParser from "cookie-parser";
import express from "express";

// server/routes/admin.ts
import { Router as Router10 } from "express";

// server/lib/adminAuth.ts
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
var ADMIN_COOKIE_NAME = "nativa_admin_token";
var ADMIN_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1e3;
var TOKEN_TTL = "7d";
function getJwtSecret() {
  const secret = process.env.ADMIN_JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("Configure ADMIN_JWT_SECRET no arquivo .env");
  }
  return secret;
}
function getAdminPassword() {
  const password = process.env.ADMIN_PASSWORD?.trim();
  if (!password) {
    throw new Error("Configure ADMIN_PASSWORD no arquivo .env");
  }
  return password;
}
function checkAdminPassword(candidate) {
  const expected = getAdminPassword();
  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  if (candidateBuffer.length !== expectedBuffer.length) {
    crypto.timingSafeEqual(expectedBuffer, expectedBuffer);
    return false;
  }
  return crypto.timingSafeEqual(candidateBuffer, expectedBuffer);
}
function signAdminToken() {
  return jwt.sign({ role: "admin" }, getJwtSecret(), { expiresIn: TOKEN_TTL });
}
function verifyAdminToken(token) {
  try {
    const payload = jwt.verify(token, getJwtSecret());
    return typeof payload === "object" && payload !== null && payload.role === "admin";
  } catch {
    return false;
  }
}

// server/lib/upload.ts
import multer from "multer";
var ALLOWED_IMAGE_MIME_TYPES = /* @__PURE__ */ new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);
var MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
      callback(new Error("Formato de imagem n\xE3o suportado. Use JPG, PNG, WEBP ou GIF."));
      return;
    }
    callback(null, true);
  }
});

// server/middleware/requireAdmin.ts
function requireAdmin(req, res, next) {
  const token = req.cookies?.[ADMIN_COOKIE_NAME];
  if (!token || !verifyAdminToken(token)) {
    res.status(401).json({ error: "N\xE3o autenticado" });
    return;
  }
  next();
}

// server/services/uploads.ts
import { nanoid } from "nanoid";
import sharp from "sharp";

// server/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
var url = process.env.SUPABASE_URL?.trim();
var secretKey = (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY)?.trim();
if (!url || !secretKey) {
  throw new Error(
    "Configure SUPABASE_URL e SUPABASE_SECRET_KEY no arquivo .env"
  );
}
if (secretKey.includes("COLE_") || secretKey.includes("sua_chave") || !secretKey.startsWith("sb_secret_") && !secretKey.startsWith("eyJ")) {
  throw new Error(
    "SUPABASE_SECRET_KEY inv\xE1lida. Use a Secret key (sb_secret_...) ou service_role (eyJ...) do Supabase."
  );
}
var supabase = createClient(url, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// server/services/uploads.ts
var PRODUCT_IMAGES_BUCKET = "product-images";
var MAX_STORAGE_FILE_BYTES = 15 * 1024 * 1024;
var WEBP_QUALITY = 82;
var MAX_DIMENSION_BY_FOLDER = {
  products: 1600,
  banners: 2400
};
var EXT_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif"
};
async function toOptimizedWebp(buffer, folder) {
  const maxSide = MAX_DIMENSION_BY_FOLDER[folder];
  return sharp(buffer, { failOn: "none" }).rotate().resize({
    width: maxSide,
    height: maxSide,
    fit: "inside",
    withoutEnlargement: true
  }).webp({ quality: WEBP_QUALITY, effort: 4 }).toBuffer();
}
function isGif(mimetype) {
  return mimetype === "image/gif";
}
async function uploadProductImage(file, folder = "products") {
  if (isGif(file.mimetype)) {
    const path3 = `${folder}/${Date.now()}-${nanoid(8)}.gif`;
    const { error: error2 } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path3, file.buffer, {
      contentType: "image/gif",
      cacheControl: "31536000",
      upsert: false
    });
    if (error2) {
      throw new Error(`Falha ao enviar imagem para o Supabase Storage: ${error2.message}`);
    }
    const { data: data2 } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path3);
    return data2.publicUrl;
  }
  let webpBuffer;
  try {
    webpBuffer = await toOptimizedWebp(file.buffer, folder);
  } catch {
    throw new Error(
      "N\xE3o foi poss\xEDvel processar a imagem. Tente outro arquivo JPG, PNG, WEBP ou GIF."
    );
  }
  const path2 = `${folder}/${Date.now()}-${nanoid(8)}.webp`;
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path2, webpBuffer, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false
  });
  if (error) {
    throw new Error(`Falha ao enviar imagem para o Supabase Storage: ${error.message}`);
  }
  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path2);
  return data.publicUrl;
}
async function createSignedImageUpload(input) {
  const contentType = input.contentType.toLowerCase().trim();
  if (!ALLOWED_IMAGE_MIME_TYPES.has(contentType)) {
    throw new Error("Formato de imagem n\xE3o suportado. Use JPG, PNG, WEBP ou GIF.");
  }
  const ext = EXT_BY_MIME[contentType] ?? "bin";
  const path2 = `${input.folder}/${Date.now()}-${nanoid(8)}.${ext}`;
  const { data, error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).createSignedUploadUrl(path2);
  if (error || !data) {
    throw new Error(
      `N\xE3o foi poss\xEDvel preparar o upload: ${error?.message ?? "resposta vazia do Storage"}`
    );
  }
  const { data: publicData } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(data.path);
  return {
    path: data.path,
    token: data.token,
    signedUrl: data.signedUrl,
    publicUrl: publicData.publicUrl
  };
}

// shared/schemas/banner.ts
import { z } from "zod";
var optionalUrl = z.string().trim().optional().nullable().transform((value) => {
  if (value == null || value === "") return null;
  return value;
});
var bannerSchema = z.object({
  title: z.string().trim().max(120, "T\xEDtulo muito longo").default(""),
  altText: z.string().trim().min(1, "Informe um texto alternativo").max(200, "Texto alternativo muito longo"),
  imageUrl: z.string().trim().min(1, "Adicione a imagem do banner"),
  imageUrlMobile: optionalUrl,
  linkUrl: optionalUrl,
  objectPosition: z.string().trim().min(1).max(60).default("center center"),
  objectPositionMobile: z.string().trim().min(1).max(60).default("center 22%"),
  sortOrder: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional().default(true)
});
var bannerReorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1, "Informe a nova ordem")
});

// server/routes/adminBanners.ts
import { Router } from "express";

// shared/lib/bannerMapper.ts
function mapBannerRowToBanner(row) {
  return {
    id: row.id,
    title: row.title ?? "",
    altText: row.alt_text ?? "Banner Nativa",
    imageUrl: row.image_url,
    imageUrlMobile: row.image_url_mobile,
    linkUrl: row.link_url,
    objectPosition: row.object_position || "center center",
    objectPositionMobile: row.object_position_mobile || "center 22%",
    sortOrder: row.sort_order ?? 0,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function mapBannerInputToRow(input) {
  return {
    title: input.title ?? "",
    alt_text: input.altText,
    image_url: input.imageUrl,
    image_url_mobile: input.imageUrlMobile ?? null,
    link_url: input.linkUrl ?? null,
    object_position: input.objectPosition ?? "center center",
    object_position_mobile: input.objectPositionMobile ?? "center 22%",
    sort_order: input.sortOrder ?? 0,
    is_active: input.isActive ?? true,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// server/services/banners.ts
var BANNER_SELECT = "id, title, alt_text, image_url, image_url_mobile, link_url, object_position, object_position_mobile, sort_order, is_active, created_at, updated_at";
async function listActiveBanners() {
  const { data, error } = await supabase.from("banners").select(BANNER_SELECT).eq("is_active", true).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  if (error) {
    throw new Error(`Erro ao listar banners: ${error.message}`);
  }
  return (data ?? []).map(mapBannerRowToBanner);
}
async function listAllBanners() {
  const { data, error } = await supabase.from("banners").select(BANNER_SELECT).order("sort_order", { ascending: true }).order("created_at", { ascending: true });
  if (error) {
    throw new Error(`Erro ao listar banners: ${error.message}`);
  }
  return (data ?? []).map(mapBannerRowToBanner);
}
async function getBannerById(id) {
  const { data, error } = await supabase.from("banners").select(BANNER_SELECT).eq("id", id).single();
  if (error) {
    throw new Error(error.code === "PGRST116" ? "Banner n\xE3o encontrado" : error.message);
  }
  return mapBannerRowToBanner(data);
}
async function createBanner(input) {
  const sortOrder = input.sortOrder ?? await (async () => {
    const { data: data2 } = await supabase.from("banners").select("sort_order").order("sort_order", { ascending: false }).limit(1).maybeSingle();
    return (data2?.sort_order ?? -1) + 1;
  })();
  const row = mapBannerInputToRow({ ...input, sortOrder });
  const { data, error } = await supabase.from("banners").insert(row).select(BANNER_SELECT).single();
  if (error) {
    throw new Error(`Erro ao criar banner: ${error.message}`);
  }
  return mapBannerRowToBanner(data);
}
async function updateBanner(id, input) {
  const row = mapBannerInputToRow(input);
  const { data, error } = await supabase.from("banners").update(row).eq("id", id).select(BANNER_SELECT).single();
  if (error) {
    throw new Error(
      error.code === "PGRST116" ? "Banner n\xE3o encontrado" : `Erro ao atualizar banner: ${error.message}`
    );
  }
  return mapBannerRowToBanner(data);
}
async function deleteBanner(id) {
  const { error, count } = await supabase.from("banners").delete({ count: "exact" }).eq("id", id);
  if (error) {
    throw new Error(`Erro ao excluir banner: ${error.message}`);
  }
  if (count === 0) {
    throw new Error("Banner n\xE3o encontrado");
  }
}
async function reorderBanners(orderedIds) {
  const updates = orderedIds.map(
    (id, index) => supabase.from("banners").update({ sort_order: index, updated_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new Error(`Erro ao reordenar banners: ${failed.error.message}`);
  }
  return listAllBanners();
}

// server/routes/adminBanners.ts
var router = Router();
router.get("/", requireAdmin, async (_req, res) => {
  try {
    const banners = await listAllBanners();
    res.json(banners);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar banners"
    });
  }
});
router.patch("/reorder", requireAdmin, async (req, res) => {
  try {
    const parsed = bannerReorderSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inv\xE1lidos", issues: parsed.error.issues });
      return;
    }
    const banners = await reorderBanners(parsed.data.orderedIds);
    res.json(banners);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao reordenar banners"
    });
  }
});
router.get("/:id", requireAdmin, async (req, res) => {
  try {
    const banner = await getBannerById(req.params.id);
    res.json(banner);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar banner";
    const status = message.includes("n\xE3o encontrado") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});
router.post("/", requireAdmin, async (req, res) => {
  try {
    const parsed = bannerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inv\xE1lidos", issues: parsed.error.issues });
      return;
    }
    const banner = await createBanner(parsed.data);
    res.status(201).json(banner);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao criar banner"
    });
  }
});
router.put("/:id", requireAdmin, async (req, res) => {
  try {
    const parsed = bannerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inv\xE1lidos", issues: parsed.error.issues });
      return;
    }
    const banner = await updateBanner(req.params.id, parsed.data);
    res.json(banner);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar banner";
    const status = message.includes("n\xE3o encontrado") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});
router.delete("/:id", requireAdmin, async (req, res) => {
  try {
    await deleteBanner(req.params.id);
    res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao excluir banner";
    const status = message.includes("n\xE3o encontrado") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});
var adminBanners_default = router;

// shared/schemas/brevo.ts
import { z as z2 } from "zod";
var nullablePositiveInteger = z2.number().int().positive().nullable();
var recipientSchema = z2.object({
  email: z2.email().max(320),
  name: z2.string().trim().min(1).max(150).optional()
});
var brevoSettingsSchema = z2.object({
  enabled: z2.boolean(),
  apiKey: z2.string().trim().max(500).optional(),
  webhookToken: z2.string().trim().min(32).max(500).optional(),
  defaultSenderId: nullablePositiveInteger.optional(),
  defaultSenderEmail: z2.union([z2.literal(""), z2.email().max(320)]).optional(),
  defaultSenderName: z2.string().trim().max(150).optional(),
  replyTo: z2.union([z2.literal(""), z2.email().max(320)]).optional(),
  defaultListId: nullablePositiveInteger.optional(),
  templateOrderReceived: nullablePositiveInteger.optional(),
  templatePaymentApproved: nullablePositiveInteger.optional(),
  templatePaymentFailed: nullablePositiveInteger.optional(),
  templatePaymentRefunded: nullablePositiveInteger.optional(),
  templateOrderProcessing: nullablePositiveInteger.optional(),
  templateOrderShipped: nullablePositiveInteger.optional(),
  templateOrderDelivered: nullablePositiveInteger.optional()
});
var brevoContactSchema = z2.object({
  email: z2.email().max(320),
  firstName: z2.string().trim().min(1).max(100).optional(),
  lastName: z2.string().trim().min(1).max(100).optional(),
  attributes: z2.record(
    z2.string(),
    z2.union([z2.string(), z2.number(), z2.boolean(), z2.null()])
  ).optional(),
  listIds: z2.array(z2.number().int().positive()).max(100).optional(),
  unlinkListIds: z2.array(z2.number().int().positive()).max(100).optional(),
  updateEnabled: z2.boolean().optional()
});
var brevoTransactionalEmailSchema = z2.object({
  to: z2.array(recipientSchema).min(1).max(50),
  sender: recipientSchema.optional(),
  replyTo: recipientSchema.optional(),
  subject: z2.string().trim().min(1).max(998).optional(),
  htmlContent: z2.string().min(1).max(1e6).optional(),
  textContent: z2.string().min(1).max(1e6).optional(),
  templateId: z2.number().int().positive().optional(),
  params: z2.record(z2.string(), z2.unknown()).optional(),
  tags: z2.array(z2.string().trim().min(1).max(128)).max(10).optional(),
  sandbox: z2.boolean().optional()
}).superRefine((value, ctx) => {
  const contentCount = [
    value.htmlContent,
    value.textContent,
    value.templateId
  ].filter((item) => item !== void 0).length;
  if (contentCount !== 1) {
    ctx.addIssue({
      code: "custom",
      message: "Informe exatamente um conte\xFAdo: htmlContent, textContent ou templateId"
    });
  }
  if (!value.templateId && !value.subject) {
    ctx.addIssue({
      code: "custom",
      path: ["subject"],
      message: "O assunto \xE9 obrigat\xF3rio quando n\xE3o h\xE1 template"
    });
  }
});
var brevoCampaignSchema = z2.object({
  name: z2.string().trim().min(1).max(200),
  subject: z2.string().trim().min(1).max(998),
  sender: recipientSchema.optional(),
  recipients: z2.object({
    listIds: z2.array(z2.number().int().positive()).min(1).max(100),
    exclusionListIds: z2.array(z2.number().int().positive()).max(100).optional()
  }).optional(),
  senderId: z2.number().int().positive().optional(),
  listIds: z2.array(z2.number().int().positive()).min(1).max(100).optional(),
  htmlContent: z2.string().min(1).max(1e6).optional(),
  templateId: z2.number().int().positive().optional(),
  replyTo: z2.email().max(320).optional(),
  tag: z2.string().trim().min(1).max(128).optional()
}).superRefine((value, ctx) => {
  if (Boolean(value.htmlContent) === Boolean(value.templateId)) {
    ctx.addIssue({
      code: "custom",
      message: "Informe htmlContent ou templateId, mas n\xE3o ambos"
    });
  }
  if (!(value.recipients?.listIds.length || value.listIds?.length)) {
    ctx.addIssue({
      code: "custom",
      path: ["listIds"],
      message: "Informe pelo menos uma lista"
    });
  }
});
var brevoCampaignScheduleSchema = z2.object({
  scheduledAt: z2.iso.datetime({ offset: true }).refine(
    (value) => Date.parse(value) > Date.now(),
    "O agendamento deve estar no futuro"
  )
});
var brevoCampaignTestSchema = z2.object({
  emails: z2.array(z2.email().max(320)).min(1).max(50)
});
var brevoNewsletterSchema = z2.object({
  email: z2.email().max(320),
  consent: z2.literal(true),
  name: z2.string().trim().min(1).max(150).optional(),
  source: z2.string().trim().min(1).max(100).optional(),
  website: z2.string().max(200).optional()
});
var brevoListCreateSchema = z2.object({
  name: z2.string().trim().min(1).max(150),
  folderId: z2.number().int().positive().optional()
});
var brevoQuickTestSchema = z2.object({
  email: z2.email().max(320),
  subject: z2.string().trim().min(1).max(998),
  htmlContent: z2.string().min(1).max(1e6),
  senderId: z2.number().int().positive()
});

// server/routes/adminBrevo.ts
import { Router as Router2 } from "express";
import { z as z3 } from "zod";

// server/services/brevo.ts
import { BrevoClient } from "@getbrevo/brevo";

// server/lib/secretCrypto.ts
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes
} from "node:crypto";
function encryptionKey(keyName) {
  const source = process.env[keyName]?.trim();
  if (!source || source.length < 32) {
    throw new Error(`${keyName} deve ter pelo menos 32 caracteres`);
  }
  return createHash("sha256").update(source).digest();
}
function encryptSecret(value, keyName = "MERCADO_PAGO_ENCRYPTION_KEY") {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(keyName), iv);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url")
  ].join(".");
}
function decryptSecret(value, keyName = "MERCADO_PAGO_ENCRYPTION_KEY") {
  const [version, ivRaw, tagRaw, payloadRaw] = value.split(".");
  if (version !== "v1" || !ivRaw || !tagRaw || !payloadRaw) {
    throw new Error("Segredo criptografado inv\xE1lido");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(keyName),
    Buffer.from(ivRaw, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(payloadRaw, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

// server/services/brevo.ts
var BREVO_API_URL = "https://api.brevo.com/v3";
var BREVO_KEY = "BREVO_ENCRYPTION_KEY";
var BrevoApiError = class extends Error {
  constructor(message, status, payload) {
    super(message);
    this.status = status;
    this.payload = payload;
    this.name = "BrevoApiError";
  }
};
function publicAppUrl() {
  const raw = process.env.APP_URL?.trim() || process.env.VITE_APP_URL?.trim() || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  return (raw.startsWith("http") ? raw : `https://${raw}`).replace(/\/$/, "");
}
function getBrevoWebhookUrl() {
  return `${publicAppUrl()}/api/webhooks/brevo`;
}
async function getSettingsRow() {
  const { data, error } = await supabase.from("brevo_settings").select("*").eq("id", true).single();
  if (error) throw new Error(error.message);
  return data;
}
async function getActiveSettings() {
  const row = await getSettingsRow();
  if (!row.enabled) throw new Error("Brevo n\xE3o est\xE1 habilitado");
  if (!row.api_key_encrypted)
    throw new Error("Chave da API Brevo n\xE3o configurada");
  return {
    ...row,
    apiKey: decryptSecret(row.api_key_encrypted, BREVO_KEY)
  };
}
function adminStatus(row) {
  return {
    enabled: row.enabled,
    defaultSenderId: row.default_sender_id,
    defaultSenderEmail: row.default_sender_email,
    defaultSenderName: row.default_sender_name,
    replyTo: row.reply_to,
    defaultListId: row.default_list_id,
    templateOrderReceived: row.template_order_received,
    templatePaymentApproved: row.template_payment_approved,
    templatePaymentFailed: row.template_payment_failed,
    templatePaymentRefunded: row.template_payment_refunded,
    templateOrderProcessing: row.template_order_processing,
    templateOrderShipped: row.template_order_shipped,
    templateOrderDelivered: row.template_order_delivered,
    hasApiKey: Boolean(row.api_key_encrypted),
    hasWebhookToken: Boolean(row.webhook_token_encrypted),
    configured: Boolean(row.api_key_encrypted),
    connected: Boolean(row.api_key_encrypted && row.last_tested_at),
    accountEmail: row.account_email,
    webhookConfigured: Boolean(
      row.webhook_token_encrypted || process.env.BREVO_WEBHOOK_TOKEN?.trim()
    ),
    lastTestedAt: row.last_tested_at,
    webhookUrl: getBrevoWebhookUrl()
  };
}
async function getBrevoAdminStatus() {
  return adminStatus(await getSettingsRow());
}
async function updateBrevoSettings(input) {
  const update = {
    enabled: input.enabled,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (input.defaultSenderId !== void 0)
    update.default_sender_id = input.defaultSenderId;
  if (input.defaultSenderEmail !== void 0) {
    update.default_sender_email = input.defaultSenderEmail.trim().toLowerCase();
  }
  if (input.defaultSenderName !== void 0) {
    update.default_sender_name = input.defaultSenderName.trim();
  }
  if (input.replyTo !== void 0) update.reply_to = input.replyTo.trim().toLowerCase();
  if (input.defaultListId !== void 0)
    update.default_list_id = input.defaultListId;
  const templateColumns = {
    templateOrderReceived: "template_order_received",
    templatePaymentApproved: "template_payment_approved",
    templatePaymentFailed: "template_payment_failed",
    templatePaymentRefunded: "template_payment_refunded",
    templateOrderProcessing: "template_order_processing",
    templateOrderShipped: "template_order_shipped",
    templateOrderDelivered: "template_order_delivered"
  };
  for (const [field, column] of Object.entries(templateColumns)) {
    if (input[field] !== void 0) update[column] = input[field];
  }
  if (input.apiKey?.trim()) {
    update.api_key_encrypted = encryptSecret(input.apiKey.trim(), BREVO_KEY);
    update.account_email = null;
    update.last_tested_at = null;
  }
  if (input.webhookToken?.trim()) {
    update.webhook_token_encrypted = encryptSecret(
      input.webhookToken.trim(),
      BREVO_KEY
    );
  }
  const { data, error } = await supabase.from("brevo_settings").update(update).eq("id", true).select("*").single();
  if (error) throw new Error(error.message);
  return adminStatus(data);
}
async function getBrevoWebhookToken() {
  const environmentToken = process.env.BREVO_WEBHOOK_TOKEN?.trim();
  if (environmentToken) return environmentToken;
  const row = await getSettingsRow();
  if (!row.webhook_token_encrypted) {
    throw new Error("Token do webhook Brevo n\xE3o configurado");
  }
  return decryptSecret(row.webhook_token_encrypted, BREVO_KEY);
}
async function configureBrevoWebhooks() {
  const token = await getBrevoWebhookToken();
  const url2 = getBrevoWebhookUrl();
  const definitions = [
    {
      type: "transactional",
      events: [
        "sent",
        "delivered",
        "opened",
        "click",
        "softBounce",
        "hardBounce",
        "invalid",
        "blocked",
        "error",
        "complaint",
        "unsubscribed"
      ]
    },
    {
      type: "marketing",
      events: [
        "delivered",
        "opened",
        "click",
        "softBounce",
        "hardBounce",
        "spam",
        "unsubscribe"
      ]
    }
  ];
  const configured = [];
  for (const definition of definitions) {
    const existing = await brevoRequest(
      `/webhooks${queryString({ type: definition.type, sort: "desc" })}`
    );
    const match = existing.webhooks?.find((webhook) => webhook.url === url2);
    const body = {
      description: `Nativa Store (${definition.type})`,
      url: url2,
      events: definition.events,
      type: definition.type,
      auth: { type: "bearer", token }
    };
    configured.push(
      await brevoRequest(match ? `/webhooks/${match.id}` : "/webhooks", {
        method: match ? "PUT" : "POST",
        body: JSON.stringify(body)
      })
    );
  }
  return { success: true, webhookUrl: url2, configured };
}
async function getBrevoTransactionalConfig() {
  const settings = await getActiveSettings();
  return {
    enabled: settings.enabled,
    replyTo: settings.reply_to,
    templates: {
      order_received: settings.template_order_received,
      payment_approved: settings.template_payment_approved,
      payment_failed: settings.template_payment_failed,
      payment_refunded: settings.template_payment_refunded,
      order_processing: settings.template_order_processing,
      order_shipped: settings.template_order_shipped,
      order_delivered: settings.template_order_delivered
    }
  };
}
function queryString(values) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== void 0) query.set(key, String(value));
  }
  const encoded = query.toString();
  return encoded ? `?${encoded}` : "";
}
async function brevoRequest(path2, options = {}, apiKey) {
  const key = apiKey ?? (await getActiveSettings()).apiKey;
  const client = new BrevoClient({
    apiKey: key,
    maxRetries: 3,
    timeoutInSeconds: 20
  });
  const response = await client.fetch(
    `${BREVO_API_URL}${path2}`,
    {
      ...options,
      headers: {
        accept: "application/json",
        ...options.body ? { "content-type": "application/json" } : {},
        ...options.headers ?? {}
      }
    },
    { maxRetries: 3, timeoutInSeconds: 20 }
  );
  const raw = await response.text();
  let body = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = { message: raw };
  }
  if (!response.ok) {
    throw new BrevoApiError(
      String(
        body?.message ?? body?.error ?? `Brevo respondeu HTTP ${response.status}`
      ),
      response.status,
      body
    );
  }
  return body;
}
async function testBrevoCredentials() {
  const account = await brevoRequest("/account");
  const testedAt = (/* @__PURE__ */ new Date()).toISOString();
  const { error } = await supabase.from("brevo_settings").update({
    account_email: account.email ?? null,
    last_tested_at: testedAt,
    updated_at: testedAt
  }).eq("id", true);
  if (error) throw new Error(error.message);
  return { success: true, account };
}
async function listBrevoTemplates(limit = 50, offset = 0) {
  const result = await brevoRequest(
    `/smtp/templates${queryString({ limit, offset, sort: "desc" })}`
  );
  return result.templates ?? [];
}
async function listBrevoSenders() {
  const result = await brevoRequest("/senders");
  return result.senders ?? [];
}
async function listBrevoLists(limit = 50, offset = 0) {
  const result = await brevoRequest(
    `/contacts/lists${queryString({ limit, offset, sort: "desc" })}`
  );
  return result.lists ?? [];
}
async function createBrevoList(input) {
  let folderId = input.folderId;
  if (!folderId) {
    const result = await brevoRequest(
      `/contacts/folders${queryString({ limit: 1, offset: 0, sort: "desc" })}`
    );
    folderId = result.folders?.[0]?.id;
  }
  if (!folderId) throw new Error("Nenhuma pasta Brevo dispon\xEDvel para a lista");
  return brevoRequest("/contacts/lists", {
    method: "POST",
    body: JSON.stringify({ name: input.name, folderId })
  });
}
function deleteBrevoList(listId) {
  return brevoRequest(`/contacts/lists/${listId}`, { method: "DELETE" });
}
function mapContact(contact) {
  return {
    ...contact,
    id: String(contact.id ?? contact.email),
    firstName: contact.attributes?.FIRSTNAME ?? contact.attributes?.NOME,
    lastName: contact.attributes?.LASTNAME ?? contact.attributes?.SOBRENOME,
    subscribed: !contact.emailBlacklisted
  };
}
async function listBrevoContacts(limit = 50, offset = 0, filters = {}) {
  const base = filters.listId ? `/contacts/lists/${filters.listId}/contacts` : "/contacts";
  const result = await brevoRequest(
    `${base}${queryString({
      limit,
      offset,
      sort: "desc",
      "filter[query]": filters.search
    })}`
  );
  return (result.contacts ?? []).map(mapContact);
}
function upsertBrevoContact(input) {
  return brevoRequest("/contacts", {
    method: "POST",
    body: JSON.stringify({
      email: input.email.toLowerCase(),
      attributes: {
        ...input.attributes ?? {},
        ...input.firstName ? { FIRSTNAME: input.firstName } : {},
        ...input.lastName ? { LASTNAME: input.lastName } : {}
      },
      listIds: input.listIds,
      unlinkListIds: input.unlinkListIds,
      updateEnabled: input.updateEnabled ?? true
    })
  });
}
function deleteBrevoContact(email) {
  return brevoRequest(`/contacts/${encodeURIComponent(email)}`, {
    method: "DELETE"
  });
}
function mapCampaign(campaign) {
  return {
    ...campaign,
    senderId: campaign.sender?.id ?? campaign.senderId,
    listIds: campaign.recipients?.lists ?? campaign.recipients?.listIds ?? campaign.listIds ?? [],
    sentAt: campaign.sentDate ?? campaign.sentAt ?? null
  };
}
async function listBrevoCampaigns(limit = 50, offset = 0) {
  const result = await brevoRequest(
    `/emailCampaigns${queryString({ limit, offset, sort: "desc" })}`
  );
  return (result.campaigns ?? []).map(mapCampaign);
}
async function getBrevoCampaign(campaignId) {
  return mapCampaign(await brevoRequest(`/emailCampaigns/${campaignId}`));
}
function campaignPayload(input, settings) {
  return {
    name: input.name,
    subject: input.subject,
    htmlContent: input.htmlContent,
    templateId: input.templateId,
    replyTo: input.replyTo,
    tag: input.tag,
    recipients: input.recipients ?? { listIds: input.listIds ?? [] },
    sender: input.senderId ? { id: input.senderId } : input.sender ?? (settings.default_sender_id ? { id: settings.default_sender_id } : {
      email: settings.default_sender_email,
      name: settings.default_sender_name
    })
  };
}
async function createBrevoCampaign(input) {
  const settings = await getActiveSettings();
  return brevoRequest(
    "/emailCampaigns",
    {
      method: "POST",
      body: JSON.stringify(campaignPayload(input, settings))
    },
    settings.apiKey
  );
}
async function updateBrevoCampaign(campaignId, input) {
  const settings = await getActiveSettings();
  return brevoRequest(
    `/emailCampaigns/${campaignId}`,
    {
      method: "PUT",
      body: JSON.stringify(campaignPayload(input, settings))
    },
    settings.apiKey
  );
}
async function recordCampaignDelivery(campaignId, status, metadata = {}, kind = "campaign") {
  const { error } = await supabase.from("brevo_email_deliveries").insert({
    kind,
    campaign_id: campaignId,
    status,
    metadata,
    sent_at: status === "sent" ? (/* @__PURE__ */ new Date()).toISOString() : null
  });
  if (error) throw new Error(error.message);
}
async function sendBrevoCampaignNow(campaignId) {
  const result = await brevoRequest(`/emailCampaigns/${campaignId}/sendNow`, {
    method: "POST"
  });
  await recordCampaignDelivery(campaignId, "sent");
  return result;
}
async function sendBrevoCampaignTest(campaignId, emails) {
  const result = await brevoRequest(`/emailCampaigns/${campaignId}/sendTest`, {
    method: "POST",
    body: JSON.stringify({ emailTo: emails })
  });
  await recordCampaignDelivery(
    campaignId,
    "test_sent",
    { recipients: emails },
    "test"
  );
  return result;
}
async function scheduleBrevoCampaign(campaignId, scheduledAt) {
  const result = await brevoRequest(`/emailCampaigns/${campaignId}/schedule`, {
    method: "POST",
    body: JSON.stringify({ scheduledAt })
  });
  await recordCampaignDelivery(campaignId, "scheduled", { scheduledAt });
  return result;
}
async function getBrevoCampaignMetrics(campaignId) {
  const campaign = await brevoRequest(`/emailCampaigns/${campaignId}`);
  const stats = campaign.statistics?.globalStats ?? campaign.statistics ?? {};
  const delivered = Number(stats.delivered ?? 0);
  const opened = Number(stats.viewed ?? stats.opened ?? 0);
  const clicked = Number(stats.clicked ?? 0);
  return {
    delivered,
    opened,
    uniqueOpens: Number(stats.uniqueViews ?? stats.uniqueOpens ?? opened),
    clicked,
    uniqueClicks: Number(stats.uniqueClicks ?? clicked),
    bounced: Number(stats.hardBounces ?? 0) + Number(stats.softBounces ?? 0),
    unsubscribed: Number(stats.unsubscriptions ?? stats.unsubscribed ?? 0),
    openRate: delivered ? opened / delivered * 100 : 0,
    clickRate: delivered ? clicked / delivered * 100 : 0
  };
}
async function sendBrevoQuickTest(input) {
  const senders = await listBrevoSenders();
  const sender = senders.find((item) => Number(item.id) === input.senderId);
  if (!sender?.email) throw new Error("Remetente Brevo n\xE3o encontrado");
  return sendBrevoTransactionalEmail(
    {
      to: [{ email: input.email }],
      sender: { email: sender.email, name: sender.name },
      subject: input.subject,
      htmlContent: input.htmlContent
    },
    "test"
  );
}
async function recordTransactionalDeliveries(params) {
  const rows = params.input.to.map((recipient) => ({
    kind: params.kind,
    message_id: params.messageId,
    recipient_email: recipient.email.toLowerCase(),
    template_id: params.input.templateId ?? null,
    subject: params.input.subject ?? null,
    status: params.input.sandbox ? "sandboxed" : "sent",
    sent_at: (/* @__PURE__ */ new Date()).toISOString(),
    metadata: { tags: params.input.tags ?? [] }
  }));
  const { error } = await supabase.from("brevo_email_deliveries").insert(rows);
  if (error) throw new Error(error.message);
}
async function sendBrevoTransactionalEmail(input, kind = "transactional", options = {}) {
  const settings = await getActiveSettings();
  let sender = input.sender;
  if (!sender && settings.default_sender_email) {
    sender = {
      email: settings.default_sender_email,
      name: settings.default_sender_name
    };
  }
  if (!sender && settings.default_sender_id) {
    const result2 = await brevoRequest("/senders", {}, settings.apiKey);
    const configured = result2.senders?.find(
      (item) => Number(item.id) === settings.default_sender_id
    );
    if (configured?.email) {
      sender = { email: configured.email, name: configured.name };
    }
  }
  if (!sender?.email) throw new Error("Remetente padr\xE3o n\xE3o configurado");
  const payload = {
    ...input,
    sandbox: void 0,
    sender,
    replyTo: input.replyTo ?? (settings.reply_to ? { email: settings.reply_to } : void 0)
  };
  const result = await brevoRequest(
    "/smtp/email",
    {
      method: "POST",
      headers: input.sandbox ? { "X-Sib-Sandbox": "drop" } : void 0,
      body: JSON.stringify(payload)
    },
    settings.apiKey
  );
  if (options.record !== false) {
    await recordTransactionalDeliveries({
      kind,
      messageId: result.messageId ?? null,
      input
    });
  }
  return result;
}
async function subscribeToNewsletter(input, context) {
  const email = input.email.trim().toLowerCase();
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const { error } = await supabase.from("marketing_subscriptions").upsert(
    {
      email,
      name: input.name?.trim() || null,
      status: "subscribed",
      source: input.source?.trim() || "newsletter",
      consent_ip: context.ip || null,
      consent_user_agent: context.userAgent || null,
      consented_at: now,
      unsubscribed_at: null,
      sync_status: "pending",
      sync_error: null,
      updated_at: now
    },
    { onConflict: "email" }
  );
  if (error) throw new Error(error.message);
  try {
    const settings = await getActiveSettings();
    const listIds = settings.default_list_id ? [settings.default_list_id] : [];
    const result = await upsertBrevoContact({
      email,
      attributes: input.name ? { NOME: input.name.trim() } : void 0,
      listIds,
      updateEnabled: true
    });
    const { error: syncedError } = await supabase.from("marketing_subscriptions").update({
      brevo_contact_id: result?.id == null ? null : String(result.id),
      brevo_list_ids: listIds,
      sync_status: "synced",
      sync_error: null,
      synced_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("email", email);
    if (syncedError) throw new Error(syncedError.message);
  } catch (syncError) {
    const message = syncError instanceof Error ? syncError.message : "Falha ao sincronizar";
    const { error: failedError } = await supabase.from("marketing_subscriptions").update({
      sync_status: "failed",
      sync_error: message.slice(0, 2e3),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("email", email);
    if (failedError) throw new Error(failedError.message);
  }
}

// server/routes/adminBrevo.ts
var router2 = Router2();
var paginationSchema = z3.object({
  limit: z3.coerce.number().int().min(1).max(500).default(50),
  offset: z3.coerce.number().int().min(0).default(0)
});
var contactsQuerySchema = paginationSchema.extend({
  search: z3.string().trim().max(320).optional(),
  listId: z3.coerce.number().int().positive().optional()
});
var idSchema = z3.coerce.number().int().positive();
router2.use(requireAdmin);
function failure(res, error, fallback) {
  const status = error instanceof BrevoApiError && error.status < 500 ? error.status : 500;
  res.status(status).json({
    error: error instanceof Error ? error.message : fallback
  });
}
function invalid(res, issues) {
  res.status(400).json({ error: "Dados inv\xE1lidos", issues });
}
router2.get("/status", async (_req, res) => {
  try {
    res.json(await getBrevoAdminStatus());
  } catch (error) {
    failure(res, error, "Erro ao carregar Brevo");
  }
});
router2.put("/settings", async (req, res) => {
  const parsed = brevoSettingsSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    res.json(await updateBrevoSettings(parsed.data));
  } catch (error) {
    failure(res, error, "Erro ao salvar Brevo");
  }
});
router2.post("/test", async (_req, res) => {
  try {
    res.json(await testBrevoCredentials());
  } catch (error) {
    failure(res, error, "Credenciais Brevo inv\xE1lidas");
  }
});
router2.post("/webhook/configure", async (_req, res) => {
  try {
    res.json(await configureBrevoWebhooks());
  } catch (error) {
    failure(res, error, "Erro ao configurar webhook");
  }
});
router2.get("/templates", async (req, res) => {
  const parsed = paginationSchema.safeParse(req.query);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    res.json(await listBrevoTemplates(parsed.data.limit, parsed.data.offset));
  } catch (error) {
    failure(res, error, "Erro ao listar templates");
  }
});
router2.get("/senders", async (_req, res) => {
  try {
    res.json(await listBrevoSenders());
  } catch (error) {
    failure(res, error, "Erro ao listar remetentes");
  }
});
router2.get("/lists", async (req, res) => {
  const parsed = paginationSchema.safeParse(req.query);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    res.json(await listBrevoLists(parsed.data.limit, parsed.data.offset));
  } catch (error) {
    failure(res, error, "Erro ao listar listas");
  }
});
router2.post("/lists", async (req, res) => {
  const parsed = brevoListCreateSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    res.status(201).json(await createBrevoList(parsed.data));
  } catch (error) {
    failure(res, error, "Erro ao criar lista");
  }
});
router2.delete("/lists/:id", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return invalid(res, id.error.issues);
  try {
    await deleteBrevoList(id.data);
    res.status(204).send();
  } catch (error) {
    failure(res, error, "Erro ao excluir lista");
  }
});
router2.get("/contacts", async (req, res) => {
  const parsed = contactsQuerySchema.safeParse(req.query);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    res.json(
      await listBrevoContacts(parsed.data.limit, parsed.data.offset, {
        search: parsed.data.search,
        listId: parsed.data.listId
      })
    );
  } catch (error) {
    failure(res, error, "Erro ao listar contatos");
  }
});
router2.post("/contacts", async (req, res) => {
  const parsed = brevoContactSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    res.status(201).json(await upsertBrevoContact(parsed.data));
  } catch (error) {
    failure(res, error, "Erro ao salvar contato");
  }
});
router2.delete("/contacts/:email", async (req, res) => {
  const parsed = z3.string().trim().min(1).max(320).safeParse(req.params.email);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    await deleteBrevoContact(parsed.data);
    res.status(204).send();
  } catch (error) {
    failure(res, error, "Erro ao excluir contato");
  }
});
router2.post("/emails/send", async (req, res) => {
  const parsed = brevoTransactionalEmailSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    res.status(201).json(await sendBrevoTransactionalEmail(parsed.data));
  } catch (error) {
    failure(res, error, "Erro ao enviar e-mail");
  }
});
router2.post("/emails/test", async (req, res) => {
  const parsed = brevoTransactionalEmailSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    res.status(201).json(
      await sendBrevoTransactionalEmail(
        { ...parsed.data, sandbox: true },
        "test"
      )
    );
  } catch (error) {
    failure(res, error, "Erro ao testar e-mail");
  }
});
router2.get("/campaigns", async (req, res) => {
  const parsed = paginationSchema.safeParse(req.query);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    res.json(await listBrevoCampaigns(parsed.data.limit, parsed.data.offset));
  } catch (error) {
    failure(res, error, "Erro ao listar campanhas");
  }
});
router2.get("/campaigns/:id", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return invalid(res, id.error.issues);
  try {
    res.json(await getBrevoCampaign(id.data));
  } catch (error) {
    failure(res, error, "Erro ao carregar campanha");
  }
});
router2.post("/campaigns", async (req, res) => {
  const parsed = brevoCampaignSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    res.status(201).json(await createBrevoCampaign(parsed.data));
  } catch (error) {
    failure(res, error, "Erro ao criar campanha");
  }
});
router2.put("/campaigns/:id", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  const body = brevoCampaignSchema.safeParse(req.body);
  if (!id.success || !body.success) {
    return invalid(res, [
      ...!id.success ? id.error.issues : [],
      ...!body.success ? body.error.issues : []
    ]);
  }
  try {
    res.json(await updateBrevoCampaign(id.data, body.data));
  } catch (error) {
    failure(res, error, "Erro ao atualizar campanha");
  }
});
router2.post("/campaigns/:id/send-test", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  const body = brevoCampaignTestSchema.safeParse(req.body);
  if (!id.success || !body.success) {
    return invalid(res, [
      ...!id.success ? id.error.issues : [],
      ...!body.success ? body.error.issues : []
    ]);
  }
  try {
    res.json(await sendBrevoCampaignTest(id.data, body.data.emails));
  } catch (error) {
    failure(res, error, "Erro ao testar campanha");
  }
});
router2.post("/campaigns/:id/send-now", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return invalid(res, id.error.issues);
  try {
    res.json(await sendBrevoCampaignNow(id.data));
  } catch (error) {
    failure(res, error, "Erro ao enviar campanha");
  }
});
router2.post("/campaigns/:id/send", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return invalid(res, id.error.issues);
  try {
    res.json(await sendBrevoCampaignNow(id.data));
  } catch (error) {
    failure(res, error, "Erro ao enviar campanha");
  }
});
router2.post("/campaigns/test", async (req, res) => {
  const parsed = brevoQuickTestSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    await sendBrevoQuickTest(parsed.data);
    res.status(201).json({ success: true });
  } catch (error) {
    failure(res, error, "Erro ao enviar teste");
  }
});
router2.post("/campaigns/:id/schedule", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  const body = brevoCampaignScheduleSchema.safeParse(req.body);
  if (!id.success || !body.success) {
    return invalid(res, [
      ...!id.success ? id.error.issues : [],
      ...!body.success ? body.error.issues : []
    ]);
  }
  try {
    res.json(await scheduleBrevoCampaign(id.data, body.data.scheduledAt));
  } catch (error) {
    failure(res, error, "Erro ao agendar campanha");
  }
});
router2.get("/campaigns/:id/metrics", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return invalid(res, id.error.issues);
  try {
    res.json(await getBrevoCampaignMetrics(id.data));
  } catch (error) {
    failure(res, error, "Erro ao carregar m\xE9tricas");
  }
});
var adminBrevo_default = router2;

// server/routes/adminCustomers.ts
import { Router as Router3 } from "express";

// shared/const/order.ts
var VISIBLE_ORDER_FILTER = "and(mercado_pago_order_id.not.is.null,payment_status.neq.rejected),status.eq.paid";

// shared/lib/orderMapper.ts
function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  return 0;
}
function mapOrderItemRowToOrderItem(row) {
  return {
    id: row.id,
    orderId: row.order_id,
    productSlug: row.product_slug,
    name: row.name,
    quantity: row.quantity,
    price: toNumber(row.price),
    size: row.size,
    color: row.color,
    image: row.image
  };
}
function mapOrderRowToOrder(row, items) {
  return {
    id: row.id,
    customerId: row.customer_id,
    status: row.status,
    totalAmount: toNumber(row.total_amount),
    shippingAmount: toNumber(row.shipping_amount),
    shippingQuoteId: row.shipping_quote_id ?? null,
    shippingServiceId: row.shipping_service_id ?? null,
    shippingServiceName: row.shipping_service_name ?? null,
    shippingCompany: row.shipping_company ?? null,
    shippingDeliveryDays: row.shipping_delivery_days == null ? null : Number(row.shipping_delivery_days),
    shippingEnvironment: row.shipping_environment ?? null,
    shippingRecipient: row.shipping_recipient ?? null,
    couponCode: row.coupon_code,
    shippingAddress: row.shipping_address,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status ?? "pending",
    paymentStatusDetail: row.payment_status_detail ?? null,
    paymentExpiresAt: row.payment_expires_at ?? null,
    paidAt: row.paid_at ?? null,
    paymentInstructions: row.payment_instructions ?? null,
    fulfillmentStatus: row.fulfillment_status ?? "unfulfilled",
    trackingCode: row.tracking_code ?? null,
    trackingUrl: row.tracking_url ?? null,
    processingAt: row.processing_at ?? null,
    shippedAt: row.shipped_at ?? null,
    deliveredAt: row.delivered_at ?? null,
    items,
    createdAt: row.created_at
  };
}
function mapOrderRowToSummary(row, itemCount) {
  return {
    id: row.id,
    status: row.status,
    totalAmount: toNumber(row.total_amount),
    shippingAmount: toNumber(row.shipping_amount),
    couponCode: row.coupon_code,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status ?? "pending",
    fulfillmentStatus: row.fulfillment_status ?? "unfulfilled",
    itemCount,
    createdAt: row.created_at
  };
}
function mapCartItemToOrderItemPayload(item) {
  return {
    product_slug: item.product_slug,
    name: item.product_name,
    quantity: item.quantity,
    price: toNumber(item.unit_price),
    size: item.size_label,
    color: item.color_name || null,
    image: item.product_image
  };
}

// shared/lib/addressMapper.ts
function mapCustomerAddressRowToCustomerAddress(row) {
  return {
    id: row.id,
    customerId: row.customer_id,
    label: row.label,
    cep: row.cep,
    rua: row.rua,
    numero: row.numero,
    complemento: row.complemento,
    bairro: row.bairro,
    cidade: row.cidade,
    estado: row.estado,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function mapCustomerAddressToRow(customerId, input) {
  return {
    customer_id: customerId,
    label: input.label,
    cep: input.cep,
    rua: input.rua,
    numero: input.numero,
    complemento: input.complemento ?? null,
    bairro: input.bairro,
    cidade: input.cidade,
    estado: input.estado,
    is_default: input.isDefault ?? false
  };
}

// server/services/addresses.ts
async function clearDefaultAddress(customerId, exceptId) {
  let query = supabase.from("customer_addresses").update({ is_default: false }).eq("customer_id", customerId).eq("is_default", true);
  if (exceptId) {
    query = query.neq("id", exceptId);
  }
  const { error } = await query;
  if (error) throw new Error(error.message);
}
async function listCustomerAddresses(customerId) {
  const { data, error } = await supabase.from("customer_addresses").select("*").eq("customer_id", customerId).order("is_default", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapCustomerAddressRowToCustomerAddress(row));
}
async function createCustomerAddress(customerId, input) {
  if (input.isDefault) {
    await clearDefaultAddress(customerId);
  }
  const { data: existing } = await supabase.from("customer_addresses").select("id").eq("customer_id", customerId).limit(1);
  const shouldBeDefault = input.isDefault || !existing?.length;
  const { data, error } = await supabase.from("customer_addresses").insert(mapCustomerAddressToRow(customerId, { ...input, isDefault: shouldBeDefault })).select("*").single();
  if (error) throw new Error(error.message);
  return mapCustomerAddressRowToCustomerAddress(data);
}
async function updateCustomerAddress(customerId, addressId, input) {
  const { data: current, error: fetchError } = await supabase.from("customer_addresses").select("*").eq("id", addressId).eq("customer_id", customerId).maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!current) throw new Error("Endere\xE7o n\xE3o encontrado");
  if (input.isDefault) {
    await clearDefaultAddress(customerId, addressId);
  }
  const payload = {};
  if (input.label !== void 0) payload.label = input.label;
  if (input.cep !== void 0) payload.cep = input.cep;
  if (input.rua !== void 0) payload.rua = input.rua;
  if (input.numero !== void 0) payload.numero = input.numero;
  if (input.complemento !== void 0) payload.complemento = input.complemento ?? null;
  if (input.bairro !== void 0) payload.bairro = input.bairro;
  if (input.cidade !== void 0) payload.cidade = input.cidade;
  if (input.estado !== void 0) payload.estado = input.estado;
  if (input.isDefault !== void 0) payload.is_default = input.isDefault;
  const { data, error } = await supabase.from("customer_addresses").update(payload).eq("id", addressId).eq("customer_id", customerId).select("*").single();
  if (error) throw new Error(error.message);
  return mapCustomerAddressRowToCustomerAddress(data);
}
async function deleteCustomerAddress(customerId, addressId) {
  const { data: current, error: fetchError } = await supabase.from("customer_addresses").select("*").eq("id", addressId).eq("customer_id", customerId).maybeSingle();
  if (fetchError) throw new Error(fetchError.message);
  if (!current) throw new Error("Endere\xE7o n\xE3o encontrado");
  const { error } = await supabase.from("customer_addresses").delete().eq("id", addressId).eq("customer_id", customerId);
  if (error) throw new Error(error.message);
  if (current.is_default) {
    const { data: nextDefault } = await supabase.from("customer_addresses").select("id").eq("customer_id", customerId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (nextDefault?.id) {
      await supabase.from("customer_addresses").update({ is_default: true }).eq("id", nextDefault.id);
    }
  }
}
async function setDefaultCustomerAddress(customerId, addressId) {
  return updateCustomerAddress(customerId, addressId, { isDefault: true });
}

// server/services/adminCustomers.ts
async function fetchAllProfiles() {
  const { data, error } = await supabase.from("customer_profiles").select("*").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
async function fetchAuthUsersByIds(ids) {
  const users = /* @__PURE__ */ new Map();
  if (!ids.length) return users;
  await Promise.all(
    ids.map(async (id) => {
      const { data } = await supabase.auth.admin.getUserById(id);
      if (data?.user) {
        users.set(id, {
          email: data.user.email ?? "",
          emailVerified: Boolean(data.user.email_confirmed_at)
        });
      }
    })
  );
  return users;
}
async function fetchOrderStatsByCustomer() {
  const stats = /* @__PURE__ */ new Map();
  const { data, error } = await supabase.from("orders").select("customer_id, total_amount, status").or(VISIBLE_ORDER_FILTER).not("customer_id", "is", null);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    if (!row.customer_id || row.status === "canceled") continue;
    const current = stats.get(row.customer_id) ?? {
      orderCount: 0,
      totalSpent: 0
    };
    current.orderCount += 1;
    current.totalSpent += Number(row.total_amount);
    stats.set(row.customer_id, current);
  }
  return stats;
}
async function listAllCustomers() {
  const [profiles, orderStats] = await Promise.all([
    fetchAllProfiles(),
    fetchOrderStatsByCustomer()
  ]);
  const authUsers = await fetchAuthUsersByIds(
    profiles.map((profile) => String(profile.id))
  );
  return profiles.map((profile) => {
    const id = String(profile.id);
    const authUser = authUsers.get(id);
    const stats = orderStats.get(id) ?? { orderCount: 0, totalSpent: 0 };
    return {
      id,
      fullName: String(profile.full_name ?? ""),
      email: authUser?.email ?? "",
      phone: profile.phone == null ? null : String(profile.phone),
      emailVerified: authUser?.emailVerified ?? false,
      orderCount: stats.orderCount,
      totalSpent: stats.totalSpent,
      createdAt: String(profile.created_at)
    };
  });
}
async function getCustomerById(customerId) {
  const { data: profile, error } = await supabase.from("customer_profiles").select("*").eq("id", customerId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!profile) throw new Error("Cliente n\xE3o encontrado");
  const [{ data: authData }, addresses, orders, orderStats] = await Promise.all(
    [
      supabase.auth.admin.getUserById(customerId),
      listCustomerAddresses(customerId),
      listCustomerOrdersForAdmin(customerId),
      fetchOrderStatsByCustomer()
    ]
  );
  const stats = orderStats.get(customerId) ?? { orderCount: 0, totalSpent: 0 };
  return {
    id: customerId,
    fullName: String(profile.full_name ?? ""),
    phone: profile.phone == null ? null : String(profile.phone),
    email: authData?.user?.email ?? "",
    emailVerified: Boolean(authData?.user?.email_confirmed_at),
    createdAt: String(profile.created_at),
    updatedAt: String(profile.updated_at),
    orderCount: stats.orderCount,
    totalSpent: stats.totalSpent,
    addresses,
    orders
  };
}
async function listCustomerOrdersForAdmin(customerId) {
  const { data: orderRows, error } = await supabase.from("orders").select("*").eq("customer_id", customerId).or(VISIBLE_ORDER_FILTER).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!orderRows?.length) return [];
  const orderIds = orderRows.map((row) => row.id);
  const { data: itemRows, error: itemsError } = await supabase.from("order_items").select("order_id, quantity").in("order_id", orderIds);
  if (itemsError) throw new Error(itemsError.message);
  const countMap = /* @__PURE__ */ new Map();
  for (const item of itemRows ?? []) {
    const current = countMap.get(item.order_id) ?? 0;
    countMap.set(item.order_id, current + Number(item.quantity));
  }
  return orderRows.map(
    (row) => mapOrderRowToSummary(row, countMap.get(row.id) ?? 0)
  );
}

// server/routes/adminCustomers.ts
var router3 = Router3();
router3.get("/", requireAdmin, async (_req, res) => {
  try {
    const customers = await listAllCustomers();
    res.json(customers);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar clientes"
    });
  }
});
router3.get("/:id", requireAdmin, async (req, res) => {
  try {
    const customer = await getCustomerById(req.params.id);
    res.json(customer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar cliente";
    const status = message.includes("n\xE3o encontrado") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});
var adminCustomers_default = router3;

// server/routes/adminDashboard.ts
import { Router as Router4 } from "express";

// shared/const/analytics.ts
var VISITOR_SESSION_COOKIE = "nativa_visitor_session";
var VISITOR_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1e3;
var ABANDONED_CART_HOURS = 24;

// shared/lib/orderLabels.ts
var ORDER_STATUS_LABELS = {
  pending: "Pendente",
  paid: "Confirmado",
  canceled: "Cancelado"
};
var PAYMENT_METHOD_LABELS = {
  pix: "Pix",
  credit_card: "Cart\xE3o de cr\xE9dito",
  boleto: "Boleto"
};
var PAYMENT_STATUS_LABELS = {
  pending: "Aguardando pagamento",
  processing: "Em processamento",
  approved: "Pagamento aprovado",
  rejected: "Pagamento recusado",
  canceled: "Pagamento cancelado",
  expired: "Pagamento expirado",
  refunded: "Pagamento reembolsado"
};
function formatOrderShortId(orderId) {
  return orderId.slice(0, 8).toUpperCase();
}

// server/services/adminDashboard.ts
var MS_DAY = 24 * 60 * 60 * 1e3;
function periodToDays(period) {
  if (period === "7d") return 7;
  if (period === "30d") return 30;
  if (period === "90d") return 90;
  return null;
}
function startDateForPeriod(period) {
  const days = periodToDays(period);
  if (days === null) return null;
  return new Date(Date.now() - days * MS_DAY);
}
function previousStartDateForPeriod(period) {
  const days = periodToDays(period);
  if (days === null) return null;
  return new Date(Date.now() - days * 2 * MS_DAY);
}
function pctChange(current, previous) {
  if (previous === 0) return current > 0 ? 100 : null;
  return Math.round((current - previous) / previous * 1e3) / 10;
}
function toDateKey(iso) {
  return iso.slice(0, 10);
}
function buildDateRange(start, end) {
  const keys = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  while (cursor <= endDay) {
    keys.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}
function inRange(iso, start, end) {
  const time = new Date(iso).getTime();
  if (start && time < start.getTime()) return false;
  if (end && time >= end.getTime()) return false;
  return true;
}
async function fetchOrdersRows() {
  const { data, error } = await supabase.from("orders").select("id, customer_id, status, total_amount, payment_method, created_at").or(VISIBLE_ORDER_FILTER).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}
async function fetchCustomerProfiles() {
  const { data, error } = await supabase.from("customer_profiles").select("id, full_name, created_at");
  if (error) throw new Error(error.message);
  return data ?? [];
}
async function fetchPageViews() {
  const { data, error } = await supabase.from("store_page_views").select("session_id, path, created_at").order("created_at", { ascending: false });
  if (error) {
    if (error.message.includes("store_page_views")) return [];
    throw new Error(error.message);
  }
  return data ?? [];
}
async function fetchAbandonedCarts() {
  const staleBefore = new Date(
    Date.now() - ABANDONED_CART_HOURS * 60 * 60 * 1e3
  ).toISOString();
  const { data: carts, error } = await supabase.from("carts").select("id, updated_at").eq("status", "active").lt("updated_at", staleBefore);
  if (error) throw new Error(error.message);
  if (!carts?.length) return { count: 0, value: 0 };
  const cartIds = carts.map((c) => c.id);
  const { data: items, error: itemsError } = await supabase.from("cart_items").select("cart_id, quantity, unit_price").in("cart_id", cartIds);
  if (itemsError) throw new Error(itemsError.message);
  const valueByCart = /* @__PURE__ */ new Map();
  for (const item of items ?? []) {
    const current = valueByCart.get(item.cart_id) ?? 0;
    valueByCart.set(
      item.cart_id,
      current + Number(item.quantity) * Number(item.unit_price)
    );
  }
  let count = 0;
  let value = 0;
  for (const cart of carts) {
    const cartValue = valueByCart.get(cart.id) ?? 0;
    if (cartValue <= 0) continue;
    count += 1;
    value += cartValue;
  }
  return { count, value };
}
async function fetchCartConversion() {
  const { data, error } = await supabase.from("carts").select("status");
  if (error) throw new Error(error.message);
  const converted = (data ?? []).filter((c) => c.status === "converted").length;
  const { count: abandoned } = await fetchAbandonedCarts();
  const denominator = converted + abandoned;
  const rate = denominator === 0 ? 0 : Math.round(converted / denominator * 1e3) / 10;
  return rate;
}
async function fetchTopProducts(start) {
  const { data: orders, error } = await supabase.from("orders").select("id, status, created_at").eq("status", "paid");
  if (error) throw new Error(error.message);
  const orderIds = (orders ?? []).filter((o) => inRange(o.created_at, start)).map((o) => o.id);
  if (!orderIds.length) return [];
  const { data: items, error: itemsError } = await supabase.from("order_items").select("product_slug, name, quantity, price").in("order_id", orderIds);
  if (itemsError) throw new Error(itemsError.message);
  const map = /* @__PURE__ */ new Map();
  for (const item of items ?? []) {
    const key = item.product_slug;
    const current = map.get(key) ?? {
      slug: item.product_slug,
      name: item.name,
      units: 0,
      revenue: 0
    };
    current.units += Number(item.quantity);
    current.revenue += Number(item.quantity) * Number(item.price);
    map.set(key, current);
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
}
async function fetchProductStockCounts() {
  const { data, error } = await supabase.from("products").select("in_stock, stock_count");
  if (error) throw new Error(error.message);
  let inStock = 0;
  let outOfStock = 0;
  for (const row of data ?? []) {
    if (row.in_stock && Number(row.stock_count) > 0) inStock += 1;
    else outOfStock += 1;
  }
  return { inStock, outOfStock };
}
function computeOverview(period, orders, customers, pageViews, abandoned, cartConversionRate, stock) {
  const start = startDateForPeriod(period);
  const prevStart = previousStartDateForPeriod(period);
  const prevEnd = start;
  const paidInPeriod = orders.filter(
    (o) => o.status === "paid" && inRange(o.created_at, start)
  );
  const paidPrevPeriod = orders.filter(
    (o) => o.status === "paid" && inRange(o.created_at, prevStart, prevEnd)
  );
  const revenue = paidInPeriod.reduce((s, o) => s + Number(o.total_amount), 0);
  const revenuePrev = paidPrevPeriod.reduce(
    (s, o) => s + Number(o.total_amount),
    0
  );
  const ordersCount = paidInPeriod.length;
  const ordersPrev = paidPrevPeriod.length;
  const viewsInPeriod = pageViews.filter((v) => inRange(v.created_at, start));
  const viewsPrevPeriod = pageViews.filter(
    (v) => inRange(v.created_at, prevStart, prevEnd)
  );
  const uniqueSessions = new Set(viewsInPeriod.map((v) => v.session_id)).size;
  const uniqueSessionsPrev = new Set(viewsPrevPeriod.map((v) => v.session_id)).size;
  const newCustomers = customers.filter(
    (c) => inRange(c.created_at, start)
  ).length;
  const newCustomersPrev = customers.filter(
    (c) => inRange(c.created_at, prevStart, prevEnd)
  ).length;
  return {
    revenue,
    revenueChange: prevStart ? pctChange(revenue, revenuePrev) : null,
    orders: ordersCount,
    ordersChange: prevStart ? pctChange(ordersCount, ordersPrev) : null,
    averageOrderValue: ordersCount === 0 ? 0 : revenue / ordersCount,
    visits: uniqueSessions,
    visitsChange: prevStart ? pctChange(uniqueSessions, uniqueSessionsPrev) : null,
    pageViews: viewsInPeriod.length,
    newCustomers,
    newCustomersChange: prevStart ? pctChange(newCustomers, newCustomersPrev) : null,
    abandonedCarts: abandoned.count,
    abandonedCartsValue: abandoned.value,
    cartConversionRate,
    productsInStock: stock.inStock,
    productsOutOfStock: stock.outOfStock
  };
}
function buildTimeSeries(period, orders, pageViews) {
  const days = periodToDays(period) ?? 30;
  const end = /* @__PURE__ */ new Date();
  const start = startDateForPeriod(period) ?? new Date(Date.now() - days * MS_DAY);
  const keys = buildDateRange(start, end);
  const revenueByDay = /* @__PURE__ */ new Map();
  const ordersByDay = /* @__PURE__ */ new Map();
  const visitsByDay = /* @__PURE__ */ new Map();
  const pageViewsByDay = /* @__PURE__ */ new Map();
  for (const key of keys) {
    revenueByDay.set(key, 0);
    ordersByDay.set(key, 0);
    visitsByDay.set(key, /* @__PURE__ */ new Set());
    pageViewsByDay.set(key, 0);
  }
  for (const order of orders) {
    if (order.status !== "paid") continue;
    const key = toDateKey(order.created_at);
    if (!revenueByDay.has(key)) continue;
    revenueByDay.set(
      key,
      (revenueByDay.get(key) ?? 0) + Number(order.total_amount)
    );
    ordersByDay.set(key, (ordersByDay.get(key) ?? 0) + 1);
  }
  for (const view of pageViews) {
    const key = toDateKey(view.created_at);
    if (!visitsByDay.has(key)) continue;
    visitsByDay.get(key).add(view.session_id);
    pageViewsByDay.set(key, (pageViewsByDay.get(key) ?? 0) + 1);
  }
  return keys.map((date) => ({
    date,
    revenue: revenueByDay.get(date) ?? 0,
    orders: ordersByDay.get(date) ?? 0,
    visits: visitsByDay.get(date)?.size ?? 0,
    pageViews: pageViewsByDay.get(date) ?? 0
  }));
}
function buildStatusSlices(period, orders) {
  const start = startDateForPeriod(period);
  const filtered = orders.filter((o) => inRange(o.created_at, start));
  const counts = /* @__PURE__ */ new Map();
  for (const order of filtered) {
    const status = order.status;
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }
  return ["paid", "pending", "canceled"].map((status) => ({
    status,
    label: ORDER_STATUS_LABELS[status],
    count: counts.get(status) ?? 0
  }));
}
function buildPaymentSlices(period, orders) {
  const start = startDateForPeriod(period);
  const filtered = orders.filter(
    (o) => o.status === "paid" && inRange(o.created_at, start)
  );
  const map = /* @__PURE__ */ new Map();
  for (const order of filtered) {
    const method = order.payment_method;
    const current = map.get(method) ?? { count: 0, revenue: 0 };
    current.count += 1;
    current.revenue += Number(order.total_amount);
    map.set(method, current);
  }
  return ["pix", "credit_card", "boleto"].map((method) => ({
    method,
    label: PAYMENT_METHOD_LABELS[method],
    count: map.get(method)?.count ?? 0,
    revenue: map.get(method)?.revenue ?? 0
  }));
}
async function buildRecentOrders(orders, customers) {
  const nameMap = new Map(
    customers.map((c) => [c.id, String(c.full_name ?? "")])
  );
  return orders.slice(0, 6).map((order) => ({
    id: order.id,
    customerName: order.customer_id ? nameMap.get(order.customer_id) || null : null,
    totalAmount: Number(order.total_amount),
    status: order.status,
    createdAt: order.created_at
  }));
}
async function getDashboardStats(period) {
  const [
    orders,
    customers,
    pageViews,
    abandoned,
    cartConversionRate,
    stock,
    topProducts
  ] = await Promise.all([
    fetchOrdersRows(),
    fetchCustomerProfiles(),
    fetchPageViews(),
    fetchAbandonedCarts(),
    fetchCartConversion(),
    fetchProductStockCounts(),
    fetchTopProducts(startDateForPeriod(period))
  ]);
  return {
    period,
    overview: computeOverview(
      period,
      orders,
      customers,
      pageViews,
      abandoned,
      cartConversionRate,
      stock
    ),
    timeSeries: buildTimeSeries(period, orders, pageViews),
    ordersByStatus: buildStatusSlices(period, orders),
    paymentMethods: buildPaymentSlices(period, orders),
    topProducts,
    recentOrders: await buildRecentOrders(orders, customers)
  };
}

// server/routes/adminDashboard.ts
var router4 = Router4();
var VALID_PERIODS = /* @__PURE__ */ new Set(["7d", "30d", "90d", "all"]);
router4.get("/", requireAdmin, async (req, res) => {
  try {
    const raw = typeof req.query.period === "string" ? req.query.period : "30d";
    const period = VALID_PERIODS.has(raw) ? raw : "30d";
    const stats = await getDashboardStats(period);
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar dashboard"
    });
  }
});
var adminDashboard_default = router4;

// shared/schemas/melhorEnvio.ts
import { z as z4 } from "zod";
var melhorEnvioEnvironmentSchema = z4.enum(["production", "sandbox"]);
var postalCodeSchema = z4.string().transform((v) => v.replace(/\D/g, "")).refine((v) => v === "" || v.length === 8, "CEP deve ter 8 d\xEDgitos");
var melhorEnvioSettingsSchema = z4.object({
  environment: melhorEnvioEnvironmentSchema.optional(),
  redirectUri: z4.union([z4.literal(""), z4.string().url("Informe uma URL v\xE1lida")]).optional(),
  userAgent: z4.string().min(5, "Informe o User-Agent (ex: Nativa Store (email@dominio.com))").optional(),
  originPostalCode: postalCodeSchema.optional(),
  defaultWidthCm: z4.number().positive("Largura deve ser positiva").max(200).optional(),
  defaultHeightCm: z4.number().positive("Altura deve ser positiva").max(200).optional(),
  defaultLengthCm: z4.number().positive("Comprimento deve ser positivo").max(200).optional(),
  defaultWeightKg: z4.number().positive("Peso deve ser positivo").max(100).optional(),
  freeShippingEnabled: z4.boolean().optional(),
  freeShippingThreshold: z4.number().positive("O valor m\xEDnimo deve ser maior que zero").max(1e5).optional(),
  senderName: z4.string().max(120).optional(),
  senderEmail: z4.union([z4.literal(""), z4.string().email("E-mail inv\xE1lido")]).optional(),
  senderPhone: z4.string().max(20).optional(),
  senderDocumentType: z4.enum(["cpf", "cnpj"]).optional(),
  senderDocument: z4.string().max(18).optional(),
  senderStateRegister: z4.string().max(30).optional(),
  senderAddress: z4.string().max(160).optional(),
  senderNumber: z4.string().max(20).optional(),
  senderComplement: z4.string().max(80).optional(),
  senderDistrict: z4.string().max(80).optional(),
  senderCity: z4.string().max(80).optional(),
  senderStateAbbr: z4.string().max(2).optional(),
  clientId: z4.string().optional(),
  clientSecret: z4.string().optional()
});
var shippingQuoteProductSchema = z4.object({
  id: z4.string().min(1),
  width: z4.number().positive().optional(),
  height: z4.number().positive().optional(),
  length: z4.number().positive().optional(),
  weight: z4.number().positive().optional(),
  insuranceValue: z4.number().nonnegative(),
  quantity: z4.number().int().positive().default(1)
});
var shippingQuoteSchema = z4.object({
  toPostalCode: postalCodeSchema.refine((v) => v.length === 8, "CEP de destino inv\xE1lido"),
  products: z4.array(shippingQuoteProductSchema).min(1, "Informe ao menos um produto"),
  services: z4.string().optional(),
  receipt: z4.boolean().optional(),
  ownHand: z4.boolean().optional()
});
var checkoutShippingQuoteSchema = z4.object({
  toPostalCode: postalCodeSchema.refine((v) => v.length === 8, "CEP de destino inv\xE1lido")
});

// server/routes/adminMelhorEnvio.ts
import { Router as Router5 } from "express";

// shared/const/cart.ts
var FREE_SHIPPING_THRESHOLD = 299;
var CART_SESSION_COOKIE = "nativa_cart_session";
var CART_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1e3;
var CART_STATUS_ACTIVE = "active";

// shared/lib/shipping.ts
function applyFreeShipping(options, subtotal, enabled = true, threshold = FREE_SHIPPING_THRESHOLD) {
  const sorted = options.map((option) => ({ ...option, packages: [...option.packages] }));
  if (!enabled || subtotal < threshold || sorted.length === 0) {
    return { options: sorted, applied: false };
  }
  sorted[0] = { ...sorted[0], price: 0, customPrice: 0 };
  return { options: sorted, applied: true };
}
function groupShipmentVolumes(company, volumes) {
  return /(correios|j&t|loggi)/i.test(company) ? volumes.map((volume) => [volume]) : [volumes];
}

// server/services/melhorEnvio.ts
import jwt2 from "jsonwebtoken";
var SETTINGS_ID = "default";
var MELHOR_ENVIO_SCOPES = [
  "cart-read",
  "cart-write",
  "companies-read",
  "companies-write",
  "coupons-read",
  "coupons-write",
  "notifications-read",
  "orders-read",
  "products-read",
  "products-write",
  "purchases-read",
  "shipping-calculate",
  "shipping-cancel",
  "shipping-checkout",
  "shipping-companies",
  "shipping-generate",
  "shipping-preview",
  "shipping-print",
  "shipping-share",
  "shipping-tracking",
  "ecommerce-shipping",
  "transactions-read",
  "users-read",
  "users-write"
].join(" ");
function getJwtSecret2() {
  const secret = process.env.ADMIN_JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("Configure ADMIN_JWT_SECRET no arquivo .env");
  }
  return secret;
}
function getMelhorEnvioBaseUrl(environment) {
  return environment === "sandbox" ? "https://sandbox.melhorenvio.com.br" : "https://melhorenvio.com.br";
}
function resolvePublicAppUrl() {
  const fromEnv = process.env.APP_URL?.trim() || process.env.VITE_APP_URL?.trim() || process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (fromEnv) {
    const withProtocol = fromEnv.startsWith("http") ? fromEnv : `https://${fromEnv}`;
    return withProtocol.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}
function getDefaultRedirectUri() {
  return `${resolvePublicAppUrl()}/api/admin/melhor-envio/callback`;
}
function envPrefix(environment) {
  return environment === "sandbox" ? "sandbox" : "production";
}
function getClientId(row, environment = row.environment) {
  return environment === "sandbox" ? row.sandbox_client_id : row.production_client_id;
}
function getClientSecret(row, environment = row.environment) {
  return environment === "sandbox" ? row.sandbox_client_secret : row.production_client_secret;
}
function getAccessToken(row, environment = row.environment) {
  return environment === "sandbox" ? row.sandbox_access_token : row.production_access_token;
}
function getRefreshToken(row, environment = row.environment) {
  return environment === "sandbox" ? row.sandbox_refresh_token : row.production_refresh_token;
}
function getTokenExpiresAt(row, environment = row.environment) {
  return environment === "sandbox" ? row.sandbox_token_expires_at : row.production_token_expires_at;
}
function isConnected(row, environment = row.environment) {
  return Boolean(getAccessToken(row, environment) && getRefreshToken(row, environment));
}
function isConfigured(row, environment) {
  return Boolean(getClientId(row, environment).trim() && getClientSecret(row, environment).trim());
}
function toStatus(row) {
  const env = row.environment;
  return {
    environment: env,
    redirectUri: row.redirect_uri || getDefaultRedirectUri(),
    userAgent: row.user_agent,
    originPostalCode: row.origin_postal_code,
    defaultWidthCm: Number(row.default_width_cm),
    defaultHeightCm: Number(row.default_height_cm),
    defaultLengthCm: Number(row.default_length_cm),
    defaultWeightKg: Number(row.default_weight_kg),
    freeShippingEnabled: row.free_shipping_enabled ?? true,
    freeShippingThreshold: Number(row.free_shipping_threshold ?? 299),
    senderName: row.sender_name ?? "",
    senderEmail: row.sender_email ?? "",
    senderPhone: row.sender_phone ?? "",
    senderDocumentType: row.sender_document_type ?? "cpf",
    senderDocument: row.sender_document ?? "",
    senderStateRegister: row.sender_state_register ?? "ISENTO",
    senderAddress: row.sender_address ?? "",
    senderNumber: row.sender_number ?? "",
    senderComplement: row.sender_complement ?? "",
    senderDistrict: row.sender_district ?? "",
    senderCity: row.sender_city ?? "",
    senderStateAbbr: row.sender_state_abbr ?? "",
    clientId: getClientId(row, env),
    hasClientSecret: Boolean(getClientSecret(row, env).trim()),
    connected: isConnected(row, env),
    tokenExpiresAt: getTokenExpiresAt(row, env),
    productionConfigured: isConfigured(row, "production"),
    sandboxConfigured: isConfigured(row, "sandbox"),
    productionConnected: isConnected(row, "production"),
    sandboxConnected: isConnected(row, "sandbox")
  };
}
async function getMelhorEnvioSettings() {
  const { data, error } = await supabase.from("melhor_envio_settings").select("*").eq("id", SETTINGS_ID).maybeSingle();
  if (error) {
    throw new Error(`Erro ao carregar Melhor Envio: ${error.message}`);
  }
  if (!data) {
    const { data: inserted, error: insertError } = await supabase.from("melhor_envio_settings").insert({ id: SETTINGS_ID, redirect_uri: getDefaultRedirectUri() }).select("*").single();
    if (insertError) {
      throw new Error(
        `Tabela melhor_envio_settings n\xE3o encontrada. Execute supabase/melhor_envio.sql no Supabase. (${insertError.message})`
      );
    }
    return inserted;
  }
  return data;
}
async function getMelhorEnvioStatus() {
  const row = await getMelhorEnvioSettings();
  return toStatus(row);
}
async function getPublicShippingConfig() {
  const row = await getMelhorEnvioSettings();
  return {
    freeShippingEnabled: row.free_shipping_enabled ?? true,
    freeShippingThreshold: Number(row.free_shipping_threshold ?? 299)
  };
}
async function updateMelhorEnvioSettings(input) {
  const row = await getMelhorEnvioSettings();
  const targetEnv = input.environment ?? row.environment;
  const prefix = envPrefix(targetEnv);
  const patch = {
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (input.environment) {
    patch.environment = input.environment;
  }
  if (input.redirectUri !== void 0) {
    patch.redirect_uri = input.redirectUri.trim();
  }
  if (input.userAgent !== void 0) {
    patch.user_agent = input.userAgent.trim();
  }
  if (input.originPostalCode !== void 0) {
    patch.origin_postal_code = input.originPostalCode.replace(/\D/g, "");
  }
  if (input.defaultWidthCm !== void 0) patch.default_width_cm = input.defaultWidthCm;
  if (input.defaultHeightCm !== void 0) patch.default_height_cm = input.defaultHeightCm;
  if (input.defaultLengthCm !== void 0) patch.default_length_cm = input.defaultLengthCm;
  if (input.defaultWeightKg !== void 0) patch.default_weight_kg = input.defaultWeightKg;
  if (input.freeShippingEnabled !== void 0) {
    patch.free_shipping_enabled = input.freeShippingEnabled;
  }
  if (input.freeShippingThreshold !== void 0) {
    patch.free_shipping_threshold = input.freeShippingThreshold;
  }
  if (input.senderName !== void 0) patch.sender_name = input.senderName.trim();
  if (input.senderEmail !== void 0) patch.sender_email = input.senderEmail.trim();
  if (input.senderPhone !== void 0) patch.sender_phone = input.senderPhone.replace(/\D/g, "");
  if (input.senderDocumentType !== void 0) patch.sender_document_type = input.senderDocumentType;
  if (input.senderDocument !== void 0) patch.sender_document = input.senderDocument.replace(/\D/g, "");
  if (input.senderStateRegister !== void 0) patch.sender_state_register = input.senderStateRegister.trim();
  if (input.senderAddress !== void 0) patch.sender_address = input.senderAddress.trim();
  if (input.senderNumber !== void 0) patch.sender_number = input.senderNumber.trim();
  if (input.senderComplement !== void 0) patch.sender_complement = input.senderComplement.trim();
  if (input.senderDistrict !== void 0) patch.sender_district = input.senderDistrict.trim();
  if (input.senderCity !== void 0) patch.sender_city = input.senderCity.trim();
  if (input.senderStateAbbr !== void 0) patch.sender_state_abbr = input.senderStateAbbr.trim().toUpperCase();
  if (input.clientId !== void 0) {
    patch[`${prefix}_client_id`] = input.clientId.trim();
  }
  if (input.clientSecret !== void 0 && input.clientSecret.trim() !== "") {
    patch[`${prefix}_client_secret`] = input.clientSecret.trim();
  }
  const { data, error } = await supabase.from("melhor_envio_settings").update(patch).eq("id", SETTINGS_ID).select("*").single();
  if (error) {
    throw new Error(`Erro ao salvar Melhor Envio: ${error.message}`);
  }
  return toStatus(data);
}
function createOAuthState(environment) {
  return jwt2.sign(
    { purpose: "melhor_envio_oauth", environment },
    getJwtSecret2(),
    { expiresIn: "15m" }
  );
}
function verifyOAuthState(state) {
  const payload = jwt2.verify(state, getJwtSecret2());
  if (typeof payload !== "object" || payload === null || payload.purpose !== "melhor_envio_oauth") {
    throw new Error("State OAuth inv\xE1lido");
  }
  const environment = payload.environment;
  if (environment !== "production" && environment !== "sandbox") {
    throw new Error("Ambiente OAuth inv\xE1lido");
  }
  return environment;
}
async function buildAuthorizeUrl() {
  const row = await getMelhorEnvioSettings();
  const clientId = getClientId(row).trim();
  const redirectUri = (row.redirect_uri || getDefaultRedirectUri()).trim();
  if (!clientId) {
    throw new Error("Configure o Client ID do Melhor Envio antes de conectar");
  }
  if (!getClientSecret(row).trim()) {
    throw new Error("Configure o Client Secret do Melhor Envio antes de conectar");
  }
  if (!redirectUri) {
    throw new Error("Configure a URL de callback (redirect_uri)");
  }
  const state = createOAuthState(row.environment);
  const base = getMelhorEnvioBaseUrl(row.environment);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
    scope: MELHOR_ENVIO_SCOPES
  });
  return `${base}/oauth/authorize?${params.toString()}`;
}
async function requestToken(environment, body, userAgent) {
  const base = getMelhorEnvioBaseUrl(environment);
  const form = new URLSearchParams(body);
  const response = await fetch(`${base}/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent
    },
    body: form.toString()
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !data?.access_token) {
    const message = data?.error_description || data?.message || data?.error || `Falha ao obter token Melhor Envio (HTTP ${response.status})`;
    throw new Error(message);
  }
  return data;
}
async function saveTokens(environment, tokens) {
  const prefix = envPrefix(environment);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1e3).toISOString();
  const { error } = await supabase.from("melhor_envio_settings").update({
    [`${prefix}_access_token`]: tokens.access_token,
    [`${prefix}_refresh_token`]: tokens.refresh_token,
    [`${prefix}_token_expires_at`]: expiresAt,
    environment,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", SETTINGS_ID);
  if (error) {
    throw new Error(`Erro ao salvar tokens Melhor Envio: ${error.message}`);
  }
}
async function exchangeAuthorizationCode(code, state) {
  const environment = verifyOAuthState(state);
  const row = await getMelhorEnvioSettings();
  const redirectUri = (row.redirect_uri || getDefaultRedirectUri()).trim();
  const clientId = getClientId(row, environment).trim();
  const clientSecret = getClientSecret(row, environment).trim();
  if (!clientId || !clientSecret) {
    throw new Error("Credenciais do Melhor Envio n\xE3o configuradas para este ambiente");
  }
  const tokens = await requestToken(
    environment,
    {
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code
    },
    row.user_agent
  );
  await saveTokens(environment, tokens);
  return getMelhorEnvioStatus();
}
async function refreshAccessToken(row, environment) {
  const refreshToken = getRefreshToken(row, environment);
  const clientId = getClientId(row, environment).trim();
  const clientSecret = getClientSecret(row, environment).trim();
  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error("Melhor Envio n\xE3o conectado. Autorize pelo painel admin.");
  }
  const tokens = await requestToken(
    environment,
    {
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken
    },
    row.user_agent
  );
  await saveTokens(environment, tokens);
  return getMelhorEnvioSettings();
}
async function getValidAccessToken() {
  let row = await getMelhorEnvioSettings();
  const environment = row.environment;
  let accessToken = getAccessToken(row, environment);
  const expiresAt = getTokenExpiresAt(row, environment);
  if (!accessToken || !getRefreshToken(row, environment)) {
    throw new Error("Melhor Envio n\xE3o conectado. Autorize pelo painel admin.");
  }
  const expiresMs = expiresAt ? new Date(expiresAt).getTime() : 0;
  const needsRefresh = !expiresAt || expiresMs - Date.now() < 5 * 60 * 1e3;
  if (needsRefresh) {
    row = await refreshAccessToken(row, environment);
    accessToken = getAccessToken(row, environment);
    if (!accessToken) {
      throw new Error("N\xE3o foi poss\xEDvel renovar o token do Melhor Envio");
    }
  }
  return { accessToken, row };
}
async function disconnectMelhorEnvio() {
  const row = await getMelhorEnvioSettings();
  const prefix = envPrefix(row.environment);
  const { error } = await supabase.from("melhor_envio_settings").update({
    [`${prefix}_access_token`]: null,
    [`${prefix}_refresh_token`]: null,
    [`${prefix}_token_expires_at`]: null,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", SETTINGS_ID);
  if (error) {
    throw new Error(`Erro ao desconectar Melhor Envio: ${error.message}`);
  }
  return getMelhorEnvioStatus();
}
function toNumber2(value, fallback = 0) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value.replace(",", "."));
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}
async function calculateShippingDetailed(input) {
  const { accessToken, row } = await getValidAccessToken();
  const fromCep = row.origin_postal_code.replace(/\D/g, "");
  if (fromCep.length !== 8) {
    throw new Error("Configure o CEP de origem da loja no painel Melhor Envio");
  }
  const products = input.products.map((product) => ({
    id: product.id,
    width: product.width ?? Number(row.default_width_cm),
    height: product.height ?? Number(row.default_height_cm),
    length: product.length ?? Number(row.default_length_cm),
    weight: product.weight ?? Number(row.default_weight_kg),
    insurance_value: Number(product.insuranceValue.toFixed(2)),
    quantity: product.quantity
  }));
  const body = {
    from: { postal_code: fromCep },
    to: { postal_code: input.toPostalCode },
    products,
    options: {
      receipt: input.receipt ?? false,
      own_hand: input.ownHand ?? false
    }
  };
  if (input.services?.trim()) {
    body.services = input.services.trim();
  }
  const base = getMelhorEnvioBaseUrl(row.environment);
  const response = await fetch(`${base}/api/v2/me/shipment/calculate`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": row.user_agent
    },
    body: JSON.stringify(body)
  });
  const raw = await response.json().catch(() => null);
  if (!response.ok) {
    const message = raw && typeof raw === "object" && "message" in raw && String(raw.message) || `Erro na cota\xE7\xE3o Melhor Envio (HTTP ${response.status})`;
    throw new Error(message);
  }
  const items = Array.isArray(raw) ? raw : [];
  const options = items.filter((item) => !item.error).map((item) => ({
    id: String(item.id),
    name: item.name,
    company: item.company?.name ?? "",
    price: toNumber2(item.price),
    customPrice: toNumber2(item.custom_price ?? item.price),
    deliveryTime: item.delivery_time,
    customDeliveryTime: item.custom_delivery_time ?? item.delivery_time,
    currency: item.currency || "R$",
    companyId: item.company?.id ?? null,
    packages: (item.packages ?? []).map((entry) => ({
      height: toNumber2(entry.height ?? entry.dimensions?.height),
      width: toNumber2(entry.width ?? entry.dimensions?.width),
      length: toNumber2(entry.length ?? entry.dimensions?.length),
      weight: toNumber2(entry.weight)
    })),
    error: item.error ?? null
  })).sort((a, b) => a.customPrice - b.customPrice);
  const subtotal = input.products.reduce(
    (sum, p) => sum + p.insuranceValue * p.quantity,
    0
  );
  const freeShipping = applyFreeShipping(
    options,
    subtotal,
    row.free_shipping_enabled ?? true,
    Number(row.free_shipping_threshold ?? 299)
  );
  return {
    result: {
      options: freeShipping.options,
      environment: row.environment,
      freeShippingApplied: freeShipping.applied
    },
    requestPayload: body,
    responsePayload: raw,
    fromPostalCode: fromCep
  };
}
async function calculateShipping(input) {
  return (await calculateShippingDetailed(input)).result;
}
async function createCheckoutShippingQuote(customerId, toPostalCode) {
  const { data: cart, error: cartError } = await supabase.from("carts").select("id").eq("customer_id", customerId).eq("status", "active").maybeSingle();
  if (cartError) throw new Error(cartError.message);
  if (!cart) throw new Error("Carrinho vazio");
  const { data: items, error: itemsError } = await supabase.from("cart_items").select("product_id, product_slug, quantity, unit_price").eq("cart_id", cart.id);
  if (itemsError) throw new Error(itemsError.message);
  const cartItems = items ?? [];
  if (!cartItems.length) throw new Error("Carrinho vazio");
  const productIds = Array.from(new Set(cartItems.map((item) => item.product_id)));
  const { data: dimensions, error: dimensionsError } = await supabase.from("products").select("id, width_cm, height_cm, length_cm, weight_kg").in("id", productIds);
  if (dimensionsError) throw new Error(dimensionsError.message);
  const dimensionMap = new Map(
    (dimensions ?? []).map((product) => [Number(product.id), product])
  );
  const input = {
    toPostalCode,
    products: cartItems.map((item) => {
      const product = dimensionMap.get(Number(item.product_id));
      return {
        id: item.product_slug,
        quantity: item.quantity,
        insuranceValue: Number(item.unit_price),
        width: product?.width_cm == null ? void 0 : Number(product.width_cm),
        height: product?.height_cm == null ? void 0 : Number(product.height_cm),
        length: product?.length_cm == null ? void 0 : Number(product.length_cm),
        weight: product?.weight_kg == null ? void 0 : Number(product.weight_kg)
      };
    })
  };
  const calculation = await calculateShippingDetailed(input);
  const subtotal = cartItems.reduce(
    (total, item) => total + Number(item.unit_price) * item.quantity,
    0
  );
  const expiresAt = new Date(Date.now() + 30 * 60 * 1e3).toISOString();
  const { data: quote, error: quoteError } = await supabase.from("shipping_quotes").insert({
    customer_id: customerId,
    cart_id: cart.id,
    environment: calculation.result.environment,
    from_postal_code: calculation.fromPostalCode,
    to_postal_code: toPostalCode,
    subtotal,
    free_shipping_applied: calculation.result.freeShippingApplied,
    request_payload: calculation.requestPayload,
    response_payload: calculation.responsePayload,
    options: calculation.result.options,
    expires_at: expiresAt
  }).select("id, expires_at").single();
  if (quoteError) throw new Error(quoteError.message);
  return {
    ...calculation.result,
    quoteId: quote.id,
    expiresAt: quote.expires_at
  };
}
async function validateShippingSelection(params) {
  const { data, error } = await supabase.from("shipping_quotes").select("*").eq("id", params.quoteId).eq("customer_id", params.customerId).eq("cart_id", params.cartId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Cota\xE7\xE3o de frete inv\xE1lida");
  if (new Date(data.expires_at).getTime() <= Date.now()) {
    throw new Error("Cota\xE7\xE3o de frete expirada. Calcule novamente.");
  }
  if (String(data.to_postal_code).replace(/\D/g, "") !== params.toPostalCode.replace(/\D/g, "")) {
    throw new Error("O CEP mudou. Calcule o frete novamente.");
  }
  if (Math.abs(Number(data.subtotal) - params.subtotal) > 9e-3) {
    throw new Error("O carrinho mudou. Calcule o frete novamente.");
  }
  const quotedProducts = Array.isArray(data.request_payload?.products) ? data.request_payload.products.map((product) => ({
    id: String(product.id),
    quantity: Number(product.quantity),
    insuranceValue: Number(product.insurance_value)
  })).sort((a, b) => a.id.localeCompare(b.id)) : [];
  const currentProducts = params.items.map((item) => ({
    id: item.product_slug,
    quantity: item.quantity,
    insuranceValue: Number(item.unit_price)
  })).sort((a, b) => a.id.localeCompare(b.id));
  if (JSON.stringify(quotedProducts) !== JSON.stringify(currentProducts)) {
    throw new Error("O carrinho mudou. Calcule o frete novamente.");
  }
  const options = Array.isArray(data.options) ? data.options : [];
  const service = options.find((option) => option.id === params.serviceId);
  if (!service) throw new Error("Servi\xE7o de entrega indispon\xEDvel nesta cota\xE7\xE3o");
  return {
    quoteId: data.id,
    service,
    environment: data.environment,
    chargedPrice: Number(service.customPrice),
    snapshot: {
      requestPayload: data.request_payload,
      responsePayload: data.response_payload,
      option: service
    }
  };
}
function requiredSender(row) {
  const required = [
    row.sender_name,
    row.sender_email,
    row.sender_phone,
    row.sender_document,
    row.sender_address,
    row.sender_number,
    row.sender_district,
    row.sender_city,
    row.sender_state_abbr,
    row.origin_postal_code
  ];
  if (required.some((value) => !String(value ?? "").trim())) {
    throw new Error("Complete os dados do remetente no painel do Melhor Envio");
  }
}
function cartResponseId(payload) {
  if (!payload || typeof payload !== "object") return null;
  const record = payload;
  const id = record.id ?? record.order_id ?? record.shipment_id;
  return id == null ? null : String(id);
}
async function ensurePaidOrderInMelhorEnvioCart(orderId) {
  const { data: order, error: orderError } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (orderError) throw new Error(orderError.message);
  if (order.payment_status !== "approved") {
    throw new Error("A etiqueta s\xF3 pode ser preparada ap\xF3s o pagamento");
  }
  if (!order.shipping_service_id || !order.shipping_quote_snapshot) {
    throw new Error("Pedido sem cota\xE7\xE3o do Melhor Envio");
  }
  const { data: orderItems, error: itemsError } = await supabase.from("order_items").select("name, quantity, price").eq("order_id", orderId);
  if (itemsError) throw new Error(itemsError.message);
  const { accessToken, row } = await getValidAccessToken();
  requiredSender(row);
  if (row.environment !== order.shipping_environment) {
    throw new Error("O ambiente do Melhor Envio mudou desde a cota\xE7\xE3o");
  }
  const snapshot = order.shipping_quote_snapshot;
  const quotedProducts = snapshot.requestPayload?.products ?? [];
  let volumes = snapshot.option?.packages ?? [];
  if (!volumes.length) {
    volumes = quotedProducts.map((product) => ({
      height: toNumber2(product.height),
      width: toNumber2(product.width),
      length: toNumber2(product.length),
      weight: toNumber2(product.weight) * Math.max(1, toNumber2(product.quantity, 1))
    }));
  }
  if (!volumes.length) throw new Error("Cota\xE7\xE3o sem volumes para a etiqueta");
  const company = String(order.shipping_company ?? "");
  const groups = groupShipmentVolumes(company, volumes);
  const recipient = order.shipping_recipient;
  const address = order.shipping_address;
  const products = (orderItems ?? []).map((item) => ({
    name: String(item.name).slice(0, 255),
    quantity: Number(item.quantity),
    unitary_value: Number(item.price).toFixed(2)
  }));
  const insuranceValue = (orderItems ?? []).reduce(
    (total, item) => total + Number(item.price) * Number(item.quantity),
    0
  );
  const results = [];
  for (let volumeIndex = 0; volumeIndex < groups.length; volumeIndex += 1) {
    await supabase.from("melhor_envio_shipments").upsert(
      {
        order_id: orderId,
        volume_index: volumeIndex,
        environment: row.environment,
        status: "pending"
      },
      { onConflict: "order_id,volume_index", ignoreDuplicates: true }
    );
    const { data: claimed, error: claimError } = await supabase.from("melhor_envio_shipments").update({
      status: "processing",
      error_message: null,
      last_attempt_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("order_id", orderId).eq("volume_index", volumeIndex).in("status", ["pending", "failed"]).select("id, attempt_count").maybeSingle();
    if (claimError) throw new Error(claimError.message);
    if (!claimed) {
      const { data: existing } = await supabase.from("melhor_envio_shipments").select("status, melhor_envio_cart_id").eq("order_id", orderId).eq("volume_index", volumeIndex).single();
      results.push({
        volumeIndex,
        status: existing?.status ?? "processing",
        cartId: existing?.melhor_envio_cart_id ?? null
      });
      continue;
    }
    const from = {
      name: row.sender_name,
      email: row.sender_email,
      phone: row.sender_phone,
      address: row.sender_address,
      complement: row.sender_complement,
      number: row.sender_number,
      district: row.sender_district,
      city: row.sender_city,
      postal_code: row.origin_postal_code.replace(/\D/g, ""),
      state_abbr: row.sender_state_abbr,
      state_register: row.sender_state_register || "ISENTO"
    };
    if (row.sender_document_type === "cnpj") {
      from.company_document = row.sender_document;
    } else {
      from.document = row.sender_document;
    }
    const body = {
      service: Number(order.shipping_service_id),
      from,
      to: {
        name: recipient.name,
        email: recipient.email,
        phone: recipient.phone,
        document: recipient.document,
        state_register: "ISENTO",
        address: address.rua,
        complement: address.complemento ?? "",
        number: address.numero,
        district: address.bairro,
        city: address.cidade,
        postal_code: address.cep.replace(/\D/g, ""),
        country_id: "BR",
        state_abbr: address.estado
      },
      products,
      volumes: groups[volumeIndex],
      options: {
        platform: "Nativa Store",
        reminder: `Pedido ${orderId.slice(0, 8).toUpperCase()}`,
        insurance_value: Number(insuranceValue.toFixed(2)),
        receipt: false,
        own_hand: false,
        reverse: false
      }
    };
    try {
      const response = await fetch(
        `${getMelhorEnvioBaseUrl(row.environment)}/api/v2/me/cart`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": row.user_agent
          },
          body: JSON.stringify(body)
        }
      );
      const responsePayload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = responsePayload && typeof responsePayload === "object" && "message" in responsePayload ? String(responsePayload.message) : `Erro ao inserir frete no carrinho (HTTP ${response.status})`;
        throw Object.assign(new Error(message), { payload: responsePayload });
      }
      const cartId = cartResponseId(responsePayload);
      if (!cartId) throw new Error("Melhor Envio n\xE3o retornou o ID da etiqueta");
      await supabase.from("melhor_envio_shipments").update({
        status: "in_cart",
        melhor_envio_cart_id: cartId,
        request_payload: body,
        response_payload: responsePayload,
        attempt_count: Number(claimed.attempt_count ?? 0) + 1,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", claimed.id);
      results.push({ volumeIndex, status: "in_cart", cartId });
    } catch (error) {
      await supabase.from("melhor_envio_shipments").update({
        status: "failed",
        request_payload: body,
        response_payload: error.payload ?? null,
        error_message: error instanceof Error ? error.message : "Erro desconhecido",
        attempt_count: Number(claimed.attempt_count ?? 0) + 1,
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      }).eq("id", claimed.id);
      results.push({ volumeIndex, status: "failed", cartId: null });
    }
  }
  return results;
}

// server/routes/adminMelhorEnvio.ts
var router5 = Router5();
function adminIntegrationsUrl(query) {
  const base = process.env.APP_URL?.trim() || process.env.VITE_APP_URL?.trim() || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  const origin = base.replace(/\/$/, "").startsWith("http") ? base.replace(/\/$/, "") : `https://${base.replace(/\/$/, "")}`;
  const params = new URLSearchParams(query);
  return `${origin}/admin/integracoes?${params.toString()}`;
}
router5.get("/status", requireAdmin, async (_req, res) => {
  try {
    const status = await getMelhorEnvioStatus();
    res.json({
      ...status,
      suggestedRedirectUri: getDefaultRedirectUri()
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar Melhor Envio"
    });
  }
});
router5.put("/settings", requireAdmin, async (req, res) => {
  try {
    const parsed = melhorEnvioSettingsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inv\xE1lidos", issues: parsed.error.issues });
      return;
    }
    const status = await updateMelhorEnvioSettings(parsed.data);
    res.json({
      ...status,
      suggestedRedirectUri: getDefaultRedirectUri()
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao salvar Melhor Envio"
    });
  }
});
router5.get("/connect", requireAdmin, async (_req, res) => {
  try {
    const url2 = await buildAuthorizeUrl();
    res.redirect(url2);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao iniciar autoriza\xE7\xE3o";
    res.redirect(adminIntegrationsUrl({ me_error: message }));
  }
});
router5.get("/callback", async (req, res) => {
  try {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const errorParam = typeof req.query.error === "string" ? req.query.error : "";
    if (errorParam) {
      const description = typeof req.query.error_description === "string" ? req.query.error_description : errorParam;
      res.redirect(adminIntegrationsUrl({ me_error: description }));
      return;
    }
    if (!code || !state) {
      res.redirect(adminIntegrationsUrl({ me_error: "C\xF3digo de autoriza\xE7\xE3o ausente" }));
      return;
    }
    await exchangeAuthorizationCode(code, state);
    res.redirect(adminIntegrationsUrl({ me_connected: "1" }));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha na autoriza\xE7\xE3o";
    res.redirect(adminIntegrationsUrl({ me_error: message }));
  }
});
router5.post("/disconnect", requireAdmin, async (_req, res) => {
  try {
    const status = await disconnectMelhorEnvio();
    res.json({
      ...status,
      suggestedRedirectUri: getDefaultRedirectUri()
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao desconectar Melhor Envio"
    });
  }
});
var adminMelhorEnvio_default = router5;

// shared/schemas/mercadoPago.ts
import { z as z5 } from "zod";
var mercadoPagoSettingsSchema = z5.object({
  environment: z5.enum(["test", "production"]),
  enabled: z5.boolean(),
  publicKey: z5.string().trim().max(300),
  accessToken: z5.string().trim().max(500).optional(),
  webhookSecret: z5.string().trim().max(500).optional(),
  pixEnabled: z5.boolean(),
  boletoEnabled: z5.boolean(),
  creditCardEnabled: z5.boolean(),
  maxInstallments: z5.number().int().min(1).max(12),
  boletoExpirationDays: z5.number().int().min(1).max(30)
});
var cardPaymentDataSchema = z5.object({
  token: z5.string().trim().min(1),
  paymentMethodId: z5.string().trim().min(1).max(50),
  installments: z5.number().int().min(1).max(12),
  issuerId: z5.string().trim().max(50).optional()
});

// server/routes/adminMercadoPago.ts
import { Router as Router6 } from "express";

// server/lib/mercadoPagoSignature.ts
import { createHmac, timingSafeEqual } from "node:crypto";
function validateMercadoPagoSignature(params) {
  if (!params.signature || !params.secret) return false;
  const parts = Object.fromEntries(
    params.signature.split(",").map((part) => {
      const [key, value] = part.trim().split("=", 2);
      return [key, value];
    })
  );
  if (!parts.ts || !parts.v1) return false;
  const timestampRaw = Number(parts.ts);
  const timestampMs = timestampRaw < 1e12 ? timestampRaw * 1e3 : timestampRaw;
  if (!Number.isFinite(timestampMs) || Math.abs((params.now ?? Date.now()) - timestampMs) > 5 * 60 * 1e3)
    return false;
  let manifest = params.dataId ? `id:${params.dataId.toLowerCase()};` : "";
  if (params.requestId) manifest += `request-id:${params.requestId};`;
  manifest += `ts:${parts.ts};`;
  const expected = createHmac("sha256", params.secret).update(manifest).digest("hex");
  const received = String(parts.v1);
  return expected.length === received.length && timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

// server/services/mercadoPago.ts
var API_URL = "https://api.mercadopago.com";
function getPublicAppUrl() {
  const raw = process.env.APP_URL?.trim() || process.env.VITE_APP_URL?.trim() || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  const withProtocol = raw.startsWith("http") ? raw : `https://${raw}`;
  return withProtocol.replace(/\/$/, "");
}
function getMercadoPagoWebhookUrl() {
  return `${getPublicAppUrl()}/api/webhooks/mercado-pago`;
}
async function getSettingsRow2(environment) {
  const { data, error } = await supabase.from("mercado_pago_settings").select("*").eq("environment", environment).single();
  if (error) throw new Error(error.message);
  return data;
}
async function getActiveSettings2() {
  const { data, error } = await supabase.from("mercado_pago_settings").select("*").eq("enabled", true).order("environment", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Mercado Pago n\xE3o est\xE1 habilitado");
  const row = data;
  if (!row.public_key || !row.access_token_encrypted || !row.webhook_secret_encrypted) {
    throw new Error("Credenciais do Mercado Pago incompletas");
  }
  return {
    ...row,
    accessToken: decryptSecret(row.access_token_encrypted),
    webhookSecret: decryptSecret(row.webhook_secret_encrypted)
  };
}
async function getEnvironmentSettings(environment) {
  const row = await getSettingsRow2(environment);
  if (!row.access_token_encrypted || !row.webhook_secret_encrypted) {
    throw new Error(
      `Credenciais do Mercado Pago incompletas em ${environment}`
    );
  }
  return {
    ...row,
    accessToken: decryptSecret(row.access_token_encrypted),
    webhookSecret: decryptSecret(row.webhook_secret_encrypted)
  };
}
async function getActiveMercadoPagoEnvironment() {
  return (await getActiveSettings2()).environment;
}
function toAdminStatus(row) {
  return {
    environment: row.environment,
    enabled: row.enabled,
    publicKey: row.public_key,
    pixEnabled: row.pix_enabled,
    boletoEnabled: row.boleto_enabled,
    creditCardEnabled: row.credit_card_enabled,
    maxInstallments: row.max_installments,
    boletoExpirationDays: row.boleto_expiration_days,
    hasAccessToken: Boolean(row.access_token_encrypted),
    hasWebhookSecret: Boolean(row.webhook_secret_encrypted),
    configured: Boolean(
      row.public_key && row.access_token_encrypted && row.webhook_secret_encrypted
    ),
    webhookUrl: getMercadoPagoWebhookUrl()
  };
}
async function getMercadoPagoAdminStatus(environment) {
  return toAdminStatus(await getSettingsRow2(environment));
}
async function updateMercadoPagoSettings(input) {
  const current = await getSettingsRow2(input.environment);
  const update = {
    enabled: input.enabled,
    public_key: input.publicKey.trim(),
    pix_enabled: input.pixEnabled,
    boleto_enabled: input.boletoEnabled,
    credit_card_enabled: input.creditCardEnabled,
    max_installments: input.maxInstallments,
    boleto_expiration_days: input.boletoExpirationDays,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (input.accessToken?.trim())
    update.access_token_encrypted = encryptSecret(input.accessToken.trim());
  if (input.webhookSecret?.trim()) {
    update.webhook_secret_encrypted = encryptSecret(input.webhookSecret.trim());
  }
  if (input.enabled) {
    const { error: disableError } = await supabase.from("mercado_pago_settings").update({ enabled: false }).neq("environment", input.environment);
    if (disableError) throw new Error(disableError.message);
  }
  const { data, error } = await supabase.from("mercado_pago_settings").update(update).eq("environment", input.environment).select("*").single();
  if (error) throw new Error(error.message);
  return toAdminStatus({ ...current, ...data });
}
async function getMercadoPagoPublicConfig() {
  const settings = await getActiveSettings2();
  const methods = [];
  if (settings.pix_enabled) methods.push("pix");
  if (settings.credit_card_enabled) methods.push("credit_card");
  if (settings.boleto_enabled) methods.push("boleto");
  return {
    enabled: true,
    publicKey: settings.public_key,
    methods,
    maxInstallments: settings.max_installments
  };
}
function normalizeMercadoPagoStatus(value) {
  const status = String(value ?? "pending").toLowerCase();
  if (status === "processed" || status === "accredited") return "approved";
  if (status === "failed") return "rejected";
  if ([
    "pending",
    "processing",
    "approved",
    "rejected",
    "canceled",
    "expired",
    "refunded"
  ].includes(status)) {
    return status;
  }
  return "pending";
}
function firstPayment(payload) {
  return payload?.transactions?.payments?.[0] ?? payload?.payments?.[0] ?? payload?.payment ?? {};
}
function normalizeInstructions(payload) {
  const payment = firstPayment(payload);
  const transactionData = payment?.payment_method?.transaction_data ?? payment?.point_of_interaction?.transaction_data ?? payload?.point_of_interaction?.transaction_data ?? {};
  const expirationCandidate = payment?.date_of_expiration ?? transactionData.expiration_date;
  const expirationDate = typeof expirationCandidate === "string" && !expirationCandidate.startsWith("P") && !Number.isNaN(Date.parse(expirationCandidate)) ? expirationCandidate : void 0;
  const instructions = {
    qrCode: transactionData.qr_code ?? payment?.payment_method?.qr_code,
    qrCodeBase64: transactionData.qr_code_base64 ?? payment?.payment_method?.qr_code_base64,
    ticketUrl: transactionData.ticket_url ?? payment?.payment_method?.ticket_url ?? payment?.transaction_details?.external_resource_url,
    barcode: payment?.payment_method?.digitable_line ?? payment?.payment_method?.barcode_content ?? payment?.payment_method?.barcode?.content ?? payment?.barcode?.content,
    expirationDate
  };
  return Object.values(instructions).some(Boolean) ? instructions : null;
}
async function mercadoPagoRequest(path2, settings, options = {}) {
  const response = await fetch(`${API_URL}${path2}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${settings.accessToken}`,
      "Content-Type": "application/json",
      ...options.headers ?? {}
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = body?.errors?.[0]?.details;
    const message = (Array.isArray(details) && details.length > 0 ? details.join("; ") : body?.errors?.[0]?.message) ?? body?.message ?? body?.error ?? `Mercado Pago respondeu HTTP ${response.status}`;
    const error = new Error(String(message));
    error.payload = body;
    error.status = response.status;
    throw error;
  }
  return body;
}
async function testMercadoPagoCredentials(environment) {
  const row = await getSettingsRow2(environment);
  if (!row.access_token_encrypted) throw new Error("Informe o Access Token");
  const settings = {
    ...row,
    accessToken: decryptSecret(row.access_token_encrypted),
    webhookSecret: row.webhook_secret_encrypted ? decryptSecret(row.webhook_secret_encrypted) : ""
  };
  await mercadoPagoRequest("/v1/payment_methods", settings);
  return { success: true };
}
async function createMercadoPagoOrder(params) {
  const settings = params.environment ? await getEnvironmentSettings(params.environment) : await getActiveSettings2();
  const methodEnabled = params.checkout.paymentMethod === "pix" && settings.pix_enabled || params.checkout.paymentMethod === "boleto" && settings.boleto_enabled || params.checkout.paymentMethod === "credit_card" && settings.credit_card_enabled;
  if (!methodEnabled) throw new Error("Forma de pagamento indispon\xEDvel");
  const method = params.checkout.paymentMethod === "credit_card" ? {
    id: params.checkout.card.paymentMethodId,
    type: "credit_card",
    token: params.checkout.card.token,
    installments: Math.min(
      params.checkout.card.installments,
      settings.max_installments
    )
  } : params.checkout.paymentMethod === "pix" ? { id: "pix", type: "bank_transfer" } : { id: "boleto", type: "ticket" };
  const address = params.checkout.shippingAddress;
  const payment = {
    amount: params.order.totalAmount.toFixed(2),
    payment_method: method
  };
  if (params.checkout.paymentMethod === "boleto") {
    payment.expiration_time = `P${settings.boleto_expiration_days}D`;
  }
  const payerEmail = settings.environment === "test" ? "comprador_nativa@testuser.com" : params.payer.email;
  const nameParts = (params.payer.firstName?.trim() || "Cliente Nativa").split(/\s+/).filter(Boolean);
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(" ") || "Nativa";
  const payer = params.checkout.paymentMethod === "boleto" ? {
    email: payerEmail,
    first_name: firstName,
    last_name: lastName,
    identification: {
      type: "CPF",
      number: params.checkout.payer.identificationNumber
    },
    address: {
      zip_code: address.cep.replace(/\D/g, ""),
      street_name: address.rua,
      street_number: address.numero,
      neighborhood: address.bairro,
      city: address.cidade,
      state: address.estado
    }
  } : { email: payerEmail };
  const payload = {
    type: "online",
    processing_mode: "automatic",
    total_amount: params.order.totalAmount.toFixed(2),
    external_reference: params.order.id,
    payer,
    transactions: { payments: [payment] }
  };
  let raw = await mercadoPagoRequest("/v1/orders", settings, {
    method: "POST",
    headers: { "X-Idempotency-Key": params.checkout.idempotencyKey },
    body: JSON.stringify(payload)
  });
  if (params.checkout.paymentMethod !== "credit_card" && raw?.id && !normalizeInstructions(raw)) {
    for (let attempt = 0; attempt < 3 && !normalizeInstructions(raw); attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      raw = await mercadoPagoRequest(
        `/v1/orders/${encodeURIComponent(String(raw.id))}`,
        settings
      );
    }
  }
  const mpPayment = firstPayment(raw);
  const paymentStatus = normalizeMercadoPagoStatus(
    mpPayment?.status ?? raw?.status
  );
  const outcome = paymentStatus === "approved" ? "approved" : paymentStatus === "rejected" ? "rejected" : "pending";
  return {
    environment: settings.environment,
    raw,
    result: {
      outcome,
      orderId: params.order.id,
      paymentStatus,
      statusDetail: mpPayment?.status_detail ?? raw?.status_detail ?? null,
      instructions: normalizeInstructions(raw)
    }
  };
}
async function getMercadoPagoOrder(mpOrderId, environment) {
  const settings = environment ? await getEnvironmentSettings(environment) : await getActiveSettings2();
  return mercadoPagoRequest(
    `/v1/orders/${encodeURIComponent(mpOrderId)}`,
    settings
  );
}
function mercadoPagoOrderIdentity(payload) {
  const payment = firstPayment(payload);
  return {
    orderId: String(payload?.id ?? ""),
    paymentId: payment?.id == null ? null : String(payment.id),
    status: normalizeMercadoPagoStatus(payment?.status ?? payload?.status),
    statusDetail: payment?.status_detail ?? payload?.status_detail ?? null,
    instructions: normalizeInstructions(payload)
  };
}
async function verifyMercadoPagoSignature(params) {
  if (!params.signature) return false;
  const settings = params.environment ? await getEnvironmentSettings(params.environment) : await getActiveSettings2();
  return validateMercadoPagoSignature({
    ...params,
    secret: settings.webhookSecret
  });
}

// server/routes/adminMercadoPago.ts
var router6 = Router6();
function environmentFrom(value) {
  return value === "production" ? "production" : "test";
}
router6.get("/status", requireAdmin, async (req, res) => {
  try {
    res.json(
      await getMercadoPagoAdminStatus(environmentFrom(req.query.environment))
    );
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar"
    });
  }
});
router6.put("/settings", requireAdmin, async (req, res) => {
  const parsed = mercadoPagoSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Dados inv\xE1lidos", issues: parsed.error.issues });
    return;
  }
  try {
    res.json(await updateMercadoPagoSettings(parsed.data));
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao salvar"
    });
  }
});
router6.post("/test", requireAdmin, async (req, res) => {
  try {
    res.json(
      await testMercadoPagoCredentials(environmentFrom(req.body?.environment))
    );
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Credenciais inv\xE1lidas"
    });
  }
});
var adminMercadoPago_default = router6;

// server/routes/adminNotifications.ts
import { Router as Router7 } from "express";

// server/services/adminNotifications.ts
function mapNotificationRow(row) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    entityType: row.entity_type,
    entityId: row.entity_id,
    readAt: row.read_at,
    createdAt: row.created_at
  };
}
async function listAdminNotifications(limit = 50) {
  const { data, error } = await supabase.from("admin_notifications").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapNotificationRow(row));
}
async function getUnreadNotificationCount() {
  const { count, error } = await supabase.from("admin_notifications").select("id", { count: "exact", head: true }).is("read_at", null);
  if (error) throw new Error(error.message);
  return count ?? 0;
}
async function markNotificationAsRead(notificationId) {
  const { data, error } = await supabase.from("admin_notifications").update({ read_at: (/* @__PURE__ */ new Date()).toISOString() }).eq("id", notificationId).select("*").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Notifica\xE7\xE3o n\xE3o encontrada");
  return mapNotificationRow(data);
}
async function markAllNotificationsAsRead() {
  const { error } = await supabase.from("admin_notifications").update({ read_at: (/* @__PURE__ */ new Date()).toISOString() }).is("read_at", null);
  if (error) throw new Error(error.message);
}
async function getUnreadCountByType() {
  const { data, error } = await supabase.from("admin_notifications").select("type").is("read_at", null);
  if (error) throw new Error(error.message);
  const counts = {
    new_order: 0,
    new_customer: 0
  };
  for (const row of data ?? []) {
    const type = row.type;
    if (type in counts) counts[type] += 1;
  }
  return counts;
}

// server/routes/adminNotifications.ts
var router7 = Router7();
router7.get("/", requireAdmin, async (_req, res) => {
  try {
    const notifications = await listAdminNotifications();
    res.json(notifications);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar notifica\xE7\xF5es"
    });
  }
});
router7.get("/unread-count", requireAdmin, async (_req, res) => {
  try {
    const [count, byType] = await Promise.all([
      getUnreadNotificationCount(),
      getUnreadCountByType()
    ]);
    res.json({ count, byType });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar notifica\xE7\xF5es"
    });
  }
});
router7.patch("/read-all", requireAdmin, async (_req, res) => {
  try {
    await markAllNotificationsAsRead();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao marcar notifica\xE7\xF5es"
    });
  }
});
router7.patch("/:id/read", requireAdmin, async (req, res) => {
  try {
    const notification = await markNotificationAsRead(req.params.id);
    res.json(notification);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao marcar notifica\xE7\xE3o";
    const status = message.includes("n\xE3o encontrada") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});
var adminNotifications_default = router7;

// shared/schemas/order.ts
import { z as z7 } from "zod";

// shared/schemas/address.ts
import { z as z6 } from "zod";
function normalizeCep(value) {
  return value.replace(/\D/g, "").slice(0, 8);
}
var shippingAddressSchema = z6.object({
  cep: z6.string().trim().min(1, "Informe o CEP").transform(normalizeCep).refine((value) => value.length === 8, { message: "CEP deve ter 8 d\xEDgitos" }),
  rua: z6.string().trim().min(2, "Informe a rua").max(200, "Rua muito longa"),
  numero: z6.string().trim().min(1, "Informe o n\xFAmero").max(20, "N\xFAmero muito longo"),
  complemento: z6.string().trim().max(100, "Complemento muito longo").optional().transform((value) => value || void 0),
  bairro: z6.string().trim().min(2, "Informe o bairro").max(100, "Bairro muito longo"),
  cidade: z6.string().trim().min(2, "Informe a cidade").max(100, "Cidade muito longa"),
  estado: z6.string().trim().length(2, "Informe a UF com 2 letras").transform((value) => value.toUpperCase())
});
var customerAddressSchema = shippingAddressSchema.extend({
  label: z6.string().trim().min(1, "Informe um nome para o endere\xE7o").max(40, "Nome muito longo"),
  isDefault: z6.boolean().optional().default(false)
});
var customerAddressUpdateSchema = customerAddressSchema.partial();

// shared/schemas/order.ts
function isValidCpf(value) {
  if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) return false;
  const digit = (length) => {
    let sum = 0;
    for (let index = 0; index < length; index++) {
      sum += Number(value[index]) * (length + 1 - index);
    }
    const remainder = sum * 10 % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(value[9]) && digit(10) === Number(value[10]);
}
var checkoutSchema = z7.object({
  shippingAddress: shippingAddressSchema,
  shipping: z7.object({
    quoteId: z7.string().uuid("Cota\xE7\xE3o de frete inv\xE1lida"),
    serviceId: z7.string().min(1, "Escolha uma transportadora")
  }),
  recipient: z7.object({
    name: z7.string().trim().min(3, "Informe o nome do destinat\xE1rio"),
    email: z7.string().trim().email("Informe um e-mail v\xE1lido"),
    phone: z7.string().transform((value) => value.replace(/\D/g, "")).refine((value) => value.length >= 10 && value.length <= 11, "Informe um telefone v\xE1lido"),
    document: z7.string().transform((value) => value.replace(/\D/g, "")).refine(isValidCpf, "Informe um CPF v\xE1lido")
  }),
  paymentMethod: z7.enum(["pix", "credit_card", "boleto"]),
  idempotencyKey: z7.string().uuid(),
  payer: z7.object({
    identificationNumber: z7.string().transform((value) => value.replace(/\D/g, "")).refine(isValidCpf, "Informe um CPF v\xE1lido")
  }),
  card: cardPaymentDataSchema.optional()
}).superRefine((value, context) => {
  if (value.paymentMethod === "credit_card" && !value.card) {
    context.addIssue({
      code: "custom",
      path: ["card"],
      message: "Os dados tokenizados do cart\xE3o s\xE3o obrigat\xF3rios"
    });
  }
});
var orderStatusUpdateSchema = z7.object({
  status: z7.enum(["pending", "paid", "canceled"])
});
var fulfillmentUpdateSchema = z7.object({
  status: z7.enum([
    "unfulfilled",
    "processing",
    "shipped",
    "delivered",
    "canceled"
  ]),
  trackingCode: z7.string().trim().max(120).optional().nullable(),
  trackingUrl: z7.string().trim().url("URL de rastreio inv\xE1lida").optional().nullable()
}).superRefine((value, context) => {
  if (value.status === "shipped" && !value.trackingCode?.trim()) {
    context.addIssue({
      code: "custom",
      path: ["trackingCode"],
      message: "Informe o c\xF3digo de rastreio"
    });
  }
});
var orderBulkIdsSchema = z7.object({
  ids: z7.array(z7.string().uuid("ID de pedido inv\xE1lido")).min(1, "Selecione ao menos um pedido").max(200, "M\xE1ximo de 200 pedidos por opera\xE7\xE3o")
});
var orderBulkExportSchema = orderBulkIdsSchema.extend({
  format: z7.enum(["csv", "pdf"])
});

// server/routes/adminOrders.ts
import { Router as Router8 } from "express";

// server/services/orderEmails.ts
function appUrl() {
  const raw = process.env.APP_URL?.trim() || process.env.VITE_APP_URL?.trim() || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  return (raw.startsWith("http") ? raw : `https://${raw}`).replace(/\/$/, "");
}
function money(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value ?? 0));
}
function paymentMethodLabel(value) {
  if (value === "pix") return "Pix";
  if (value === "boleto") return "Boleto";
  if (value === "credit_card") return "Cart\xE3o de cr\xE9dito";
  return value;
}
async function dispatchOrderEmail(orderId, event) {
  let config;
  try {
    config = await getBrevoTransactionalConfig();
  } catch {
    return "skipped";
  }
  const templateId = config.templates[event];
  if (!templateId) return "skipped";
  const [{ data: order, error: orderError }, { data: items, error: itemsError }] = await Promise.all([
    supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
    supabase.from("order_items").select("name, quantity, price, size, color").eq("order_id", orderId).order("id", { ascending: true })
  ]);
  if (orderError || itemsError || !order) return "failed";
  const recipient = order.shipping_recipient ?? {};
  let email = recipient.email?.trim().toLowerCase() ?? "";
  let customerName = recipient.name?.trim() ?? "";
  if ((!email || !customerName) && order.customer_id) {
    const [{ data: profile }, authResult] = await Promise.all([
      supabase.from("customer_profiles").select("full_name").eq("id", order.customer_id).maybeSingle(),
      supabase.auth.admin.getUserById(order.customer_id)
    ]);
    email ||= authResult.data.user?.email?.toLowerCase() ?? "";
    customerName ||= profile?.full_name ?? "";
  }
  if (!email) return "skipped";
  const idempotencyKey = `${orderId}:${event}`;
  const { data: insertedDelivery, error: deliveryError } = await supabase.from("brevo_email_deliveries").upsert(
    {
      order_id: orderId,
      event,
      idempotency_key: idempotencyKey,
      kind: "transactional",
      recipient_email: email,
      template_id: templateId,
      status: "queued",
      metadata: { orderId, event }
    },
    { onConflict: "idempotency_key", ignoreDuplicates: true }
  ).select("id, attempt_count").maybeSingle();
  if (deliveryError) return "failed";
  let delivery = insertedDelivery;
  if (!delivery) {
    const { data: failedDelivery } = await supabase.from("brevo_email_deliveries").select("id, attempt_count").eq("idempotency_key", idempotencyKey).eq("status", "failed").lt("attempt_count", 3).maybeSingle();
    if (!failedDelivery) return "duplicate";
    const { data: claimed } = await supabase.from("brevo_email_deliveries").update({
      status: "sending",
      error_message: null,
      attempt_count: Number(failedDelivery.attempt_count) + 1,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", failedDelivery.id).eq("status", "failed").select("id, attempt_count").maybeSingle();
    if (!claimed) return "duplicate";
    delivery = claimed;
  } else {
    await supabase.from("brevo_email_deliveries").update({
      status: "sending",
      attempt_count: 1,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", delivery.id);
  }
  const address = order.shipping_address ?? {};
  const itemParams = (items ?? []).map((item) => ({
    name: item.name,
    quantity: Number(item.quantity),
    price: money(item.price),
    size: item.size,
    color: item.color
  }));
  const shortId = String(order.id).slice(0, 8).toUpperCase();
  const params = {
    ORDER_ID: order.id,
    ORDER_SHORT_ID: shortId,
    CUSTOMER_NAME: customerName || "Cliente Nativa",
    ORDER_URL: `${appUrl()}/conta`,
    TOTAL: money(order.total_amount),
    SUBTOTAL: money(Number(order.total_amount) - Number(order.shipping_amount)),
    SHIPPING_AMOUNT: money(order.shipping_amount),
    PAYMENT_METHOD: paymentMethodLabel(order.payment_method),
    PAYMENT_STATUS: order.payment_status,
    ITEMS: itemParams,
    SHIPPING_COMPANY: order.shipping_company ?? "",
    DELIVERY_DAYS: order.shipping_delivery_days ?? "",
    TRACKING_CODE: order.tracking_code ?? "",
    TRACKING_URL: order.tracking_url ?? "",
    ADDRESS: [
      address.rua,
      address.numero,
      address.complemento,
      address.bairro,
      address.cidade,
      address.estado,
      address.cep
    ].filter(Boolean).join(", ")
  };
  try {
    const result = await sendBrevoTransactionalEmail(
      {
        to: [{ email, name: customerName || void 0 }],
        replyTo: config.replyTo ? { email: config.replyTo } : void 0,
        templateId,
        params,
        tags: ["order", event]
      },
      "transactional",
      { record: false }
    );
    await supabase.from("brevo_email_deliveries").update({
      message_id: result.messageId ?? null,
      status: "sent",
      sent_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", delivery.id);
    return "sent";
  } catch (error) {
    await supabase.from("brevo_email_deliveries").update({
      status: "failed",
      failed_at: (/* @__PURE__ */ new Date()).toISOString(),
      error_message: error instanceof Error ? error.message.slice(0, 2e3) : "Erro desconhecido",
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("id", delivery.id);
    return "failed";
  }
}
function dispatchPaymentStatusEmail(orderId, status) {
  if (status === "approved") {
    return dispatchOrderEmail(orderId, "payment_approved");
  }
  if (status === "refunded") {
    return dispatchOrderEmail(orderId, "payment_refunded");
  }
  if (["rejected", "canceled", "expired"].includes(status)) {
    return dispatchOrderEmail(orderId, "payment_failed");
  }
  return Promise.resolve("skipped");
}
async function retryOrderEmail(orderId, deliveryId) {
  const { data, error } = await supabase.from("brevo_email_deliveries").select("event").eq("id", deliveryId).eq("order_id", orderId).eq("status", "failed").maybeSingle();
  if (error || !data?.event) return "failed";
  return dispatchOrderEmail(orderId, data.event);
}

// server/services/orders.ts
async function fetchCustomerCartRow(customerId) {
  const { data, error } = await supabase.from("carts").select("*").eq("customer_id", customerId).eq("status", CART_STATUS_ACTIVE).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
async function fetchCartItems(cartId) {
  const { data, error } = await supabase.from("cart_items").select("*").eq("cart_id", cartId).order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}
async function validateCheckoutStock(items) {
  const productIds = Array.from(new Set(items.map((item) => item.product_id)));
  const { data, error } = await supabase.from("products").select("id, name, in_stock, stock_count").in("id", productIds);
  if (error) throw new Error(error.message);
  const products = new Map(
    (data ?? []).map((product) => [Number(product.id), product])
  );
  const requested = /* @__PURE__ */ new Map();
  for (const item of items) {
    const id = Number(item.product_id);
    const current = requested.get(id);
    requested.set(id, {
      quantity: (current?.quantity ?? 0) + item.quantity,
      name: item.product_name
    });
  }
  for (const [id, item] of Array.from(requested.entries())) {
    const product = products.get(id);
    if (!product || !product.in_stock || Number(product.stock_count) < item.quantity) {
      throw new Error(`Estoque insuficiente para ${item.name}`);
    }
  }
}
async function fetchOrderWithItems(orderId, customerId) {
  let query = supabase.from("orders").select("*").eq("id", orderId);
  if (customerId) query = query.eq("customer_id", customerId);
  const { data: orderRow, error: orderError } = await query.single();
  if (orderError) throw new Error(orderError.message);
  const { data: itemRows, error: itemsError } = await supabase.from("order_items").select("*").eq("order_id", orderId).order("id", { ascending: true });
  if (itemsError) throw new Error(itemsError.message);
  const items = (itemRows ?? []).map(mapOrderItemRowToOrderItem);
  return mapOrderRowToOrder(orderRow, items);
}
async function listCustomerOrders(customerId) {
  const { data: orderRows, error } = await supabase.from("orders").select("*").eq("customer_id", customerId).or(VISIBLE_ORDER_FILTER).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!orderRows?.length) return [];
  const orderIds = orderRows.map((row) => row.id);
  const { data: itemRows, error: itemsError } = await supabase.from("order_items").select("order_id, quantity").in("order_id", orderIds);
  if (itemsError) throw new Error(itemsError.message);
  const countMap = /* @__PURE__ */ new Map();
  for (const item of itemRows ?? []) {
    const current = countMap.get(item.order_id) ?? 0;
    countMap.set(item.order_id, current + Number(item.quantity));
  }
  return orderRows.map(
    (row) => mapOrderRowToSummary(row, countMap.get(row.id) ?? 0)
  );
}
async function getCustomerOrder(customerId, orderId) {
  let order = await fetchOrderWithItems(orderId, customerId);
  if (order.paymentStatus === "pending" || order.paymentStatus === "processing") {
    const { data: row } = await supabase.from("orders").select("mercado_pago_order_id").eq("id", orderId).eq("customer_id", customerId).maybeSingle();
    if (row?.mercado_pago_order_id) {
      try {
        const { data: attempt } = await supabase.from("payment_attempts").select("environment").eq("order_id", orderId).maybeSingle();
        const payload = await getMercadoPagoOrder(
          row.mercado_pago_order_id,
          attempt?.environment
        );
        const identity = mercadoPagoOrderIdentity(payload);
        await supabase.rpc("reconcile_mercado_pago_payment", {
          p_mercado_pago_order_id: identity.orderId,
          p_mercado_pago_payment_id: identity.paymentId,
          p_payment_status: identity.status,
          p_status_detail: identity.statusDetail,
          p_response: payload
        });
        await dispatchPaymentStatusEmail(orderId, identity.status);
        if (identity.status === "approved") {
          try {
            await ensurePaidOrderInMelhorEnvioCart(orderId);
          } catch (shippingError) {
            console.error("Erro ao preparar etiqueta Melhor Envio:", shippingError);
          }
        }
        if (identity.instructions) {
          await supabase.from("orders").update({
            payment_instructions: identity.instructions,
            payment_expires_at: identity.instructions.expirationDate ?? null
          }).eq("id", orderId);
        }
        order = await fetchOrderWithItems(orderId, customerId);
      } catch (error) {
        console.error("Erro ao atualizar pagamento pendente:", error);
      }
    }
  }
  return order;
}
async function createOrderFromCheckout(customerId, input) {
  const { data: existingAttempt, error: attemptError } = await supabase.from("payment_attempts").select(
    "order_id, status, status_detail, mercado_pago_order_id, environment"
  ).eq("idempotency_key", input.idempotencyKey).maybeSingle();
  if (attemptError) throw new Error(attemptError.message);
  let order;
  let paymentEnvironment;
  if (existingAttempt) {
    const existingOrder = await fetchOrderWithItems(existingAttempt.order_id);
    if (existingOrder.customerId !== customerId)
      throw new Error("Chave idempotente inv\xE1lida");
    if (existingOrder.shippingQuoteId !== input.shipping.quoteId || existingOrder.shippingServiceId !== input.shipping.serviceId) {
      throw new Error("A entrega mudou. Gere uma nova tentativa de pagamento.");
    }
    if (existingAttempt.mercado_pago_order_id || existingOrder.paymentStatus !== "pending" || existingOrder.paymentInstructions) {
      const payment = {
        outcome: existingOrder.paymentStatus === "approved" ? "approved" : existingOrder.paymentStatus === "rejected" ? "rejected" : "pending",
        orderId: existingOrder.id,
        paymentStatus: existingOrder.paymentStatus,
        statusDetail: existingOrder.paymentStatusDetail,
        instructions: existingOrder.paymentInstructions
      };
      return { success: true, order: existingOrder, payment };
    }
    order = existingOrder;
    paymentEnvironment = existingAttempt.environment;
  } else {
    const cartRow = await fetchCustomerCartRow(customerId);
    if (!cartRow) throw new Error("Carrinho vazio");
    const cartItems = await fetchCartItems(cartRow.id);
    if (cartItems.length === 0) throw new Error("Carrinho vazio");
    await validateCheckoutStock(cartItems);
    const subtotal = cartItems.reduce(
      (sum, item) => sum + Number(item.unit_price) * item.quantity,
      0
    );
    const selectedShipping = await validateShippingSelection({
      customerId,
      cartId: cartRow.id,
      quoteId: input.shipping.quoteId,
      serviceId: input.shipping.serviceId,
      toPostalCode: input.shippingAddress.cep,
      subtotal,
      items: cartItems
    });
    const shippingAmount = selectedShipping.chargedPrice;
    const itemsPayload = cartItems.map(mapCartItemToOrderItemPayload);
    const environment = await getActiveMercadoPagoEnvironment();
    paymentEnvironment = environment;
    const { data, error } = await supabase.rpc(
      "checkout_create_payment_order",
      {
        p_customer_id: customerId,
        p_cart_id: cartRow.id,
        p_total_amount: subtotal + shippingAmount,
        p_shipping_amount: shippingAmount,
        p_coupon_code: cartRow.coupon_code,
        p_shipping_address: input.shippingAddress,
        p_payment_method: input.paymentMethod,
        p_items: itemsPayload,
        p_idempotency_key: input.idempotencyKey,
        p_environment: environment,
        p_shipping_quote_id: selectedShipping.quoteId,
        p_shipping_service_id: selectedShipping.service.id,
        p_shipping_service_name: selectedShipping.service.name,
        p_shipping_company: selectedShipping.service.company,
        p_shipping_delivery_days: selectedShipping.service.customDeliveryTime,
        p_shipping_environment: selectedShipping.environment,
        p_shipping_quote_snapshot: selectedShipping.snapshot,
        p_shipping_recipient: input.recipient
      }
    );
    if (error) {
      if (error.code === "23505") {
        return createOrderFromCheckout(customerId, input);
      }
      throw new Error(error.message);
    }
    order = await fetchOrderWithItems(data.id);
  }
  const customer = await fetchCustomerInfo(customerId);
  if (!customer.email) throw new Error("Cliente sem e-mail para pagamento");
  try {
    const created = await createMercadoPagoOrder({
      order,
      checkout: input,
      payer: { email: customer.email, firstName: customer.name ?? void 0 },
      environment: paymentEnvironment
    });
    const identity = mercadoPagoOrderIdentity(created.raw);
    if (created.result.outcome === "rejected") {
      await Promise.all([
        supabase.from("orders").update({
          mercado_pago_order_id: identity.orderId || null,
          mercado_pago_payment_id: identity.paymentId,
          payment_status: "rejected",
          payment_status_detail: identity.statusDetail
        }).eq("id", order.id),
        supabase.from("payment_attempts").update({
          mercado_pago_order_id: identity.orderId || null,
          mercado_pago_payment_id: identity.paymentId,
          status: "rejected",
          status_detail: identity.statusDetail,
          response_payload: created.raw,
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        }).eq("order_id", order.id)
      ]);
      await dispatchPaymentStatusEmail(order.id, "rejected");
    } else {
      const { error: acceptError } = await supabase.rpc(
        "checkout_accept_payment",
        {
          p_order_id: order.id,
          p_mercado_pago_order_id: identity.orderId,
          p_mercado_pago_payment_id: identity.paymentId,
          p_payment_status: identity.status,
          p_status_detail: identity.statusDetail,
          p_expires_at: identity.instructions?.expirationDate ?? null,
          p_instructions: identity.instructions,
          p_response: created.raw
        }
      );
      if (acceptError) throw new Error(acceptError.message);
      await dispatchOrderEmail(order.id, "order_received");
      if (identity.status === "approved") {
        const { error: reconcileError } = await supabase.rpc(
          "reconcile_mercado_pago_payment",
          {
            p_mercado_pago_order_id: identity.orderId,
            p_mercado_pago_payment_id: identity.paymentId,
            p_payment_status: identity.status,
            p_status_detail: identity.statusDetail,
            p_response: created.raw
          }
        );
        if (reconcileError) throw new Error(reconcileError.message);
        await dispatchPaymentStatusEmail(order.id, "approved");
        try {
          await ensurePaidOrderInMelhorEnvioCart(order.id);
        } catch (shippingError) {
          console.error("Erro ao preparar etiqueta Melhor Envio:", shippingError);
        }
      }
    }
    return {
      success: true,
      order: await fetchOrderWithItems(order.id),
      payment: created.result
    };
  } catch (error) {
    const payload = error.payload;
    await supabase.from("payment_attempts").update({
      error_payload: payload ?? {
        message: error instanceof Error ? error.message : "Erro"
      },
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("order_id", order.id);
    throw error;
  }
}
async function fetchCustomerInfo(customerId) {
  if (!customerId) {
    return { name: null, email: null, phone: null };
  }
  const [{ data: profile }, { data: authData }] = await Promise.all([
    supabase.from("customer_profiles").select("full_name, phone").eq("id", customerId).maybeSingle(),
    supabase.auth.admin.getUserById(customerId)
  ]);
  return {
    name: profile?.full_name ? String(profile.full_name) : null,
    email: authData?.user?.email ?? null,
    phone: profile?.phone == null ? null : String(profile.phone)
  };
}
async function buildItemCountMap(orderIds) {
  const countMap = /* @__PURE__ */ new Map();
  if (!orderIds.length) return countMap;
  const { data: itemRows, error: itemsError } = await supabase.from("order_items").select("order_id, quantity").in("order_id", orderIds);
  if (itemsError) throw new Error(itemsError.message);
  for (const item of itemRows ?? []) {
    const current = countMap.get(item.order_id) ?? 0;
    countMap.set(item.order_id, current + Number(item.quantity));
  }
  return countMap;
}
async function listAllOrders() {
  const { data: orderRows, error } = await supabase.from("orders").select("*").or(VISIBLE_ORDER_FILTER).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  if (!orderRows?.length) return [];
  const orderIds = orderRows.map((row) => row.id);
  const countMap = await buildItemCountMap(orderIds);
  const customerIds = Array.from(
    new Set(orderRows.map((row) => row.customer_id).filter(Boolean))
  );
  const customerInfoMap = /* @__PURE__ */ new Map();
  await Promise.all(
    customerIds.map(async (customerId) => {
      const info = await fetchCustomerInfo(customerId);
      customerInfoMap.set(customerId, { name: info.name, email: info.email });
    })
  );
  return orderRows.map((row) => {
    const summary = mapOrderRowToSummary(
      row,
      countMap.get(row.id) ?? 0
    );
    const customerInfo = row.customer_id ? customerInfoMap.get(row.customer_id) : void 0;
    return {
      ...summary,
      customerId: row.customer_id,
      customerName: customerInfo?.name ?? null,
      customerEmail: customerInfo?.email ?? null
    };
  });
}
async function getOrderById(orderId) {
  const order = await fetchOrderWithItems(orderId);
  const [customerInfo, shipmentResult, deliveryResult] = await Promise.all([
    fetchCustomerInfo(order.customerId),
    supabase.from("melhor_envio_shipments").select(
      "id, volume_index, status, melhor_envio_cart_id, error_message, attempt_count"
    ).eq("order_id", orderId).order("volume_index", { ascending: true }),
    supabase.from("brevo_email_deliveries").select(
      "id, event, status, recipient_email, message_id, error_message, attempt_count, sent_at, created_at"
    ).eq("order_id", orderId).order("created_at", { ascending: false })
  ]);
  if (shipmentResult.error) throw new Error(shipmentResult.error.message);
  if (deliveryResult.error) throw new Error(deliveryResult.error.message);
  return {
    ...order,
    customerName: customerInfo.name,
    customerEmail: customerInfo.email,
    customerPhone: customerInfo.phone,
    emailDeliveries: (deliveryResult.data ?? []).map((delivery) => ({
      id: delivery.id,
      event: delivery.event,
      status: delivery.status,
      recipientEmail: delivery.recipient_email,
      brevoMessageId: delivery.message_id,
      errorMessage: delivery.error_message,
      attemptCount: Number(delivery.attempt_count),
      sentAt: delivery.sent_at,
      createdAt: delivery.created_at
    })),
    shipments: (shipmentResult.data ?? []).map((shipment) => ({
      id: shipment.id,
      volumeIndex: Number(shipment.volume_index),
      status: shipment.status,
      melhorEnvioCartId: shipment.melhor_envio_cart_id,
      errorMessage: shipment.error_message,
      attemptCount: Number(shipment.attempt_count)
    }))
  };
}
async function updateOrderStatus(orderId, status) {
  const { data, error } = await supabase.from("orders").update({ status }).eq("id", orderId).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Pedido n\xE3o encontrado");
  if (status === "canceled") {
    await dispatchOrderEmail(orderId, "payment_failed");
  } else if (status === "paid") {
    await dispatchOrderEmail(orderId, "payment_approved");
  }
  return getOrderById(orderId);
}
async function updateOrderFulfillment(orderId, input) {
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const patch = {
    fulfillment_status: input.status
  };
  if (input.trackingCode !== void 0) {
    patch.tracking_code = input.trackingCode?.trim() || null;
  }
  if (input.trackingUrl !== void 0) {
    patch.tracking_url = input.trackingUrl?.trim() || null;
  }
  if (input.status === "processing") patch.processing_at = now;
  if (input.status === "shipped") patch.shipped_at = now;
  if (input.status === "delivered") patch.delivered_at = now;
  const { data, error } = await supabase.from("orders").update(patch).eq("id", orderId).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Pedido n\xE3o encontrado");
  const event = input.status === "processing" ? "order_processing" : input.status === "shipped" ? "order_shipped" : input.status === "delivered" ? "order_delivered" : null;
  if (event) await dispatchOrderEmail(orderId, event);
  return getOrderById(orderId);
}
async function getOrdersByIds(orderIds) {
  const uniqueIds = Array.from(new Set(orderIds));
  const orders = await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        return await getOrderById(id);
      } catch {
        return null;
      }
    })
  );
  const found = orders.filter((order) => order != null);
  if (!found.length) {
    throw new Error("Nenhum dos pedidos selecionados foi encontrado");
  }
  const orderMap = new Map(found.map((order) => [order.id, order]));
  return uniqueIds.map((id) => orderMap.get(id)).filter((order) => order != null);
}
async function deleteOrdersByIds(orderIds) {
  const uniqueIds = Array.from(new Set(orderIds));
  const { data, error } = await supabase.from("orders").delete().in("id", uniqueIds).select("id");
  if (error) throw new Error(error.message);
  const deletedIds = (data ?? []).map((row) => row.id);
  if (deletedIds.length) {
    await supabase.from("admin_notifications").delete().eq("entity_type", "order").in("entity_id", deletedIds);
  }
  return { deleted: deletedIds.length };
}

// shared/types/address.ts
function formatAddressLine(address) {
  const parts = [
    `${address.rua}, ${address.numero}`,
    address.complemento ? address.complemento : null,
    address.bairro,
    `${address.cidade} - ${address.estado}`,
    formatCepDisplay(address.cep)
  ].filter(Boolean);
  return parts.join(" \xB7 ");
}
function formatCepDisplay(cep) {
  const digits = cep.replace(/\D/g, "").slice(0, 8);
  if (digits.length !== 8) return cep;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

// server/services/ordersCsv.ts
function csvEscape(value) {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}
function formatBrlNumber(value) {
  return value.toFixed(2).replace(".", ",");
}
function buildOrdersCsv(orders) {
  const header = [
    "pedido_id",
    "pedido_curto",
    "status",
    "data",
    "cliente",
    "email",
    "telefone",
    "pagamento",
    "status_pagamento",
    "pago_em",
    "cupom",
    "frete",
    "total",
    "itens",
    "endereco",
    "transportadora",
    "servico_frete"
  ];
  const lines = orders.map((order) => {
    const itemsSummary = order.items.map((item) => {
      const variant = [item.size, item.color].filter(Boolean).join("/");
      return `${item.quantity}x ${item.name}${variant ? ` (${variant})` : ""}`;
    }).join(" | ");
    return [
      order.id,
      formatOrderShortId(order.id),
      ORDER_STATUS_LABELS[order.status],
      new Date(order.createdAt).toISOString(),
      order.customerName ?? "",
      order.customerEmail ?? "",
      order.customerPhone ?? "",
      PAYMENT_METHOD_LABELS[order.paymentMethod],
      PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus,
      order.paidAt ?? "",
      order.couponCode ?? "",
      formatBrlNumber(order.shippingAmount),
      formatBrlNumber(order.totalAmount),
      itemsSummary,
      formatAddressLine(order.shippingAddress),
      order.shippingCompany ?? "",
      order.shippingServiceName ?? ""
    ].map(csvEscape).join(",");
  });
  return `\uFEFF${[header.join(","), ...lines].join("\n")}`;
}

// server/services/ordersPdf.ts
import PDFDocument from "pdfkit";

// shared/const/site.ts
var SITE_NAME = "Nativa Store";
var SITE_TAGLINE = "Artesanato com Alma";
var SITE_TITLE = `${SITE_NAME} \u2014 ${SITE_TAGLINE}`;
var SITE_KEYWORDS = "bolsas artesanais, artesanato brasileiro, nativa store, bolsas feitas \xE0 m\xE3o, bolsas autorais, feito \xE0 m\xE3o, brasil";
var SITE_LOCALE = "pt_BR";
var SITE_THEME_COLOR = "#C4522A";
var SITE_TWITTER_HANDLE = "@nativastore";
var DEFAULT_TITLE_TEMPLATE = `%s \u2014 ${SITE_NAME}`;

// server/services/ordersPdf.ts
var COLORS = {
  forest: "#2D6A4F",
  forestDark: "#1B4332",
  ink: "#1A1A1A",
  muted: "#6B6B6B",
  line: "#D4D4D4",
  soft: "#F4F7F5",
  white: "#FFFFFF",
  accent: "#C4783A"
};
var PAGE = {
  width: 595.28,
  height: 841.89,
  margin: 48,
  footerHeight: 28,
  headerBar: 8
};
function formatBrl(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}
function formatDateTime(value) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "long",
    timeStyle: "short"
  }).format(new Date(value));
}
function contentWidth() {
  return PAGE.width - PAGE.margin * 2;
}
function contentBottom() {
  return PAGE.height - PAGE.footerHeight - 12;
}
function absoluteText(doc, text, x, y, options = {}) {
  doc.text(text, x, y, { ...options, lineBreak: false });
}
function drawPageChrome(doc) {
  doc.save();
  doc.rect(0, 0, PAGE.width, PAGE.headerBar).fill(COLORS.forest);
  doc.rect(0, PAGE.height - PAGE.footerHeight, PAGE.width, PAGE.footerHeight).fill(COLORS.forestDark);
  doc.fillColor(COLORS.white).fontSize(8).font("Helvetica");
  absoluteText(
    doc,
    `${SITE_NAME} \xB7 Documento confidencial \xB7 Gerado em ${new Intl.DateTimeFormat(
      "pt-BR",
      { dateStyle: "short", timeStyle: "short" }
    ).format(/* @__PURE__ */ new Date())}`,
    PAGE.margin,
    PAGE.height - 18,
    { width: contentWidth(), align: "left" }
  );
  doc.restore();
}
function beginContent(doc) {
  drawPageChrome(doc);
  return PAGE.margin + 16;
}
function ensureY(doc, y, needed) {
  if (y + needed <= contentBottom()) return y;
  doc.addPage();
  return beginContent(doc);
}
function drawBrandHeader(doc, subtitle, startY) {
  let y = startY;
  doc.fillColor(COLORS.forestDark).font("Helvetica-Bold").fontSize(22);
  absoluteText(doc, SITE_NAME.toUpperCase(), PAGE.margin, y, {
    width: contentWidth() * 0.58
  });
  doc.fillColor(COLORS.muted).font("Helvetica").fontSize(9);
  absoluteText(doc, SITE_TAGLINE, PAGE.margin, y + 26, {
    width: contentWidth() * 0.58
  });
  doc.fillColor(COLORS.forest).font("Helvetica-Bold").fontSize(11);
  absoluteText(doc, subtitle, PAGE.margin + contentWidth() * 0.55, y + 4, {
    width: contentWidth() * 0.45,
    align: "right"
  });
  y += 48;
  doc.moveTo(PAGE.margin, y).lineTo(PAGE.width - PAGE.margin, y).strokeColor(COLORS.line).lineWidth(1).stroke();
  return y + 16;
}
function drawSectionTitle(doc, title, y) {
  y = ensureY(doc, y, 36);
  doc.fillColor(COLORS.forestDark).font("Helvetica-Bold").fontSize(11);
  absoluteText(doc, title.toUpperCase(), PAGE.margin, y);
  doc.moveTo(PAGE.margin, y + 14).lineTo(PAGE.margin + 72, y + 14).strokeColor(COLORS.accent).lineWidth(1.5).stroke();
  return y + 26;
}
function drawKeyValueGrid(doc, rows, startY) {
  const colWidth = contentWidth() / 2;
  let y = startY;
  for (let i = 0; i < rows.length; i += 2) {
    y = ensureY(doc, y, 36);
    const left = rows[i];
    const right = rows[i + 1];
    for (let index = 0; index < 2; index++) {
      const pair = index === 0 ? left : right;
      if (!pair) continue;
      const x = PAGE.margin + index * colWidth;
      doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8);
      absoluteText(doc, pair[0].toUpperCase(), x, y, { width: colWidth - 12 });
      doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(10);
      absoluteText(doc, pair[1], x, y + 12, { width: colWidth - 12 });
    }
    y += 34;
  }
  return y;
}
function drawItemsTable(doc, order, startY) {
  let y = drawSectionTitle(doc, "Itens do pedido", startY);
  y = ensureY(doc, y, 48);
  const cols = {
    item: PAGE.margin,
    qty: PAGE.margin + 278,
    unit: PAGE.margin + 328,
    total: PAGE.margin + 420
  };
  const widths = {
    item: 270,
    qty: 40,
    unit: 82,
    total: contentWidth() - 382
  };
  doc.rect(PAGE.margin, y, contentWidth(), 22).fill(COLORS.soft);
  doc.fillColor(COLORS.forestDark).font("Helvetica-Bold").fontSize(8);
  absoluteText(doc, "PRODUTO", cols.item + 8, y + 7, {
    width: widths.item - 8
  });
  absoluteText(doc, "QTD", cols.qty, y + 7, {
    width: widths.qty,
    align: "right"
  });
  absoluteText(doc, "UNIT\xC1RIO", cols.unit, y + 7, {
    width: widths.unit,
    align: "right"
  });
  absoluteText(doc, "TOTAL", cols.total, y + 7, {
    width: widths.total - 8,
    align: "right"
  });
  y += 28;
  for (const item of order.items) {
    const variant = [item.size, item.color].filter(Boolean).join(" \xB7 ");
    doc.font("Helvetica-Bold").fontSize(9);
    const nameHeight = doc.heightOfString(item.name, {
      width: widths.item - 8
    });
    const rowHeight = Math.max(28, nameHeight + (variant ? 14 : 0) + 10);
    y = ensureY(doc, y, rowHeight + 4);
    doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(9);
    absoluteText(doc, item.name, cols.item + 8, y, {
      width: widths.item - 8
    });
    if (variant) {
      doc.fillColor(COLORS.muted).font("Helvetica").fontSize(8);
      absoluteText(doc, variant, cols.item + 8, y + nameHeight + 2, {
        width: widths.item - 8
      });
    }
    doc.fillColor(COLORS.ink).font("Helvetica").fontSize(9);
    absoluteText(doc, String(item.quantity), cols.qty, y + 2, {
      width: widths.qty,
      align: "right"
    });
    absoluteText(doc, formatBrl(item.price), cols.unit, y + 2, {
      width: widths.unit,
      align: "right"
    });
    doc.font("Helvetica-Bold");
    absoluteText(
      doc,
      formatBrl(item.price * item.quantity),
      cols.total,
      y + 2,
      { width: widths.total - 8, align: "right" }
    );
    y += rowHeight;
    doc.moveTo(PAGE.margin, y).lineTo(PAGE.width - PAGE.margin, y).strokeColor(COLORS.line).lineWidth(0.5).stroke();
    y += 6;
  }
  return y;
}
function drawTotals(doc, order, startY) {
  let y = ensureY(doc, startY, 100);
  const boxWidth = 210;
  const x = PAGE.width - PAGE.margin - boxWidth;
  const subtotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const rows = [
    ["Subtotal", formatBrl(subtotal), false],
    ["Frete", formatBrl(order.shippingAmount), false]
  ];
  if (order.couponCode) {
    rows.push(["Cupom", order.couponCode, false]);
  }
  rows.push(["Total", formatBrl(order.totalAmount), true]);
  y += 8;
  for (const [label, value, emph] of rows) {
    if (emph) {
      doc.rect(x, y - 4, boxWidth, 26).fill(COLORS.forest);
      doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(11);
      absoluteText(doc, label, x + 10, y + 3, { width: 80 });
      absoluteText(doc, value, x + 90, y + 3, {
        width: boxWidth - 100,
        align: "right"
      });
      y += 30;
    } else {
      doc.fillColor(COLORS.muted).font("Helvetica").fontSize(9);
      absoluteText(doc, label, x + 10, y, { width: 80 });
      doc.fillColor(COLORS.ink).font("Helvetica-Bold").fontSize(9);
      absoluteText(doc, value, x + 90, y, {
        width: boxWidth - 100,
        align: "right"
      });
      y += 18;
    }
  }
  return y + 8;
}
function drawOrderDetailPage(doc, order, index, total) {
  let y = beginContent(doc);
  y = drawBrandHeader(
    doc,
    total === 1 ? "Comprovante do pedido" : `Pedido ${index + 1} de ${total}`,
    y
  );
  doc.fillColor(COLORS.forestDark).font("Helvetica-Bold").fontSize(16);
  absoluteText(doc, `Pedido #${formatOrderShortId(order.id)}`, PAGE.margin, y);
  doc.fillColor(COLORS.muted).font("Helvetica").fontSize(9);
  absoluteText(doc, `ID completo: ${order.id}`, PAGE.margin, y + 20);
  y += 42;
  y = drawKeyValueGrid(
    doc,
    [
      ["Status", ORDER_STATUS_LABELS[order.status]],
      ["Data do pedido", formatDateTime(order.createdAt)],
      ["Pagamento", PAYMENT_METHOD_LABELS[order.paymentMethod]],
      [
        "Status do pagamento",
        PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus
      ],
      ["Cliente", order.customerName || "Cliente removido"],
      ["E-mail", order.customerEmail || "\u2014"],
      ["Telefone", order.customerPhone || "\u2014"],
      ["Pago em", order.paidAt ? formatDateTime(order.paidAt) : "\u2014"]
    ],
    y
  );
  y = drawSectionTitle(doc, "Entrega", y + 4);
  const shippingLines = [
    order.shippingRecipient?.name ? `Destinat\xE1rio: ${order.shippingRecipient.name}` : null,
    order.shippingRecipient?.document ? `Documento: ${order.shippingRecipient.document}` : null,
    formatAddressLine(order.shippingAddress),
    order.shippingCompany || order.shippingServiceName ? `Frete: ${[order.shippingCompany, order.shippingServiceName].filter(Boolean).join(" \xB7 ")}` : null,
    order.shippingDeliveryDays != null ? `Prazo estimado: ${order.shippingDeliveryDays} dia(s)` : null
  ].filter(Boolean);
  for (const line of shippingLines) {
    y = ensureY(doc, y, 16);
    doc.fillColor(COLORS.ink).font("Helvetica").fontSize(9);
    absoluteText(doc, line, PAGE.margin, y, { width: contentWidth() });
    y += 14;
  }
  y = drawItemsTable(doc, order, y + 10);
  drawTotals(doc, order, y);
}
function drawSummaryPage(doc, orders) {
  let y = beginContent(doc);
  y = drawBrandHeader(doc, "Relat\xF3rio de pedidos", y);
  doc.fillColor(COLORS.forestDark).font("Helvetica-Bold").fontSize(18);
  absoluteText(doc, "Resumo da sele\xE7\xE3o", PAGE.margin, y);
  doc.fillColor(COLORS.muted).font("Helvetica").fontSize(10);
  absoluteText(
    doc,
    `${orders.length} pedido(s) \xB7 Total consolidado ${formatBrl(
      orders.reduce((sum, order) => sum + order.totalAmount, 0)
    )}`,
    PAGE.margin,
    y + 22,
    { width: contentWidth() }
  );
  y += 48;
  const cols = {
    id: PAGE.margin,
    customer: PAGE.margin + 70,
    date: PAGE.margin + 230,
    payment: PAGE.margin + 320,
    status: PAGE.margin + 400,
    total: PAGE.margin + 460
  };
  y = ensureY(doc, y, 40);
  doc.rect(PAGE.margin, y, contentWidth(), 22).fill(COLORS.soft);
  doc.fillColor(COLORS.forestDark).font("Helvetica-Bold").fontSize(8);
  absoluteText(doc, "PEDIDO", cols.id + 6, y + 7);
  absoluteText(doc, "CLIENTE", cols.customer, y + 7);
  absoluteText(doc, "DATA", cols.date, y + 7);
  absoluteText(doc, "PAGAMENTO", cols.payment, y + 7);
  absoluteText(doc, "STATUS", cols.status, y + 7);
  absoluteText(doc, "TOTAL", cols.total, y + 7, {
    width: PAGE.width - PAGE.margin - cols.total - 6,
    align: "right"
  });
  y += 28;
  for (const order of orders) {
    y = ensureY(doc, y, 22);
    doc.fillColor(COLORS.ink).font("Helvetica").fontSize(8);
    absoluteText(doc, `#${formatOrderShortId(order.id)}`, cols.id + 6, y, {
      width: 60
    });
    absoluteText(doc, order.customerName || "\u2014", cols.customer, y, {
      width: 150
    });
    absoluteText(
      doc,
      new Intl.DateTimeFormat("pt-BR").format(new Date(order.createdAt)),
      cols.date,
      y,
      { width: 80 }
    );
    absoluteText(
      doc,
      PAYMENT_METHOD_LABELS[order.paymentMethod],
      cols.payment,
      y,
      { width: 70 }
    );
    absoluteText(doc, ORDER_STATUS_LABELS[order.status], cols.status, y, {
      width: 55
    });
    doc.font("Helvetica-Bold");
    absoluteText(doc, formatBrl(order.totalAmount), cols.total, y, {
      width: PAGE.width - PAGE.margin - cols.total - 6,
      align: "right"
    });
    y += 18;
  }
  y += 12;
  doc.fillColor(COLORS.muted).font("Helvetica-Oblique").fontSize(8);
  absoluteText(
    doc,
    "Nas p\xE1ginas seguintes, cada pedido \xE9 detalhado com itens, frete e totais.",
    PAGE.margin,
    y,
    { width: contentWidth() }
  );
}
async function buildOrdersPdfBuffer(orders) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      // Margens zero: o layout é posicionado manualmente para evitar
      // page-breaks automáticos do PDFKit (causa páginas em branco).
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      autoFirstPage: true,
      bufferPages: true,
      info: {
        Title: `Pedidos \u2014 ${SITE_NAME}`,
        Author: SITE_NAME,
        Subject: "Exporta\xE7\xE3o de pedidos do painel administrativo",
        Creator: `${SITE_NAME} Admin`
      }
    });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const includeSummary = orders.length > 1;
    if (includeSummary) {
      drawSummaryPage(doc, orders);
    }
    for (let index = 0; index < orders.length; index++) {
      if (includeSummary || index > 0) {
        doc.addPage();
      }
      drawOrderDetailPage(doc, orders[index], index, orders.length);
    }
    doc.end();
  });
}

// server/routes/adminOrders.ts
var router8 = Router8();
router8.get("/", requireAdmin, async (_req, res) => {
  try {
    const orders = await listAllOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar pedidos"
    });
  }
});
router8.post("/bulk/delete", requireAdmin, async (req, res) => {
  try {
    const parsed = orderBulkIdsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inv\xE1lidos", issues: parsed.error.issues });
      return;
    }
    const result = await deleteOrdersByIds(parsed.data.ids);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao excluir pedidos"
    });
  }
});
router8.post("/bulk/export", requireAdmin, async (req, res) => {
  try {
    const parsed = orderBulkExportSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inv\xE1lidos", issues: parsed.error.issues });
      return;
    }
    const orders = await getOrdersByIds(parsed.data.ids);
    const stamp = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    if (parsed.data.format === "csv") {
      const csv = buildOrdersCsv(orders);
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="pedidos-nativa-${stamp}.csv"`
      );
      res.send(csv);
      return;
    }
    const pdf = await buildOrdersPdfBuffer(orders);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="pedidos-nativa-${stamp}.pdf"`
    );
    res.send(pdf);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao exportar pedidos";
    const status = message.includes("encontrado") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});
router8.get("/:id", requireAdmin, async (req, res) => {
  try {
    const order = await getOrderById(req.params.id);
    res.json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar pedido";
    const status = message.includes("n\xE3o encontrado") || message.includes("0 rows") ? 404 : 500;
    res.status(status).json({ error: "Pedido n\xE3o encontrado" });
  }
});
router8.patch("/:id/status", requireAdmin, async (req, res) => {
  try {
    const parsed = orderStatusUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inv\xE1lidos", issues: parsed.error.issues });
      return;
    }
    const order = await updateOrderStatus(req.params.id, parsed.data.status);
    res.json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar pedido";
    const status = message.includes("n\xE3o encontrado") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});
router8.patch("/:id/fulfillment", requireAdmin, async (req, res) => {
  try {
    const parsed = fulfillmentUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inv\xE1lidos", issues: parsed.error.issues });
      return;
    }
    res.json(await updateOrderFulfillment(req.params.id, parsed.data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar entrega";
    res.status(message.includes("n\xE3o encontrado") ? 404 : 500).json({ error: message });
  }
});
router8.post("/:id/shipment/retry", requireAdmin, async (req, res) => {
  try {
    await ensurePaidOrderInMelhorEnvioCart(req.params.id);
    res.json(await getOrderById(req.params.id));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao reenviar para o Melhor Envio";
    res.status(400).json({ error: message });
  }
});
router8.post("/:id/emails/:deliveryId/retry", requireAdmin, async (req, res) => {
  try {
    const result = await retryOrderEmail(req.params.id, req.params.deliveryId);
    if (result === "failed") {
      res.status(400).json({ error: "E-mail n\xE3o encontrado ou limite atingido" });
      return;
    }
    res.json(await getOrderById(req.params.id));
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Erro ao reenviar e-mail"
    });
  }
});
var adminOrders_default = router8;

// shared/schemas/region.ts
import { z as z8 } from "zod";
var SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
var regionSchema = z8.object({
  id: z8.string().min(1, "Informe o identificador da regi\xE3o").regex(SLUG_PATTERN, "Use apenas letras min\xFAsculas, n\xFAmeros e h\xEDfens (ex: nordeste)"),
  name: z8.string().min(2, "Informe o nome da regi\xE3o"),
  title: z8.string().min(2, "Informe o t\xEDtulo da hist\xF3ria"),
  story: z8.string().min(10, "Conte um pouco mais sobre a origem cultural"),
  coverImage: z8.string().min(1, "Adicione a imagem da regi\xE3o"),
  productIds: z8.array(z8.number().int().nonnegative()).default([])
});

// server/routes/adminRegions.ts
import { Router as Router9 } from "express";

// shared/lib/productMapper.ts
function asStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}
function asSizes(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item) => typeof item === "object" && item !== null && "label" in item && "available" in item && typeof item.label === "string" && typeof item.available === "boolean"
  );
}
function asColors(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item) => typeof item === "object" && item !== null && "name" in item && "hex" in item && typeof item.name === "string" && typeof item.hex === "string"
  );
}
function asFaq(value) {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item) => typeof item === "object" && item !== null && "question" in item && "answer" in item && typeof item.question === "string" && typeof item.answer === "string"
  );
}
function asArtisan(value) {
  if (typeof value !== "object" || value === null) {
    return { name: "", region: "", story: "" };
  }
  const artisan = value;
  return {
    name: typeof artisan.name === "string" ? artisan.name : "",
    region: typeof artisan.region === "string" ? artisan.region : "",
    story: typeof artisan.story === "string" ? artisan.story : ""
  };
}
function mapProductRowToProduct(row) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category,
    price: Number(row.price),
    originalPrice: row.original_price === null ? null : Number(row.original_price),
    image: row.image,
    images: asStringArray(row.images),
    badge: row.badge,
    badgeColor: row.badge_color,
    rating: Number(row.rating),
    reviews: row.reviews,
    featured: row.featured,
    shortDescription: row.short_description,
    description: row.description,
    materials: asStringArray(row.materials),
    careInstructions: asStringArray(row.care_instructions),
    artisan: asArtisan(row.artisan),
    sizes: asSizes(row.sizes),
    colors: asColors(row.colors),
    sku: row.sku,
    inStock: row.in_stock,
    stockCount: row.stock_count,
    widthCm: row.width_cm == null ? null : Number(row.width_cm),
    heightCm: row.height_cm == null ? null : Number(row.height_cm),
    lengthCm: row.length_cm == null ? null : Number(row.length_cm),
    weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
    faq: asFaq(row.faq),
    highlights: asStringArray(row.highlights),
    regionId: row.region_id ?? null
  };
}
function mapProductToRow(product) {
  return {
    slug: product.slug,
    name: product.name,
    category: product.category,
    price: product.price,
    original_price: product.originalPrice,
    image: product.image,
    images: product.images,
    badge: product.badge,
    badge_color: product.badgeColor,
    rating: product.rating,
    reviews: product.reviews,
    featured: product.featured,
    short_description: product.shortDescription,
    description: product.description,
    materials: product.materials,
    care_instructions: product.careInstructions,
    artisan: product.artisan,
    sizes: product.sizes,
    colors: product.colors,
    sku: product.sku,
    in_stock: product.inStock,
    stock_count: product.stockCount,
    width_cm: product.widthCm,
    height_cm: product.heightCm,
    length_cm: product.lengthCm,
    weight_kg: product.weightKg,
    faq: product.faq,
    highlights: product.highlights,
    region_id: product.regionId ?? null
  };
}

// shared/lib/regionMapper.ts
function asProductIds(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "number") : [];
}
function mapRegionRowToRegion(row) {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    story: row.story,
    coverImage: row.cover_image,
    productIds: asProductIds(row.product_ids),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function mapRegionInputToRow(input) {
  return {
    id: input.id,
    name: input.name,
    title: input.title,
    story: input.story,
    cover_image: input.coverImage,
    product_ids: input.productIds,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// server/services/regions.ts
var REGION_SELECT = "id, name, title, story, cover_image, product_ids, created_at, updated_at";
async function populateRegions(rows) {
  const allProductIds = Array.from(new Set(rows.flatMap((row) => row.product_ids ?? [])));
  const productsById = /* @__PURE__ */ new Map();
  if (allProductIds.length > 0) {
    const { data, error } = await supabase.from("products").select("*").in("id", allProductIds);
    if (error) {
      throw new Error(`Erro ao carregar produtos das regi\xF5es: ${error.message}`);
    }
    for (const row of data ?? []) {
      productsById.set(row.id, mapProductRowToProduct(row));
    }
  }
  return rows.map((row) => {
    const { productIds, ...region } = mapRegionRowToRegion(row);
    return {
      ...region,
      products: productIds.map((id) => productsById.get(id)).filter((product) => Boolean(product))
    };
  });
}
async function listRegions() {
  const { data, error } = await supabase.from("regions").select(REGION_SELECT).order("id", { ascending: true });
  if (error) {
    throw new Error(`Erro ao listar regi\xF5es: ${error.message}`);
  }
  return populateRegions(data ?? []);
}
async function getRegionById(id) {
  const { data, error } = await supabase.from("regions").select(REGION_SELECT).eq("id", id).maybeSingle();
  if (error) {
    throw new Error(`Erro ao carregar regi\xE3o: ${error.message}`);
  }
  if (!data) return null;
  const [region] = await populateRegions([data]);
  return region;
}
async function listAllRegionsRaw() {
  const { data, error } = await supabase.from("regions").select(REGION_SELECT).order("id", { ascending: true });
  if (error) {
    throw new Error(`Erro ao listar regi\xF5es: ${error.message}`);
  }
  return (data ?? []).map(mapRegionRowToRegion);
}
async function getRegionByIdRaw(id) {
  const { data, error } = await supabase.from("regions").select(REGION_SELECT).eq("id", id).single();
  if (error) {
    throw new Error(error.code === "PGRST116" ? "Regi\xE3o n\xE3o encontrada" : error.message);
  }
  return mapRegionRowToRegion(data);
}
async function createRegion(input) {
  const row = mapRegionInputToRow(input);
  const { data, error } = await supabase.from("regions").insert(row).select(REGION_SELECT).single();
  if (error) {
    throw new Error(
      error.code === "23505" ? "J\xE1 existe uma regi\xE3o com esse identificador" : `Erro ao criar regi\xE3o: ${error.message}`
    );
  }
  return mapRegionRowToRegion(data);
}
async function updateRegion(id, input) {
  const row = mapRegionInputToRow(input);
  const { data, error } = await supabase.from("regions").update(row).eq("id", id).select(REGION_SELECT).maybeSingle();
  if (error) {
    throw new Error(`Erro ao atualizar regi\xE3o: ${error.message}`);
  }
  if (!data) return null;
  return mapRegionRowToRegion(data);
}
async function deleteRegion(id) {
  const { data, error } = await supabase.from("regions").delete().eq("id", id).select("id");
  if (error) {
    throw new Error(`Erro ao excluir regi\xE3o: ${error.message}`);
  }
  return (data?.length ?? 0) > 0;
}

// server/routes/adminRegions.ts
var router9 = Router9();
router9.get("/", requireAdmin, async (_req, res) => {
  try {
    const regions = await listAllRegionsRaw();
    res.json(regions);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar regi\xF5es"
    });
  }
});
router9.get("/:id", requireAdmin, async (req, res) => {
  try {
    const region = await getRegionByIdRaw(req.params.id);
    res.json(region);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar regi\xE3o";
    const status = message.includes("n\xE3o encontrada") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});
router9.post("/", requireAdmin, async (req, res) => {
  try {
    const parsed = regionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inv\xE1lidos", issues: parsed.error.issues });
      return;
    }
    const region = await createRegion(parsed.data);
    res.status(201).json(region);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao criar regi\xE3o"
    });
  }
});
router9.put("/:id", requireAdmin, async (req, res) => {
  try {
    const parsed = regionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inv\xE1lidos", issues: parsed.error.issues });
      return;
    }
    const region = await updateRegion(req.params.id, parsed.data);
    if (!region) {
      res.status(404).json({ error: "Regi\xE3o n\xE3o encontrada" });
      return;
    }
    res.json(region);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao atualizar regi\xE3o"
    });
  }
});
router9.delete("/:id", requireAdmin, async (req, res) => {
  try {
    const deleted = await deleteRegion(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "Regi\xE3o n\xE3o encontrada" });
      return;
    }
    res.status(204).end();
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao excluir regi\xE3o"
    });
  }
});
var adminRegions_default = router9;

// server/routes/admin.ts
var router10 = Router10();
function handleSingleImageUpload(req, res, next) {
  upload.single("file")(req, res, (error) => {
    if (error) {
      const message = error instanceof Error ? error.message : "Erro ao processar upload";
      res.status(400).json({ error: message });
      return;
    }
    next();
  });
}
router10.post("/login", (req, res) => {
  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!password) {
    res.status(400).json({ error: "Informe a senha" });
    return;
  }
  let isValid;
  try {
    isValid = checkAdminPassword(password);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao validar senha"
    });
    return;
  }
  if (!isValid) {
    res.status(401).json({ error: "Senha inv\xE1lida" });
    return;
  }
  const token = signAdminToken();
  res.cookie(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_COOKIE_MAX_AGE_MS,
    path: "/"
  });
  res.json({ authenticated: true });
});
router10.post("/logout", (_req, res) => {
  res.clearCookie(ADMIN_COOKIE_NAME, { path: "/" });
  res.json({ authenticated: false });
});
router10.get("/me", requireAdmin, (_req, res) => {
  res.json({ authenticated: true });
});
router10.use("/orders", adminOrders_default);
router10.use("/customers", adminCustomers_default);
router10.use("/notifications", adminNotifications_default);
router10.use("/dashboard", adminDashboard_default);
router10.use("/banners", adminBanners_default);
router10.use("/brevo", adminBrevo_default);
router10.use("/regions", adminRegions_default);
router10.use("/melhor-envio", adminMelhorEnvio_default);
router10.use("/mercado-pago", adminMercadoPago_default);
router10.post(
  "/uploads",
  requireAdmin,
  handleSingleImageUpload,
  async (req, res) => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Nenhum arquivo enviado" });
        return;
      }
      const folderRaw = typeof req.body?.folder === "string" ? req.body.folder : "products";
      const folder = folderRaw === "banners" ? "banners" : "products";
      const url2 = await uploadProductImage(req.file, folder);
      res.json({ url: url2 });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Erro ao enviar imagem"
      });
    }
  }
);
router10.post("/uploads/sign", requireAdmin, async (req, res) => {
  try {
    const folderRaw = typeof req.body?.folder === "string" ? req.body.folder : "products";
    const folder = folderRaw === "banners" ? "banners" : "products";
    const contentType = typeof req.body?.contentType === "string" ? req.body.contentType : "";
    if (!contentType) {
      res.status(400).json({ error: "Informe o contentType do arquivo" });
      return;
    }
    const signed = await createSignedImageUpload({ folder, contentType });
    res.json(signed);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Erro ao preparar upload"
    });
  }
});
var admin_default = router10;

// server/routes/analytics.ts
import { Router as Router11 } from "express";

// server/lib/visitorSession.ts
import crypto2 from "node:crypto";
function generateVisitorSessionId() {
  return crypto2.randomUUID();
}
function getVisitorSessionFromCookie(cookies) {
  const value = cookies[VISITOR_SESSION_COOKIE];
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
function setVisitorSessionCookie(res, sessionId) {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie(VISITOR_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: VISITOR_SESSION_MAX_AGE_MS,
    path: "/"
  });
}

// server/services/analytics.ts
async function recordPageView(sessionId, path2) {
  const normalizedPath = path2.split("?")[0].slice(0, 500) || "/";
  const { error } = await supabase.from("store_page_views").insert({
    session_id: sessionId,
    path: normalizedPath
  });
  if (error) throw new Error(error.message);
}

// server/routes/analytics.ts
var router11 = Router11();
router11.post("/page-view", async (req, res) => {
  try {
    const path2 = typeof req.body?.path === "string" ? req.body.path : "/";
    if (path2.startsWith("/admin")) {
      res.status(204).send();
      return;
    }
    let sessionId = getVisitorSessionFromCookie(req.cookies ?? {});
    if (!sessionId) {
      sessionId = generateVisitorSessionId();
      setVisitorSessionCookie(res, sessionId);
    }
    await recordPageView(sessionId, path2);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao registrar visita"
    });
  }
});
var analytics_default = router11;

// server/routes/banners.ts
import { Router as Router12 } from "express";
var router12 = Router12();
router12.get("/", async (_req, res) => {
  try {
    const banners = await listActiveBanners();
    res.json(banners);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar banners"
    });
  }
});
var banners_default = router12;

// server/routes/brevoWebhook.ts
import { Router as Router13 } from "express";

// server/lib/brevoWebhookSecurity.ts
import { createHash as createHash2, timingSafeEqual as timingSafeEqual2 } from "node:crypto";
function bearerToken(authorization) {
  if (!authorization) return null;
  const match = authorization.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] ?? null;
}
function tokensMatch(candidate, expected) {
  const candidateHash = createHash2("sha256").update(candidate).digest();
  const expectedHash = createHash2("sha256").update(expected).digest();
  return timingSafeEqual2(candidateHash, expectedHash);
}
function brevoEventKey(event) {
  const providerId = event.id == null ? "" : String(event.id);
  const messageId = String(event["message-id"] ?? event.messageId ?? "");
  const timestamp = String(
    event.ts_epoch ?? event.ts_event ?? event.ts ?? event.date ?? ""
  );
  const identity = [
    String(event.event ?? "unknown"),
    providerId,
    messageId,
    String(event.email ?? "").toLowerCase(),
    timestamp
  ].join("|");
  return createHash2("sha256").update(identity).digest("hex");
}

// server/routes/brevoWebhook.ts
var router13 = Router13();
function eventDate(event) {
  const milliseconds = Number(event.ts_epoch);
  if (Number.isFinite(milliseconds) && milliseconds > 0) {
    return new Date(milliseconds).toISOString();
  }
  const seconds = Number(event.ts_event ?? event.ts);
  if (Number.isFinite(seconds) && seconds > 0) {
    return new Date(seconds * 1e3).toISOString();
  }
  if (typeof event.date === "string" && !Number.isNaN(Date.parse(event.date))) {
    return new Date(event.date).toISOString();
  }
  return (/* @__PURE__ */ new Date()).toISOString();
}
function deliveryUpdate(eventType, at) {
  const normalized = eventType.toLowerCase();
  const update = {
    status: normalized,
    updated_at: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (normalized === "delivered") update.delivered_at = at;
  if (normalized === "opened" || normalized === "unique_opened")
    update.opened_at = at;
  if (normalized === "click" || normalized === "clicked")
    update.clicked_at = at;
  if ([
    "soft_bounce",
    "hard_bounce",
    "blocked",
    "invalid",
    "error",
    "complaint"
  ].includes(normalized)) {
    update.failed_at = at;
  }
  return update;
}
async function persistBrevoEvent(event) {
  const eventType = String(event.event ?? "unknown").toLowerCase();
  const messageId = String(event["message-id"] ?? event.messageId ?? "") || null;
  const campaignValue = event.campaignId ?? event.camp_id;
  const campaignId = Number.isInteger(Number(campaignValue)) ? Number(campaignValue) : null;
  const email = typeof event.email === "string" ? event.email.trim().toLowerCase() : null;
  const at = eventDate(event);
  const { data, error } = await supabase.from("brevo_email_events").upsert(
    {
      event_key: brevoEventKey(event),
      event_type: eventType,
      message_id: messageId,
      campaign_id: campaignId,
      email,
      event_at: at,
      payload: event
    },
    { onConflict: "event_key", ignoreDuplicates: true }
  ).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  const result = data ? "created" : "duplicate";
  let deliveryQuery = supabase.from("brevo_email_deliveries").update(deliveryUpdate(eventType, at));
  if (messageId) {
    deliveryQuery = deliveryQuery.eq("message_id", messageId);
  } else if (campaignId !== null) {
    deliveryQuery = deliveryQuery.eq("campaign_id", campaignId);
  } else {
    deliveryQuery = deliveryQuery.eq("recipient_email", email ?? "");
  }
  if (email && messageId) {
    deliveryQuery = deliveryQuery.eq("recipient_email", email);
  }
  const { error: deliveryError } = await deliveryQuery;
  if (deliveryError) throw new Error(deliveryError.message);
  if (email && [
    "unsubscribed",
    "unsubscribe",
    "hard_bounce",
    "hardbounce",
    "complaint",
    "spam",
    "blocked",
    "invalid"
  ].includes(eventType)) {
    const { error: subscriptionError } = await supabase.from("marketing_subscriptions").update({
      status: "unsubscribed",
      unsubscribed_at: at,
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    }).eq("email", email);
    if (subscriptionError) throw new Error(subscriptionError.message);
  }
  return result;
}
router13.post("/", async (req, res) => {
  try {
    const expected = await getBrevoWebhookToken();
    const candidate = bearerToken(req.header("authorization"));
    if (!candidate || !tokensMatch(candidate, expected)) {
      res.status(401).json({ error: "N\xE3o autorizado" });
      return;
    }
    const events = Array.isArray(req.body) ? req.body : [req.body];
    let created = 0;
    for (const event of events) {
      if (!event || typeof event !== "object" || typeof event.event !== "string") {
        continue;
      }
      if (await persistBrevoEvent(event) === "created") {
        created++;
      }
    }
    res.status(200).json({ received: true, created });
  } catch (error) {
    console.error("Erro no webhook Brevo:", error);
    res.status(500).json({ error: "Falha ao processar notifica\xE7\xE3o" });
  }
});
var brevoWebhook_default = router13;

// shared/schemas/cart.ts
import { z as z9 } from "zod";
var cartAddItemSchema = z9.object({
  productSlug: z9.string().min(1, "Produto inv\xE1lido"),
  quantity: z9.number().int().min(1, "Quantidade m\xEDnima \xE9 1").max(99),
  size: z9.string().min(1, "Selecione um tamanho"),
  color: z9.string().optional().default("")
});
var cartUpdateItemSchema = z9.object({
  quantity: z9.number().int().min(1, "Quantidade m\xEDnima \xE9 1").max(99)
});
var cartApplyCouponSchema = z9.object({
  couponCode: z9.string().max(50).optional().default("")
});

// server/routes/cart.ts
import { Router as Router14 } from "express";

// shared/lib/cartMapper.ts
function toNumber3(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  return 0;
}
function mapCartItemRowToCartItem(row, enrichment) {
  const unitPrice = toNumber3(row.unit_price);
  const quantity = row.quantity;
  return {
    id: row.id,
    cartId: row.cart_id,
    productId: row.product_id,
    quantity,
    sizeLabel: row.size_label,
    colorName: row.color_name,
    unitPrice,
    productName: row.product_name,
    productSlug: row.product_slug,
    productImage: row.product_image,
    productSku: row.product_sku,
    lineTotal: unitPrice * quantity,
    inStock: enrichment?.inStock ?? true,
    stockCount: enrichment?.stockCount ?? 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function buildCartSummary(items) {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  return {
    itemCount,
    subtotal,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    freeShippingRemaining,
    qualifiesForFreeShipping: subtotal >= FREE_SHIPPING_THRESHOLD
  };
}
function mapCartRowToCart(row, items) {
  return {
    id: row.id,
    customerId: row.customer_id,
    sessionId: row.session_id,
    status: row.status,
    couponCode: row.coupon_code,
    items,
    summary: buildCartSummary(items),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
function emptyCartResponse(cartRow) {
  return mapCartRowToCart(cartRow, []);
}

// shared/lib/slugify.ts
import { nanoid as nanoid2 } from "nanoid";
function slugify(text) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}

// server/services/products.ts
import { nanoid as nanoid3 } from "nanoid";
async function listProducts(category) {
  let query = supabase.from("products").select("*").order("id", { ascending: true });
  if (category) {
    query = query.eq("category", category);
  }
  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return data.map(mapProductRowToProduct);
}
async function getProductBySlug(slug) {
  const { data, error } = await supabase.from("products").select("*").eq("slug", slug).maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;
  return mapProductRowToProduct(data);
}
async function slugExists(slug, excludeSlug) {
  let query = supabase.from("products").select("slug", { count: "exact", head: true }).eq("slug", slug);
  if (excludeSlug) {
    query = query.neq("slug", excludeSlug);
  }
  const { count, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return (count ?? 0) > 0;
}
async function generateUniqueSlug(name, excludeSlug) {
  const base = slugify(name) || "produto";
  let candidate = base;
  while (await slugExists(candidate, excludeSlug)) {
    candidate = `${base}-${nanoid3(5).toLowerCase()}`;
  }
  return candidate;
}
async function createProduct(input) {
  const { data, error } = await supabase.from("products").insert(mapProductToRow(input)).select("*").single();
  if (error) {
    throw new Error(error.message);
  }
  return mapProductRowToProduct(data);
}
async function updateProduct(currentSlug, input) {
  const { data, error } = await supabase.from("products").update(mapProductToRow(input)).eq("slug", currentSlug).select("*").maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) return null;
  return mapProductRowToProduct(data);
}
async function deleteProduct(slug) {
  const { data, error } = await supabase.from("products").delete().eq("slug", slug).select("slug");
  if (error) {
    throw new Error(error.message);
  }
  return (data?.length ?? 0) > 0;
}
async function bulkUpsertProducts(inputs) {
  if (inputs.length === 0) {
    return { created: 0, updated: 0, total: 0 };
  }
  const slugs = inputs.map((input) => input.slug);
  const { data: existingRows, error: existingError } = await supabase.from("products").select("slug").in("slug", slugs);
  if (existingError) {
    throw new Error(existingError.message);
  }
  const existingSlugs = new Set((existingRows ?? []).map((row) => row.slug));
  const rows = inputs.map(mapProductToRow);
  const { error } = await supabase.from("products").upsert(rows, { onConflict: "slug" });
  if (error) {
    throw new Error(error.message);
  }
  const updated = slugs.filter((slug) => existingSlugs.has(slug)).length;
  const created = slugs.length - updated;
  return { created, updated, total: slugs.length };
}

// server/services/cart.ts
function normalizeColor(color) {
  return (color ?? "").trim();
}
function validateVariant(product, size, color) {
  if (!product.inStock || product.stockCount <= 0) {
    throw new Error("Produto esgotado");
  }
  const sizeMatch = product.sizes.find((s) => s.label === size);
  if (!sizeMatch) {
    throw new Error("Tamanho inv\xE1lido para este produto");
  }
  if (!sizeMatch.available) {
    throw new Error("Tamanho indispon\xEDvel");
  }
  if (product.colors.length > 0 && color) {
    const colorMatch = product.colors.some((c) => c.name === color);
    if (!colorMatch) {
      throw new Error("Cor inv\xE1lida para este produto");
    }
  }
}
function buildItemSnapshot(product, size, color) {
  return {
    product_id: product.id,
    size_label: size,
    color_name: color,
    unit_price: product.price,
    product_name: product.name,
    product_slug: product.slug,
    product_image: product.image,
    product_sku: product.sku
  };
}
async function fetchCartRow(identity) {
  if (identity.customerId) {
    const { data, error } = await supabase.from("carts").select("*").eq("customer_id", identity.customerId).eq("status", CART_STATUS_ACTIVE).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }
  if (identity.sessionId) {
    const { data, error } = await supabase.from("carts").select("*").eq("session_id", identity.sessionId).eq("status", CART_STATUS_ACTIVE).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }
  return null;
}
async function createCart(identity) {
  if (identity.customerId) {
    const { data: data2, error: error2 } = await supabase.from("carts").insert({
      customer_id: identity.customerId,
      session_id: null,
      status: CART_STATUS_ACTIVE
    }).select("*").single();
    if (error2) throw new Error(error2.message);
    return data2;
  }
  if (!identity.sessionId) {
    throw new Error("Sess\xE3o do carrinho inv\xE1lida");
  }
  const { data, error } = await supabase.from("carts").insert({
    customer_id: null,
    session_id: identity.sessionId,
    status: CART_STATUS_ACTIVE
  }).select("*").single();
  if (error) throw new Error(error.message);
  return data;
}
async function getOrCreateCartRow(identity) {
  const existing = await fetchCartRow(identity);
  if (existing) return existing;
  return createCart(identity);
}
async function fetchCartItems2(cartId) {
  const { data, error } = await supabase.from("cart_items").select("*").eq("cart_id", cartId).order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}
async function enrichCartItems(items) {
  if (items.length === 0) return [];
  const productIds = Array.from(new Set(items.map((item) => item.product_id)));
  const { data, error } = await supabase.from("products").select("id, in_stock, stock_count").in("id", productIds);
  if (error) throw new Error(error.message);
  const stockMap = /* @__PURE__ */ new Map();
  for (const row of data ?? []) {
    stockMap.set(row.id, {
      inStock: Boolean(row.in_stock),
      stockCount: Number(row.stock_count ?? 0)
    });
  }
  return items.map(
    (item) => mapCartItemRowToCartItem(item, stockMap.get(item.product_id) ?? { inStock: false, stockCount: 0 })
  );
}
async function buildCartResponse(cartRow) {
  const itemRows = await fetchCartItems2(cartRow.id);
  const items = await enrichCartItems(itemRows);
  return mapCartRowToCart(cartRow, items);
}
async function getCart(identity) {
  const cartRow = await fetchCartRow(identity);
  if (!cartRow) {
    if (identity.customerId || identity.sessionId) {
      const placeholder = {
        id: "00000000-0000-0000-0000-000000000000",
        customer_id: identity.customerId,
        session_id: identity.sessionId,
        status: CART_STATUS_ACTIVE,
        coupon_code: null,
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        updated_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      return emptyCartResponse(placeholder);
    }
    return emptyCartResponse({
      id: "00000000-0000-0000-0000-000000000000",
      customer_id: null,
      session_id: null,
      status: CART_STATUS_ACTIVE,
      coupon_code: null,
      created_at: (/* @__PURE__ */ new Date()).toISOString(),
      updated_at: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
  return buildCartResponse(cartRow);
}
async function addCartItem(identity, input) {
  const product = await getProductBySlug(input.productSlug);
  if (!product) {
    throw new Error("Produto n\xE3o encontrado");
  }
  const color = normalizeColor(input.color);
  validateVariant(product, input.size, color);
  if (input.quantity > product.stockCount) {
    throw new Error(`Estoque insuficiente. Dispon\xEDvel: ${product.stockCount}`);
  }
  const cartRow = await getOrCreateCartRow(identity);
  const existingItems = await fetchCartItems2(cartRow.id);
  const match = existingItems.find(
    (item) => item.product_id === product.id && item.size_label === input.size && item.color_name === color
  );
  if (match) {
    const newQuantity = match.quantity + input.quantity;
    if (newQuantity > product.stockCount) {
      throw new Error(`Estoque insuficiente. Dispon\xEDvel: ${product.stockCount}`);
    }
    const { error } = await supabase.from("cart_items").update({
      quantity: newQuantity,
      unit_price: product.price,
      product_name: product.name,
      product_slug: product.slug,
      product_image: product.image,
      product_sku: product.sku
    }).eq("id", match.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("cart_items").insert({
      cart_id: cartRow.id,
      quantity: input.quantity,
      ...buildItemSnapshot(product, input.size, color)
    });
    if (error) throw new Error(error.message);
  }
  return buildCartResponse(cartRow);
}
async function updateCartItemQuantity(identity, itemId, input) {
  const cartRow = await fetchCartRow(identity);
  if (!cartRow) {
    throw new Error("Carrinho n\xE3o encontrado");
  }
  const { data: item, error: itemError } = await supabase.from("cart_items").select("*").eq("id", itemId).eq("cart_id", cartRow.id).maybeSingle();
  if (itemError) throw new Error(itemError.message);
  if (!item) throw new Error("Item n\xE3o encontrado no carrinho");
  const { data: productRow, error: productError } = await supabase.from("products").select("*").eq("id", item.product_id).maybeSingle();
  if (productError) throw new Error(productError.message);
  if (!productRow) throw new Error("Produto n\xE3o encontrado");
  const product = mapProductRowToProduct(productRow);
  validateVariant(product, item.size_label, item.color_name);
  if (input.quantity > product.stockCount) {
    throw new Error(`Estoque insuficiente. Dispon\xEDvel: ${product.stockCount}`);
  }
  const { error } = await supabase.from("cart_items").update({
    quantity: input.quantity,
    unit_price: product.price,
    product_name: product.name,
    product_slug: product.slug,
    product_image: product.image,
    product_sku: product.sku
  }).eq("id", itemId);
  if (error) throw new Error(error.message);
  return buildCartResponse(cartRow);
}
async function removeCartItem(identity, itemId) {
  const cartRow = await fetchCartRow(identity);
  if (!cartRow) {
    throw new Error("Carrinho n\xE3o encontrado");
  }
  const { error } = await supabase.from("cart_items").delete().eq("id", itemId).eq("cart_id", cartRow.id);
  if (error) throw new Error(error.message);
  return buildCartResponse(cartRow);
}
async function clearCart(identity) {
  const cartRow = await fetchCartRow(identity);
  if (!cartRow) {
    return getCart(identity);
  }
  const { error } = await supabase.from("cart_items").delete().eq("cart_id", cartRow.id);
  if (error) throw new Error(error.message);
  return buildCartResponse(cartRow);
}
async function applyCartCoupon(identity, input) {
  const cartRow = await getOrCreateCartRow(identity);
  const couponCode = input.couponCode.trim() || null;
  const { error } = await supabase.from("carts").update({ coupon_code: couponCode }).eq("id", cartRow.id);
  if (error) throw new Error(error.message);
  const refreshed = await fetchCartRow(identity);
  if (!refreshed) throw new Error("Carrinho n\xE3o encontrado");
  return buildCartResponse(refreshed);
}
async function mergeGuestCartIntoCustomer(customerId, guestSessionId) {
  const customerIdentity = { customerId, sessionId: null };
  if (!guestSessionId) {
    return getCart(customerIdentity);
  }
  const { data: guestCart, error: guestError } = await supabase.from("carts").select("*").eq("session_id", guestSessionId).eq("status", CART_STATUS_ACTIVE).maybeSingle();
  if (guestError) throw new Error(guestError.message);
  if (!guestCart) {
    return getCart(customerIdentity);
  }
  const userCartRow = await getOrCreateCartRow(customerIdentity);
  const guestItems = await fetchCartItems2(guestCart.id);
  for (const guestItem of guestItems) {
    const { data: productRow } = await supabase.from("products").select("*").eq("id", guestItem.product_id).maybeSingle();
    if (!productRow) continue;
    const product = mapProductRowToProduct(productRow);
    try {
      validateVariant(product, guestItem.size_label, guestItem.color_name);
    } catch {
      continue;
    }
    const { data: existingItem } = await supabase.from("cart_items").select("*").eq("cart_id", userCartRow.id).eq("product_id", guestItem.product_id).eq("size_label", guestItem.size_label).eq("color_name", guestItem.color_name).maybeSingle();
    const mergedQuantity = (existingItem?.quantity ?? 0) + guestItem.quantity;
    const finalQuantity = Math.min(mergedQuantity, product.stockCount);
    if (finalQuantity <= 0) continue;
    if (existingItem) {
      await supabase.from("cart_items").update({
        quantity: finalQuantity,
        unit_price: product.price,
        product_name: product.name,
        product_slug: product.slug,
        product_image: product.image,
        product_sku: product.sku
      }).eq("id", existingItem.id);
    } else {
      await supabase.from("cart_items").insert({
        cart_id: userCartRow.id,
        quantity: finalQuantity,
        ...buildItemSnapshot(product, guestItem.size_label, guestItem.color_name)
      });
    }
  }
  if (guestCart.coupon_code && !userCartRow.coupon_code) {
    await supabase.from("carts").update({ coupon_code: guestCart.coupon_code }).eq("id", userCartRow.id);
  }
  await supabase.from("cart_items").delete().eq("cart_id", guestCart.id);
  await supabase.from("carts").delete().eq("id", guestCart.id);
  const refreshed = await fetchCartRow(customerIdentity);
  if (!refreshed) throw new Error("Carrinho n\xE3o encontrado");
  return buildCartResponse(refreshed);
}

// server/lib/cartSession.ts
import crypto3 from "node:crypto";
function generateCartSessionId() {
  return crypto3.randomUUID();
}
function getCartSessionFromCookie(cookies) {
  const value = cookies[CART_SESSION_COOKIE];
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
function setCartSessionCookie(res, sessionId) {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie(CART_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: CART_SESSION_MAX_AGE_MS,
    path: "/"
  });
}
function clearCartSessionCookie(res) {
  const isProduction = process.env.NODE_ENV === "production";
  res.cookie(CART_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: 0,
    path: "/"
  });
}

// server/middleware/resolveCartIdentity.ts
function getBearerToken(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  const [type, token] = header.split(" ");
  if (type?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}
async function resolveCartIdentity(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (token) {
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data?.user?.id) {
        req.cartIdentity = {
          customerId: data.user.id,
          sessionId: null
        };
        next();
        return;
      }
    }
    let sessionId = getCartSessionFromCookie(req.cookies ?? {});
    if (!sessionId) {
      sessionId = generateCartSessionId();
      setCartSessionCookie(res, sessionId);
    }
    req.cartIdentity = {
      customerId: null,
      sessionId
    };
    next();
  } catch (error) {
    next(error);
  }
}
async function requireCustomerForMerge(req, res, next) {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "N\xE3o autenticado" });
    return;
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    res.status(401).json({ error: "N\xE3o autenticado" });
    return;
  }
  req.cartIdentity = {
    customerId: data.user.id,
    sessionId: getCartSessionFromCookie(req.cookies ?? {})
  };
  next();
}

// server/routes/cart.ts
var router14 = Router14();
router14.use(resolveCartIdentity);
router14.get("/", async (req, res) => {
  try {
    const cart = await getCart(req.cartIdentity);
    res.json(cart);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar carrinho"
    });
  }
});
router14.post("/items", async (req, res) => {
  try {
    const parsed = cartAddItemSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inv\xE1lidos", issues: parsed.error.issues });
      return;
    }
    const cart = await addCartItem(req.cartIdentity, parsed.data);
    res.json(cart);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao adicionar item";
    const status = message.includes("n\xE3o encontrado") ? 404 : 400;
    res.status(status).json({ error: message });
  }
});
router14.patch("/items/:itemId", async (req, res) => {
  try {
    const parsed = cartUpdateItemSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inv\xE1lidos", issues: parsed.error.issues });
      return;
    }
    const cart = await updateCartItemQuantity(req.cartIdentity, req.params.itemId, parsed.data);
    res.json(cart);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar item";
    const status = message.includes("n\xE3o encontrado") ? 404 : 400;
    res.status(status).json({ error: message });
  }
});
router14.delete("/items/:itemId", async (req, res) => {
  try {
    const cart = await removeCartItem(req.cartIdentity, req.params.itemId);
    res.json(cart);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao remover item";
    const status = message.includes("n\xE3o encontrado") ? 404 : 400;
    res.status(status).json({ error: message });
  }
});
router14.delete("/", async (req, res) => {
  try {
    const cart = await clearCart(req.cartIdentity);
    res.json(cart);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao esvaziar carrinho"
    });
  }
});
router14.patch("/coupon", async (req, res) => {
  try {
    const parsed = cartApplyCouponSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inv\xE1lidos", issues: parsed.error.issues });
      return;
    }
    const cart = await applyCartCoupon(req.cartIdentity, parsed.data);
    res.json(cart);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao salvar cupom"
    });
  }
});
router14.post("/merge", requireCustomerForMerge, async (req, res) => {
  try {
    const customerId = req.cartIdentity.customerId;
    const guestSessionId = req.cartIdentity.sessionId;
    const cart = await mergeGuestCartIntoCustomer(customerId, guestSessionId);
    clearCartSessionCookie(res);
    res.json(cart);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao unificar carrinho"
    });
  }
});
var cart_default = router14;

// shared/lib/phoneBr.ts
function digitsOnly(value) {
  return value.replace(/\D/g, "");
}
function isValidPhoneBr(value) {
  const digits = digitsOnly(value);
  return digits.length === 10 || digits.length === 11;
}
function normalizePhoneBr(value) {
  return digitsOnly(value).slice(0, 11);
}

// shared/schemas/customer.ts
import { z as z10 } from "zod";
var customerProfileUpdateSchema = z10.object({
  fullName: z10.string().trim().min(2, "Informe seu nome completo").max(120, "Nome muito longo"),
  phone: z10.string().trim().optional().or(z10.literal("")).transform((value) => value ? normalizePhoneBr(value) : "").refine((value) => value === "" || isValidPhoneBr(value), {
    message: "Informe um telefone v\xE1lido com DDD"
  })
});

// server/routes/customers.ts
import { Router as Router15 } from "express";

// server/middleware/requireCustomer.ts
function getBearerToken2(req) {
  const header = req.headers.authorization;
  if (!header) return null;
  const [type, token] = header.split(" ");
  if (type?.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}
async function requireCustomer(req, res, next) {
  const token = getBearerToken2(req);
  if (!token) {
    res.status(401).json({ error: "N\xE3o autenticado" });
    return;
  }
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    res.status(401).json({ error: "N\xE3o autenticado" });
    return;
  }
  req.customerUserId = data.user.id;
  req.customerUser = data.user;
  next();
}

// server/routes/customers.ts
var router15 = Router15();
function getMetadataName(user) {
  const metadata = user.user_metadata ?? {};
  return String(metadata.full_name ?? metadata.fullName ?? "").trim();
}
function getMetadataPhone(user) {
  const metadata = user.user_metadata ?? {};
  const phone = metadata.phone;
  if (phone == null || phone === "") return null;
  return String(phone);
}
function mapCustomerProfileRowToCustomerProfile(row, user) {
  return {
    id: String(row.id),
    fullName: String(row.full_name ?? ""),
    phone: row.phone == null ? null : String(row.phone),
    email: user.email ?? "",
    emailVerified: Boolean(user.email_confirmed_at),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}
async function ensureProfileFromMetadata(userId, user, row) {
  const metadataName = getMetadataName(user);
  const metadataPhone = getMetadataPhone(user);
  const currentName = String(row.full_name ?? "").trim();
  const currentPhone = row.phone == null ? null : String(row.phone);
  const needsName = !currentName && metadataName;
  const needsPhone = !currentPhone && metadataPhone;
  if (!needsName && !needsPhone) {
    return row;
  }
  const { data, error } = await supabase.from("customer_profiles").update({
    full_name: needsName ? metadataName : currentName,
    phone: needsPhone ? metadataPhone : currentPhone
  }).eq("id", userId).select("*").single();
  if (error || !data) {
    return row;
  }
  return data;
}
router15.get("/me", requireCustomer, async (req, res) => {
  try {
    const userId = req.customerUserId;
    const user = req.customerUser;
    const { data, error } = await supabase.from("customer_profiles").select("*").eq("id", userId).maybeSingle();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    let profileRow = data;
    if (!profileRow) {
      const metadataName = getMetadataName(user);
      const metadataPhone = getMetadataPhone(user);
      const { data: created, error: insertError } = await supabase.from("customer_profiles").insert({
        id: userId,
        full_name: metadataName,
        phone: metadataPhone
      }).select("*").single();
      if (insertError) {
        res.status(500).json({ error: insertError.message });
        return;
      }
      profileRow = created;
    } else {
      profileRow = await ensureProfileFromMetadata(userId, user, profileRow);
    }
    res.json(mapCustomerProfileRowToCustomerProfile(profileRow, user));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Erro ao carregar perfil" });
  }
});
router15.put("/me", requireCustomer, async (req, res) => {
  try {
    const userId = req.customerUserId;
    const user = req.customerUser;
    const parsed = customerProfileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inv\xE1lidos", issues: parsed.error.issues });
      return;
    }
    const input = parsed.data;
    const { data, error } = await supabase.from("customer_profiles").update({
      full_name: input.fullName,
      phone: input.phone ? input.phone : null
    }).eq("id", userId).select("*").maybeSingle();
    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }
    if (!data) {
      res.status(404).json({ error: "Perfil n\xE3o encontrado" });
      return;
    }
    await supabase.auth.admin.updateUserById(userId, {
      user_metadata: {
        full_name: input.fullName,
        phone: input.phone ? input.phone : null
      }
    });
    const { data: refreshedUser } = await supabase.auth.admin.getUserById(userId);
    res.json(mapCustomerProfileRowToCustomerProfile(data, refreshedUser?.user ?? user));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "Erro ao atualizar perfil" });
  }
});
router15.get("/me/addresses", requireCustomer, async (req, res) => {
  try {
    const addresses = await listCustomerAddresses(req.customerUserId);
    res.json(addresses);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar endere\xE7os"
    });
  }
});
router15.post("/me/addresses", requireCustomer, async (req, res) => {
  try {
    const parsed = customerAddressSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inv\xE1lidos", issues: parsed.error.issues });
      return;
    }
    const address = await createCustomerAddress(req.customerUserId, parsed.data);
    res.status(201).json(address);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao salvar endere\xE7o"
    });
  }
});
router15.put("/me/addresses/:id", requireCustomer, async (req, res) => {
  try {
    const parsed = customerAddressUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inv\xE1lidos", issues: parsed.error.issues });
      return;
    }
    const address = await updateCustomerAddress(
      req.customerUserId,
      req.params.id,
      parsed.data
    );
    res.json(address);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao atualizar endere\xE7o";
    const status = message.includes("n\xE3o encontrado") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});
router15.patch("/me/addresses/:id/default", requireCustomer, async (req, res) => {
  try {
    const address = await setDefaultCustomerAddress(req.customerUserId, req.params.id);
    res.json(address);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao definir endere\xE7o padr\xE3o";
    const status = message.includes("n\xE3o encontrado") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});
router15.delete("/me/addresses/:id", requireCustomer, async (req, res) => {
  try {
    await deleteCustomerAddress(req.customerUserId, req.params.id);
    res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao excluir endere\xE7o";
    const status = message.includes("n\xE3o encontrado") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});
var customers_default = router15;

// server/routes/orders.ts
import { Router as Router16 } from "express";
var router16 = Router16();
router16.get("/me", requireCustomer, async (req, res) => {
  try {
    const orders = await listCustomerOrders(req.customerUserId);
    res.json(orders);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar pedidos"
    });
  }
});
router16.get("/:id", requireCustomer, async (req, res) => {
  try {
    const order = await getCustomerOrder(req.customerUserId, req.params.id);
    res.json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar pedido";
    const status = message.includes("not found") || message.includes("0 rows") ? 404 : 500;
    res.status(status).json({ error: "Pedido n\xE3o encontrado" });
  }
});
router16.post(
  "/checkout",
  requireCustomer,
  async (req, res) => {
    try {
      const parsed = checkoutSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Dados inv\xE1lidos", issues: parsed.error.issues });
        return;
      }
      const result = await createOrderFromCheckout(
        req.customerUserId,
        parsed.data
      );
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao finalizar compra";
      const status = message.includes("Carrinho vazio") || message.includes("inv\xE1lido") ? 400 : 500;
      res.status(status).json({ error: message });
    }
  }
);
var orders_default = router16;

// server/routes/mercadoPago.ts
import { Router as Router17 } from "express";
var router17 = Router17();
router17.get("/config", async (_req, res) => {
  try {
    res.json(await getMercadoPagoPublicConfig());
  } catch {
    res.status(503).json({ error: "Pagamento Mercado Pago indispon\xEDvel" });
  }
});
var mercadoPago_default = router17;

// server/routes/mercadoPagoWebhook.ts
import { Router as Router18 } from "express";
var router18 = Router18();
router18.post("/", async (req, res) => {
  const nestedDataId = req.query.data && typeof req.query.data === "object" && "id" in req.query.data && typeof req.query.data.id === "string" ? req.query.data.id : void 0;
  const signatureDataId = typeof req.query["data.id"] === "string" ? req.query["data.id"] : nestedDataId;
  const orderId = signatureDataId ?? String(req.body?.data?.id ?? "");
  const requestId = req.header("x-request-id") ?? void 0;
  const signature = req.header("x-signature") ?? void 0;
  try {
    const { data: attempt } = await supabase.from("payment_attempts").select("environment").eq("mercado_pago_order_id", orderId).maybeSingle();
    const environment = attempt?.environment;
    const valid = await verifyMercadoPagoSignature({
      dataId: signatureDataId,
      requestId,
      signature,
      environment
    });
    if (!valid) {
      res.status(401).json({ error: "Assinatura inv\xE1lida" });
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
      p_response: payload
    });
    if (error) throw new Error(error.message);
    if (reconciledOrderId) {
      await dispatchPaymentStatusEmail(
        String(reconciledOrderId),
        identity.status
      );
    }
    if (identity.status === "approved" && reconciledOrderId) {
      try {
        await ensurePaidOrderInMelhorEnvioCart(String(reconciledOrderId));
      } catch (shippingError) {
        console.error("Erro ao preparar etiqueta Melhor Envio:", shippingError);
      }
    }
    if (identity.instructions) {
      const { error: instructionsError } = await supabase.from("orders").update({
        payment_instructions: identity.instructions,
        payment_expires_at: identity.instructions.expirationDate ?? null
      }).eq("mercado_pago_order_id", identity.orderId);
      if (instructionsError) throw new Error(instructionsError.message);
    }
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Erro no webhook Mercado Pago:", error);
    res.status(500).json({ error: "Falha ao processar notifica\xE7\xE3o" });
  }
});
var mercadoPagoWebhook_default = router18;

// server/routes/newsletter.ts
import { Router as Router19 } from "express";
var router19 = Router19();
router19.post("/", async (req, res) => {
  const parsed = brevoNewsletterSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Dados inv\xE1lidos",
      issues: parsed.error.issues
    });
    return;
  }
  if (parsed.data.website?.trim()) {
    res.status(202).json({ subscribed: true });
    return;
  }
  try {
    const since = new Date(Date.now() - 10 * 60 * 1e3).toISOString();
    const { count, error: rateError } = await supabase.from("marketing_subscriptions").select("id", { count: "exact", head: true }).eq("consent_ip", req.ip).gte("consented_at", since);
    if (rateError) throw new Error(rateError.message);
    if ((count ?? 0) >= 10) {
      res.status(429).json({ error: "Muitas tentativas. Aguarde alguns minutos." });
      return;
    }
    await subscribeToNewsletter(parsed.data, {
      ip: req.ip,
      userAgent: req.header("user-agent")
    });
    res.status(202).json({ subscribed: true });
  } catch (error) {
    console.error("Erro ao registrar newsletter:", error);
    res.status(500).json({ error: "N\xE3o foi poss\xEDvel concluir a inscri\xE7\xE3o" });
  }
});
var newsletter_default = router19;

// shared/schemas/product.ts
import { z as z11 } from "zod";
var productCategorySchema = z11.enum(["Roupas", "Bolsas", "Acess\xF3rios"]);
var productColorSchema = z11.object({
  name: z11.string().min(1, "Informe o nome da cor"),
  hex: z11.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Cor inv\xE1lida (use o formato #RRGGBB)")
});
var productSizeSchema = z11.object({
  label: z11.string().min(1, "Informe o tamanho"),
  available: z11.boolean()
});
var productFaqSchema = z11.object({
  question: z11.string().min(1, "Informe a pergunta"),
  answer: z11.string().min(1, "Informe a resposta")
});
var productArtisanSchema = z11.object({
  name: z11.string(),
  region: z11.string(),
  story: z11.string()
});
var SLUG_PATTERN2 = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
var productSchema = z11.object({
  slug: z11.string().min(1, "Slug \xE9 obrigat\xF3rio").regex(SLUG_PATTERN2, "Use apenas letras min\xFAsculas, n\xFAmeros e h\xEDfens (ex: bolsa-de-praia)"),
  name: z11.string().min(2, "Informe o nome do produto"),
  category: productCategorySchema,
  price: z11.number({ error: "Informe um pre\xE7o v\xE1lido" }).nonnegative("O pre\xE7o n\xE3o pode ser negativo"),
  originalPrice: z11.number().nonnegative("O pre\xE7o original n\xE3o pode ser negativo").nullable(),
  image: z11.string().min(1, "Adicione ao menos uma imagem"),
  images: z11.array(z11.string().min(1)).min(1, "Adicione ao menos uma imagem"),
  badge: z11.string(),
  badgeColor: z11.string().min(1),
  rating: z11.number().min(0).max(5),
  reviews: z11.number().int().min(0),
  featured: z11.boolean(),
  shortDescription: z11.string(),
  description: z11.string(),
  materials: z11.array(z11.string()),
  careInstructions: z11.array(z11.string()),
  artisan: productArtisanSchema,
  sizes: z11.array(productSizeSchema),
  colors: z11.array(productColorSchema),
  sku: z11.string(),
  inStock: z11.boolean(),
  stockCount: z11.number().int().min(0),
  widthCm: z11.number().positive().max(200).nullable(),
  heightCm: z11.number().positive().max(200).nullable(),
  lengthCm: z11.number().positive().max(200).nullable(),
  weightKg: z11.number().positive().max(100).nullable(),
  faq: z11.array(productFaqSchema),
  highlights: z11.array(z11.string()),
  regionId: z11.string().trim().min(1).nullable().transform((value) => value == null || value === "" ? null : value)
});

// server/routes/products.ts
import { Router as Router20 } from "express";
var router20 = Router20();
router20.get("/", async (req, res) => {
  try {
    const category = typeof req.query.category === "string" ? req.query.category : void 0;
    const products = await listProducts(category);
    res.json(products);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar produtos"
    });
  }
});
router20.get("/:slug", async (req, res) => {
  try {
    const product = await getProductBySlug(req.params.slug);
    if (!product) {
      res.status(404).json({ error: "Produto n\xE3o encontrado" });
      return;
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar produto"
    });
  }
});
router20.post("/", requireAdmin, async (req, res) => {
  try {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inv\xE1lidos", issues: parsed.error.issues });
      return;
    }
    let input = parsed.data;
    if (!input.slug || await slugExists(input.slug)) {
      const uniqueSlug = await generateUniqueSlug(input.slug || input.name);
      input = { ...input, slug: uniqueSlug };
    }
    const product = await createProduct(input);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao criar produto"
    });
  }
});
router20.post("/bulk", requireAdmin, async (req, res) => {
  try {
    const items = Array.isArray(req.body?.products) ? req.body.products : null;
    if (!items) {
      res.status(400).json({ error: "Envie um array 'products'" });
      return;
    }
    const errors = [];
    const validItems = [];
    items.forEach((item, index) => {
      const parsed = productSchema.safeParse(item);
      if (!parsed.success) {
        errors.push({ index, issues: parsed.error.issues });
        return;
      }
      validItems.push(parsed.data);
    });
    if (validItems.length === 0) {
      res.status(400).json({ error: "Nenhum produto v\xE1lido para importar", errors });
      return;
    }
    const result = await bulkUpsertProducts(validItems);
    res.json({ ...result, errors });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao importar produtos"
    });
  }
});
router20.put("/:slug", requireAdmin, async (req, res) => {
  try {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inv\xE1lidos", issues: parsed.error.issues });
      return;
    }
    const currentSlug = req.params.slug;
    let input = parsed.data;
    if (input.slug !== currentSlug && await slugExists(input.slug, currentSlug)) {
      res.status(409).json({ error: "J\xE1 existe um produto com esse slug" });
      return;
    }
    const product = await updateProduct(currentSlug, input);
    if (!product) {
      res.status(404).json({ error: "Produto n\xE3o encontrado" });
      return;
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao atualizar produto"
    });
  }
});
router20.delete("/:slug", requireAdmin, async (req, res) => {
  try {
    const deleted = await deleteProduct(req.params.slug);
    if (!deleted) {
      res.status(404).json({ error: "Produto n\xE3o encontrado" });
      return;
    }
    res.status(204).end();
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao excluir produto"
    });
  }
});
var products_default = router20;

// server/routes/regions.ts
import { Router as Router21 } from "express";
var router21 = Router21();
router21.get("/", async (_req, res) => {
  try {
    const regions = await listRegions();
    res.json(regions);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar regi\xF5es"
    });
  }
});
router21.get("/:id", async (req, res) => {
  try {
    const region = await getRegionById(req.params.id);
    if (!region) {
      res.status(404).json({ error: "Regi\xE3o n\xE3o encontrada" });
      return;
    }
    res.json(region);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar regi\xE3o"
    });
  }
});
var regions_default = router21;

// server/routes/shipping.ts
import { Router as Router22 } from "express";
var router22 = Router22();
router22.get("/config", async (_req, res) => {
  try {
    res.json(await getPublicShippingConfig());
  } catch {
    res.json({ freeShippingEnabled: true, freeShippingThreshold: 299 });
  }
});
router22.post("/quote", async (req, res) => {
  try {
    const parsed = shippingQuoteSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inv\xE1lidos", issues: parsed.error.issues });
      return;
    }
    const result = await calculateShipping(parsed.data);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao calcular frete";
    const status = message.includes("n\xE3o conectado") || message.includes("CEP de origem") ? 503 : 500;
    res.status(status).json({ error: message });
  }
});
router22.post(
  "/checkout-quote",
  requireCustomer,
  async (req, res) => {
    try {
      const parsed = checkoutShippingQuoteSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "CEP inv\xE1lido", issues: parsed.error.issues });
        return;
      }
      const result = await createCheckoutShippingQuote(
        req.customerUserId,
        parsed.data.toPostalCode
      );
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao calcular frete";
      const status = message.includes("Carrinho vazio") ? 400 : 500;
      res.status(status).json({ error: message });
    }
  }
);
var shipping_default = router22;

// server/routes/seo.ts
import { Router as Router23 } from "express";

// shared/lib/seo.ts
function stripHtml(value) {
  return value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/\s+/g, " ").trim();
}
function truncateMeta(text, max = 160) {
  const clean = stripHtml(text);
  if (clean.length <= max) return clean;
  const sliced = clean.slice(0, max - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${(lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).trim()}\u2026`;
}
function escapeHtmlAttr(value) {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function absoluteUrl(baseUrl, pathOrUrl) {
  if (!pathOrUrl) return baseUrl;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = baseUrl.replace(/\/$/, "");
  const path2 = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${path2}`;
}

// server/lib/seoHtml.ts
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
function isSocialCrawler(userAgent) {
  if (!userAgent) return false;
  return /whatsapp|facebookexternalhit|facebot|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|pinterest|googlebot|bingbot|duckduckbot|embedly|quora link preview|outbrain|vkshare|w3c_validator|redditbot|applebot|ia_archiver/i.test(
    userAgent
  );
}
function resolveSpaHtmlPath() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    // Vercel includeFiles: api/spa.html (ao lado do bundle api/index.js)
    path.join(here, "spa.html"),
    path.join(process.cwd(), "spa.html"),
    path.join(process.cwd(), "api", "spa.html"),
    path.join(process.cwd(), "dist", "public", "index.html"),
    path.join(process.cwd(), "public", "index.html"),
    path.join(here, "..", "public", "index.html"),
    path.join(here, "..", "dist", "public", "index.html")
  ];
  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
    }
  }
  return null;
}
function loadSpaHtml() {
  const filePath = resolveSpaHtmlPath();
  if (!filePath) return null;
  return fs.readFileSync(filePath, "utf8");
}
async function loadSpaHtmlAsync(baseUrl) {
  const local = loadSpaHtml();
  if (local) return local;
  if (!baseUrl) return null;
  try {
    const origin = baseUrl.replace(/\/$/, "");
    const response = await fetch(`${origin}/index.html`, {
      headers: { Accept: "text/html" },
      redirect: "follow"
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}
function metaName(name, content) {
  return `<meta name="${escapeHtmlAttr(name)}" content="${escapeHtmlAttr(content)}" />`;
}
function metaProperty(property, content) {
  return `<meta property="${escapeHtmlAttr(property)}" content="${escapeHtmlAttr(content)}" />`;
}
function buildHeadBlock(options) {
  const title = options.title;
  const description = truncateMeta(options.description);
  const image = options.image;
  const type = options.type ?? "website";
  const robots = options.noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1";
  const tags = [
    `<title>${escapeHtmlAttr(title)}</title>`,
    metaName("description", description),
    metaName("robots", robots),
    metaName("googlebot", options.noIndex ? "noindex, nofollow" : "index, follow"),
    metaName("theme-color", SITE_THEME_COLOR),
    metaName("author", SITE_NAME),
    `<link rel="canonical" href="${escapeHtmlAttr(options.url)}" />`,
    metaProperty("og:locale", SITE_LOCALE),
    metaProperty("og:type", type === "product" ? "website" : type),
    metaProperty("og:site_name", SITE_NAME),
    metaProperty("og:title", title),
    metaProperty("og:description", description),
    metaProperty("og:url", options.url),
    metaProperty("og:image", image),
    metaProperty("og:image:secure_url", image),
    metaProperty("og:image:alt", title),
    metaName("twitter:card", "summary_large_image"),
    metaName("twitter:site", SITE_TWITTER_HANDLE),
    metaName("twitter:title", title),
    metaName("twitter:description", description),
    metaName("twitter:image", image)
  ];
  if (image.startsWith("https://")) {
    const path2 = image.split("?")[0]?.toLowerCase() ?? "";
    const mime = path2.endsWith(".png") ? "image/png" : path2.endsWith(".webp") ? "image/webp" : path2.endsWith(".gif") ? "image/gif" : "image/jpeg";
    tags.push(metaProperty("og:image:type", mime));
  }
  if (options.keywords) {
    tags.push(metaName("keywords", options.keywords));
  }
  if (options.product) {
    tags.push(metaProperty("product:price:amount", String(options.product.price)));
    tags.push(metaProperty("product:price:currency", options.product.currency ?? "BRL"));
    tags.push(
      metaProperty("product:availability", options.product.availability ?? "in stock")
    );
    tags.push(metaProperty("product:brand", options.product.brand ?? SITE_NAME));
  }
  if (options.jsonLd) {
    tags.push(
      `<script type="application/ld+json">${JSON.stringify(options.jsonLd).replace(/</g, "\\u003c")}</script>`
    );
  }
  return tags.join("\n    ");
}
function buildStandaloneOgHtml(options) {
  const block = buildHeadBlock(options);
  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    ${block}
  </head>
  <body>
    <article>
      <h1>${escapeHtmlAttr(options.title)}</h1>
      <p>${escapeHtmlAttr(truncateMeta(options.description))}</p>
      <p><a href="${escapeHtmlAttr(options.url)}">${escapeHtmlAttr(options.url)}</a></p>
    </article>
  </body>
</html>`;
}
function injectSeoIntoHtml(html, options) {
  const cleaned = html.replace(/<title>[\s\S]*?<\/title>/i, "").replace(/<meta\s+name=["']description["'][^>]*>/gi, "").replace(/<meta\s+name=["']robots["'][^>]*>/gi, "").replace(/<meta\s+name=["']googlebot["'][^>]*>/gi, "").replace(/<meta\s+name=["']keywords["'][^>]*>/gi, "").replace(/<meta\s+name=["']twitter:[^"']+["'][^>]*>/gi, "").replace(/<meta\s+property=["']og:[^"']+["'][^>]*>/gi, "").replace(/<meta\s+property=["']product:[^"']+["'][^>]*>/gi, "").replace(/<link\s+rel=["']canonical["'][^>]*>/gi, "").replace(/<script\s+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi, "");
  const block = buildHeadBlock(options);
  if (/<\/head>/i.test(cleaned)) {
    return cleaned.replace(/<\/head>/i, `    ${block}
  </head>`);
  }
  return `${block}
${cleaned}`;
}
function resolvePublicBaseUrl(reqHost, proto) {
  let fromEnv = (process.env.APP_URL || process.env.VITE_APP_URL || "").trim();
  if (fromEnv) {
    if (!/^https?:\/\//i.test(fromEnv)) fromEnv = `https://${fromEnv}`;
    return fromEnv.replace(/\/$/, "");
  }
  if (reqHost) {
    const scheme = proto === "http" ? "http" : "https";
    return `${scheme}://${reqHost}`;
  }
  return "";
}

// server/routes/seo.ts
var router23 = Router23();
function requestBaseUrl(req) {
  const proto = req.headers["x-forwarded-proto"]?.split(",")[0]?.trim();
  const host = req.headers["x-forwarded-host"]?.split(",")[0]?.trim() || req.headers.host;
  return resolvePublicBaseUrl(host, proto);
}
async function sendSeoHtml(req, res, options, status = 200) {
  const ua = req.headers["user-agent"];
  const crawler = isSocialCrawler(typeof ua === "string" ? ua : void 0);
  const spaHtml = await loadSpaHtmlAsync(requestBaseUrl(req));
  if (!spaHtml) {
    res.status(status).setHeader("Cache-Control", "private, no-store").setHeader("Vary", "User-Agent").type("html").send(
      crawler ? buildStandaloneOgHtml(options) : buildStandaloneOgHtml(options).replace(
        "</body>",
        `<p><a href="/">Abrir a Nativa Store</a></p>
    <script>
      // Evita ficar na p\xE1gina de fallback: vai \xE0 home (SPA) e o usu\xE1rio navega de novo.
      setTimeout(function () { location.replace("/"); }, 100);
    </script>
  </body>`
      )
    );
    return;
  }
  res.status(status).setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300").setHeader("Vary", "User-Agent").type("html").send(injectSeoIntoHtml(spaHtml, options));
}
router23.get("/produto/:slug", async (req, res) => {
  const slug = String(req.params.slug ?? "").trim();
  const baseUrl = requestBaseUrl(req);
  try {
    const product = slug ? await getProductBySlug(slug) : null;
    if (!product) {
      await sendSeoHtml(
        req,
        res,
        {
          title: `Produto n\xE3o encontrado \u2014 ${SITE_NAME}`,
          description: "Este produto n\xE3o est\xE1 dispon\xEDvel na Nativa Store.",
          url: absoluteUrl(baseUrl, `/produto/${encodeURIComponent(slug)}`),
          image: absoluteUrl(baseUrl, "/images/bannerNativa.jpg"),
          type: "website",
          noIndex: true
        },
        404
      );
      return;
    }
    const description = truncateMeta(
      stripHtml(product.shortDescription || product.description) || product.name
    );
    const image = absoluteUrl(
      baseUrl,
      product.image || product.images[0] || "/images/bannerNativa.jpg"
    );
    const url2 = absoluteUrl(baseUrl, `/produto/${product.slug}`);
    const title = `${product.name} \u2014 ${SITE_NAME}`;
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description,
      image: (product.images?.length ? product.images : [product.image]).map(
        (img) => absoluteUrl(baseUrl, img)
      ),
      sku: product.sku,
      category: product.category,
      brand: { "@type": "Brand", name: SITE_NAME },
      offers: {
        "@type": "Offer",
        url: url2,
        priceCurrency: "BRL",
        price: product.price,
        availability: product.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/NewCondition"
      }
    };
    await sendSeoHtml(req, res, {
      title,
      description,
      url: url2,
      image,
      type: "website",
      keywords: `${product.name}, ${product.category}, ${SITE_KEYWORDS}`,
      product: {
        price: product.price,
        currency: "BRL",
        availability: product.inStock ? "in stock" : "out of stock",
        brand: SITE_NAME
      },
      jsonLd
    });
  } catch (error) {
    console.error("[seo] falha ao montar meta do produto:", error);
    const spaHtml = await loadSpaHtmlAsync(baseUrl);
    if (spaHtml) {
      res.status(200).type("html").setHeader("Cache-Control", "no-store").send(spaHtml);
      return;
    }
    res.status(200).type("html").setHeader("Cache-Control", "private, no-store").send(
      buildStandaloneOgHtml({
        title: SITE_NAME,
        description: "Bolsas artesanais brasileiras feitas \xE0 m\xE3o.",
        url: absoluteUrl(baseUrl, `/produto/${encodeURIComponent(slug)}`),
        image: absoluteUrl(baseUrl, "/images/bannerNativa.jpg")
      })
    );
  }
});
router23.get("/sitemap.xml", async (req, res) => {
  const baseUrl = requestBaseUrl(req).replace(/\/$/, "");
  try {
    const products = await listProducts();
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const urls = [
      { loc: `${baseUrl}/`, priority: "1.0", changefreq: "daily" },
      ...products.map((product) => ({
        loc: `${baseUrl}/produto/${product.slug}`,
        priority: "0.8",
        changefreq: "weekly"
      }))
    ];
    const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(
      (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
    ).join("\n")}
</urlset>`;
    res.status(200).type("application/xml").setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400").send(body);
  } catch (error) {
    console.error("[seo] sitemap:", error);
    res.status(500).type("text/plain").send("Erro ao gerar sitemap");
  }
});
var seo_default = router23;

// server/app.ts
function vercelSeoRewrite(req, _res, next) {
  const querySlug = req.query.nativaSeoProduct;
  if (typeof querySlug === "string" && querySlug.trim()) {
    req.url = `/api/seo/produto/${encodeURIComponent(querySlug.trim())}`;
    next();
    return;
  }
  const pathOnly = (req.path || "").split("?")[0];
  const productMatch = pathOnly.match(/^\/produto\/([^/]+)\/?$/);
  if (productMatch?.[1]) {
    req.url = `/api/seo/produto/${encodeURIComponent(decodeURIComponent(productMatch[1]))}`;
    next();
    return;
  }
  if (pathOnly === "/sitemap.xml" || req.query.nativaSeoSitemap === "1" || req.query.nativaSeoSitemap === "true") {
    req.url = "/api/seo/sitemap.xml";
    next();
    return;
  }
  next();
}
function createApiApp() {
  const app2 = express();
  app2.use(vercelSeoRewrite);
  app2.use(express.json());
  app2.use(cookieParser());
  app2.use("/api/admin", admin_default);
  app2.use("/api/analytics", analytics_default);
  app2.use("/api/banners", banners_default);
  app2.use("/api/cart", cart_default);
  app2.use("/api/customers", customers_default);
  app2.use("/api/orders", orders_default);
  app2.use("/api/mercado-pago", mercadoPago_default);
  app2.use("/api/webhooks/mercado-pago", mercadoPagoWebhook_default);
  app2.use("/api/webhooks/brevo", brevoWebhook_default);
  app2.use("/api/newsletter", newsletter_default);
  app2.use("/api/products", products_default);
  app2.use("/api/regions", regions_default);
  app2.use("/api/shipping", shipping_default);
  app2.use("/api/seo", seo_default);
  return app2;
}

// server/vercel.ts
var app = createApiApp();
function handler(req, res) {
  return app(req, res);
}
export {
  handler as default
};
