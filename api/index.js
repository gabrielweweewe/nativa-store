// server/app.ts
import cookieParser from "cookie-parser";
import express from "express";

// server/routes/admin.ts
import { Router as Router8 } from "express";

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
var ALLOWED_MIME_TYPES = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp"]);
var MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(new Error("Formato de imagem n\xE3o suportado. Use JPG, PNG ou WEBP."));
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
var WEBP_QUALITY = 82;
var MAX_DIMENSION_BY_FOLDER = {
  products: 1600,
  banners: 2400
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
async function uploadProductImage(file, folder = "products") {
  let webpBuffer;
  try {
    webpBuffer = await toOptimizedWebp(file.buffer, folder);
  } catch {
    throw new Error("N\xE3o foi poss\xEDvel processar a imagem. Tente outro arquivo JPG, PNG ou WEBP.");
  }
  const path = `${folder}/${Date.now()}-${nanoid(8)}.webp`;
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, webpBuffer, {
    contentType: "image/webp",
    cacheControl: "31536000",
    upsert: false
  });
  if (error) {
    throw new Error(`Falha ao enviar imagem para o Supabase Storage: ${error.message}`);
  }
  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
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

// server/routes/adminCustomers.ts
import { Router as Router2 } from "express";

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
    couponCode: row.coupon_code,
    shippingAddress: row.shipping_address,
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status ?? "pending",
    paymentStatusDetail: row.payment_status_detail ?? null,
    paymentExpiresAt: row.payment_expires_at ?? null,
    paidAt: row.paid_at ?? null,
    paymentInstructions: row.payment_instructions ?? null,
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
  const { data, error } = await supabase.from("orders").select("customer_id, total_amount, status").not("customer_id", "is", null);
  if (error) throw new Error(error.message);
  for (const row of data ?? []) {
    if (!row.customer_id || row.status === "canceled") continue;
    const current = stats.get(row.customer_id) ?? { orderCount: 0, totalSpent: 0 };
    current.orderCount += 1;
    current.totalSpent += Number(row.total_amount);
    stats.set(row.customer_id, current);
  }
  return stats;
}
async function listAllCustomers() {
  const [profiles, orderStats] = await Promise.all([fetchAllProfiles(), fetchOrderStatsByCustomer()]);
  const authUsers = await fetchAuthUsersByIds(profiles.map((profile) => String(profile.id)));
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
  const [{ data: authData }, addresses, orders, orderStats] = await Promise.all([
    supabase.auth.admin.getUserById(customerId),
    listCustomerAddresses(customerId),
    listCustomerOrdersForAdmin(customerId),
    fetchOrderStatsByCustomer()
  ]);
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
  const { data: orderRows, error } = await supabase.from("orders").select("*").eq("customer_id", customerId).order("created_at", { ascending: false });
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
var router2 = Router2();
router2.get("/", requireAdmin, async (_req, res) => {
  try {
    const customers = await listAllCustomers();
    res.json(customers);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar clientes"
    });
  }
});
router2.get("/:id", requireAdmin, async (req, res) => {
  try {
    const customer = await getCustomerById(req.params.id);
    res.json(customer);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar cliente";
    const status = message.includes("n\xE3o encontrado") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});
var adminCustomers_default = router2;

// server/routes/adminDashboard.ts
import { Router as Router3 } from "express";

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
  const { data, error } = await supabase.from("orders").select("id, customer_id, status, total_amount, payment_method, created_at").order("created_at", { ascending: false });
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
  const staleBefore = new Date(Date.now() - ABANDONED_CART_HOURS * 60 * 60 * 1e3).toISOString();
  const { data: carts, error } = await supabase.from("carts").select("id, updated_at").eq("status", "active").lt("updated_at", staleBefore);
  if (error) throw new Error(error.message);
  if (!carts?.length) return { count: 0, value: 0 };
  const cartIds = carts.map((c) => c.id);
  const { data: items, error: itemsError } = await supabase.from("cart_items").select("cart_id, quantity, unit_price").in("cart_id", cartIds);
  if (itemsError) throw new Error(itemsError.message);
  const valueByCart = /* @__PURE__ */ new Map();
  for (const item of items ?? []) {
    const current = valueByCart.get(item.cart_id) ?? 0;
    valueByCart.set(item.cart_id, current + Number(item.quantity) * Number(item.unit_price));
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
  const revenuePrev = paidPrevPeriod.reduce((s, o) => s + Number(o.total_amount), 0);
  const ordersCount = paidInPeriod.length;
  const ordersPrev = paidPrevPeriod.length;
  const viewsInPeriod = pageViews.filter((v) => inRange(v.created_at, start));
  const viewsPrevPeriod = pageViews.filter(
    (v) => inRange(v.created_at, prevStart, prevEnd)
  );
  const uniqueSessions = new Set(viewsInPeriod.map((v) => v.session_id)).size;
  const uniqueSessionsPrev = new Set(viewsPrevPeriod.map((v) => v.session_id)).size;
  const newCustomers = customers.filter((c) => inRange(c.created_at, start)).length;
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
    revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + Number(order.total_amount));
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
  const filtered = orders.filter((o) => o.status === "paid" && inRange(o.created_at, start));
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
  const nameMap = new Map(customers.map((c) => [c.id, String(c.full_name ?? "")]));
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
var router3 = Router3();
var VALID_PERIODS = /* @__PURE__ */ new Set(["7d", "30d", "90d", "all"]);
router3.get("/", requireAdmin, async (req, res) => {
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
var adminDashboard_default = router3;

// shared/schemas/melhorEnvio.ts
import { z as z2 } from "zod";
var melhorEnvioEnvironmentSchema = z2.enum(["production", "sandbox"]);
var postalCodeSchema = z2.string().transform((v) => v.replace(/\D/g, "")).refine((v) => v === "" || v.length === 8, "CEP deve ter 8 d\xEDgitos");
var melhorEnvioSettingsSchema = z2.object({
  environment: melhorEnvioEnvironmentSchema.optional(),
  redirectUri: z2.union([z2.literal(""), z2.string().url("Informe uma URL v\xE1lida")]).optional(),
  userAgent: z2.string().min(5, "Informe o User-Agent (ex: Nativa Store (email@dominio.com))").optional(),
  originPostalCode: postalCodeSchema.optional(),
  defaultWidthCm: z2.number().positive("Largura deve ser positiva").max(200).optional(),
  defaultHeightCm: z2.number().positive("Altura deve ser positiva").max(200).optional(),
  defaultLengthCm: z2.number().positive("Comprimento deve ser positivo").max(200).optional(),
  defaultWeightKg: z2.number().positive("Peso deve ser positivo").max(100).optional(),
  clientId: z2.string().optional(),
  clientSecret: z2.string().optional()
});
var shippingQuoteProductSchema = z2.object({
  id: z2.string().min(1),
  width: z2.number().positive().optional(),
  height: z2.number().positive().optional(),
  length: z2.number().positive().optional(),
  weight: z2.number().positive().optional(),
  insuranceValue: z2.number().nonnegative(),
  quantity: z2.number().int().positive().default(1)
});
var shippingQuoteSchema = z2.object({
  toPostalCode: postalCodeSchema.refine((v) => v.length === 8, "CEP de destino inv\xE1lido"),
  products: z2.array(shippingQuoteProductSchema).min(1, "Informe ao menos um produto"),
  services: z2.string().optional(),
  receipt: z2.boolean().optional(),
  ownHand: z2.boolean().optional()
});

// server/routes/adminMelhorEnvio.ts
import { Router as Router4 } from "express";

// shared/const/cart.ts
var FREE_SHIPPING_THRESHOLD = 299;
var STANDARD_SHIPPING_COST = 15;
function calculateShippingAmount(subtotal) {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST;
}
var CART_SESSION_COOKIE = "nativa_cart_session";
var CART_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1e3;
var CART_STATUS_ACTIVE = "active";

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
async function calculateShipping(input) {
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
    error: item.error ?? null
  })).sort((a, b) => a.customPrice - b.customPrice);
  const subtotal = input.products.reduce(
    (sum, p) => sum + p.insuranceValue * p.quantity,
    0
  );
  const freeShippingApplied = subtotal >= FREE_SHIPPING_THRESHOLD;
  if (freeShippingApplied && options.length > 0) {
    const cheapestId = options[0].id;
    for (const option of options) {
      if (option.id === cheapestId) {
        option.customPrice = 0;
        option.price = 0;
      }
    }
  }
  return {
    options,
    environment: row.environment,
    freeShippingApplied
  };
}

// server/routes/adminMelhorEnvio.ts
var router4 = Router4();
function adminIntegrationsUrl(query) {
  const base = process.env.APP_URL?.trim() || process.env.VITE_APP_URL?.trim() || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000");
  const origin = base.replace(/\/$/, "").startsWith("http") ? base.replace(/\/$/, "") : `https://${base.replace(/\/$/, "")}`;
  const params = new URLSearchParams(query);
  return `${origin}/admin/integracoes?${params.toString()}`;
}
router4.get("/status", requireAdmin, async (_req, res) => {
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
router4.put("/settings", requireAdmin, async (req, res) => {
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
router4.get("/connect", requireAdmin, async (_req, res) => {
  try {
    const url2 = await buildAuthorizeUrl();
    res.redirect(url2);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao iniciar autoriza\xE7\xE3o";
    res.redirect(adminIntegrationsUrl({ me_error: message }));
  }
});
router4.get("/callback", async (req, res) => {
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
router4.post("/disconnect", requireAdmin, async (_req, res) => {
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
var adminMelhorEnvio_default = router4;

// shared/schemas/mercadoPago.ts
import { z as z3 } from "zod";
var mercadoPagoSettingsSchema = z3.object({
  environment: z3.enum(["test", "production"]),
  enabled: z3.boolean(),
  publicKey: z3.string().trim().max(300),
  accessToken: z3.string().trim().max(500).optional(),
  webhookSecret: z3.string().trim().max(500).optional(),
  pixEnabled: z3.boolean(),
  boletoEnabled: z3.boolean(),
  creditCardEnabled: z3.boolean(),
  maxInstallments: z3.number().int().min(1).max(12),
  boletoExpirationDays: z3.number().int().min(1).max(30)
});
var cardPaymentDataSchema = z3.object({
  token: z3.string().trim().min(1),
  paymentMethodId: z3.string().trim().min(1).max(50),
  installments: z3.number().int().min(1).max(12),
  issuerId: z3.string().trim().max(50).optional()
});

// server/routes/adminMercadoPago.ts
import { Router as Router5 } from "express";

// server/lib/secretCrypto.ts
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes
} from "node:crypto";
function encryptionKey() {
  const source = process.env.MERCADO_PAGO_ENCRYPTION_KEY?.trim();
  if (!source || source.length < 32) {
    throw new Error(
      "MERCADO_PAGO_ENCRYPTION_KEY deve ter pelo menos 32 caracteres"
    );
  }
  return createHash("sha256").update(source).digest();
}
function encryptSecret(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
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
function decryptSecret(value) {
  const [version, ivRaw, tagRaw, payloadRaw] = value.split(".");
  if (version !== "v1" || !ivRaw || !tagRaw || !payloadRaw) {
    throw new Error("Segredo criptografado inv\xE1lido");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivRaw, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagRaw, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(payloadRaw, "base64url")),
    decipher.final()
  ]).toString("utf8");
}

// server/lib/mercadoPagoSignature.ts
import { createHmac, timingSafeEqual } from "node:crypto";
function validateMercadoPagoSignature(params) {
  if (!params.signature || !params.dataId || !params.secret) return false;
  const parts = Object.fromEntries(
    params.signature.split(",").map((part) => {
      const [key, value] = part.trim().split("=", 2);
      return [key, value];
    })
  );
  if (!parts.ts || !parts.v1) return false;
  if (Math.abs((params.now ?? Date.now()) - Number(parts.ts)) > 5 * 60 * 1e3)
    return false;
  let manifest = `id:${params.dataId.toLowerCase()};`;
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
async function getSettingsRow(environment) {
  const { data, error } = await supabase.from("mercado_pago_settings").select("*").eq("environment", environment).single();
  if (error) throw new Error(error.message);
  return data;
}
async function getActiveSettings() {
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
  const row = await getSettingsRow(environment);
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
  return (await getActiveSettings()).environment;
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
  return toAdminStatus(await getSettingsRow(environment));
}
async function updateMercadoPagoSettings(input) {
  const current = await getSettingsRow(input.environment);
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
  const settings = await getActiveSettings();
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
  const instructions = {
    qrCode: transactionData.qr_code ?? payment?.payment_method?.qr_code,
    qrCodeBase64: transactionData.qr_code_base64 ?? payment?.payment_method?.qr_code_base64,
    ticketUrl: transactionData.ticket_url ?? payment?.payment_method?.ticket_url ?? payment?.transaction_details?.external_resource_url,
    barcode: payment?.payment_method?.digitable_line ?? payment?.payment_method?.barcode_content ?? payment?.payment_method?.barcode?.content ?? payment?.barcode?.content,
    expirationDate: payment?.expiration_time ?? payment?.date_of_expiration ?? transactionData.expiration_date
  };
  return Object.values(instructions).some(Boolean) ? instructions : null;
}
async function mercadoPagoRequest(path, settings, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${settings.accessToken}`,
      "Content-Type": "application/json",
      ...options.headers ?? {}
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.errors?.[0]?.message ?? body?.message ?? body?.error ?? `Mercado Pago respondeu HTTP ${response.status}`;
    const error = new Error(String(message));
    error.payload = body;
    error.status = response.status;
    throw error;
  }
  return body;
}
async function testMercadoPagoCredentials(environment) {
  const row = await getSettingsRow(environment);
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
  const settings = params.environment ? await getEnvironmentSettings(params.environment) : await getActiveSettings();
  const methodEnabled = params.checkout.paymentMethod === "pix" && settings.pix_enabled || params.checkout.paymentMethod === "boleto" && settings.boleto_enabled || params.checkout.paymentMethod === "credit_card" && settings.credit_card_enabled;
  if (!methodEnabled) throw new Error("Forma de pagamento indispon\xEDvel");
  const method = params.checkout.paymentMethod === "credit_card" ? {
    id: params.checkout.card.paymentMethodId,
    type: "credit_card",
    token: params.checkout.card.token,
    installments: Math.min(
      params.checkout.card.installments,
      settings.max_installments
    ),
    ...params.checkout.card.issuerId ? { issuer_id: params.checkout.card.issuerId } : {}
  } : params.checkout.paymentMethod === "pix" ? { id: "pix", type: "bank_transfer" } : { id: "boleto", type: "ticket" };
  const address = params.checkout.shippingAddress;
  const payment = {
    amount: params.order.totalAmount.toFixed(2),
    payment_method: method
  };
  if (params.checkout.paymentMethod === "boleto") {
    payment.expiration_time = `P${settings.boleto_expiration_days}D`;
  }
  const payload = {
    type: "online",
    processing_mode: "automatic",
    total_amount: params.order.totalAmount.toFixed(2),
    external_reference: params.order.id,
    payer: {
      email: params.payer.email,
      first_name: params.payer.firstName,
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
    },
    transactions: { payments: [payment] }
  };
  const raw = await mercadoPagoRequest("/v1/orders", settings, {
    method: "POST",
    headers: { "X-Idempotency-Key": params.checkout.idempotencyKey },
    body: JSON.stringify(payload)
  });
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
  const settings = environment ? await getEnvironmentSettings(environment) : await getActiveSettings();
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
  if (!params.signature || !params.dataId) return false;
  const settings = params.environment ? await getEnvironmentSettings(params.environment) : await getActiveSettings();
  return validateMercadoPagoSignature({
    ...params,
    secret: settings.webhookSecret
  });
}

// server/routes/adminMercadoPago.ts
var router5 = Router5();
function environmentFrom(value) {
  return value === "production" ? "production" : "test";
}
router5.get("/status", requireAdmin, async (req, res) => {
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
router5.put("/settings", requireAdmin, async (req, res) => {
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
router5.post("/test", requireAdmin, async (req, res) => {
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
var adminMercadoPago_default = router5;

// server/routes/adminNotifications.ts
import { Router as Router6 } from "express";

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
var router6 = Router6();
router6.get("/", requireAdmin, async (_req, res) => {
  try {
    const notifications = await listAdminNotifications();
    res.json(notifications);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar notifica\xE7\xF5es"
    });
  }
});
router6.get("/unread-count", requireAdmin, async (_req, res) => {
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
router6.patch("/read-all", requireAdmin, async (_req, res) => {
  try {
    await markAllNotificationsAsRead();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao marcar notifica\xE7\xF5es"
    });
  }
});
router6.patch("/:id/read", requireAdmin, async (req, res) => {
  try {
    const notification = await markNotificationAsRead(req.params.id);
    res.json(notification);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao marcar notifica\xE7\xE3o";
    const status = message.includes("n\xE3o encontrada") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});
var adminNotifications_default = router6;

// shared/schemas/order.ts
import { z as z5 } from "zod";

// shared/schemas/address.ts
import { z as z4 } from "zod";
function normalizeCep(value) {
  return value.replace(/\D/g, "").slice(0, 8);
}
var shippingAddressSchema = z4.object({
  cep: z4.string().trim().min(1, "Informe o CEP").transform(normalizeCep).refine((value) => value.length === 8, { message: "CEP deve ter 8 d\xEDgitos" }),
  rua: z4.string().trim().min(2, "Informe a rua").max(200, "Rua muito longa"),
  numero: z4.string().trim().min(1, "Informe o n\xFAmero").max(20, "N\xFAmero muito longo"),
  complemento: z4.string().trim().max(100, "Complemento muito longo").optional().transform((value) => value || void 0),
  bairro: z4.string().trim().min(2, "Informe o bairro").max(100, "Bairro muito longo"),
  cidade: z4.string().trim().min(2, "Informe a cidade").max(100, "Cidade muito longa"),
  estado: z4.string().trim().length(2, "Informe a UF com 2 letras").transform((value) => value.toUpperCase())
});
var customerAddressSchema = shippingAddressSchema.extend({
  label: z4.string().trim().min(1, "Informe um nome para o endere\xE7o").max(40, "Nome muito longo"),
  isDefault: z4.boolean().optional().default(false)
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
var checkoutSchema = z5.object({
  shippingAddress: shippingAddressSchema,
  paymentMethod: z5.enum(["pix", "credit_card", "boleto"]),
  idempotencyKey: z5.string().uuid(),
  payer: z5.object({
    identificationNumber: z5.string().transform((value) => value.replace(/\D/g, "")).refine(isValidCpf, "Informe um CPF v\xE1lido")
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
var orderStatusUpdateSchema = z5.object({
  status: z5.enum(["pending", "paid", "canceled"])
});

// server/routes/adminOrders.ts
import { Router as Router7 } from "express";

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
  const { data: orderRows, error } = await supabase.from("orders").select("*").eq("customer_id", customerId).order("created_at", { ascending: false });
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
  return fetchOrderWithItems(orderId, customerId);
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
    const shippingAmount = calculateShippingAmount(subtotal);
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
        p_environment: environment
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
  const { data: orderRows, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
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
  const customerInfo = await fetchCustomerInfo(order.customerId);
  return {
    ...order,
    customerName: customerInfo.name,
    customerEmail: customerInfo.email,
    customerPhone: customerInfo.phone
  };
}
async function updateOrderStatus(orderId, status) {
  const { data, error } = await supabase.from("orders").update({ status }).eq("id", orderId).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Pedido n\xE3o encontrado");
  return getOrderById(orderId);
}

// server/routes/adminOrders.ts
var router7 = Router7();
router7.get("/", requireAdmin, async (_req, res) => {
  try {
    const orders = await listAllOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar pedidos"
    });
  }
});
router7.get("/:id", requireAdmin, async (req, res) => {
  try {
    const order = await getOrderById(req.params.id);
    res.json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar pedido";
    const status = message.includes("n\xE3o encontrado") || message.includes("0 rows") ? 404 : 500;
    res.status(status).json({ error: "Pedido n\xE3o encontrado" });
  }
});
router7.patch("/:id/status", requireAdmin, async (req, res) => {
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
var adminOrders_default = router7;

// server/routes/admin.ts
var router8 = Router8();
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
router8.post("/login", (req, res) => {
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
router8.post("/logout", (_req, res) => {
  res.clearCookie(ADMIN_COOKIE_NAME, { path: "/" });
  res.json({ authenticated: false });
});
router8.get("/me", requireAdmin, (_req, res) => {
  res.json({ authenticated: true });
});
router8.use("/orders", adminOrders_default);
router8.use("/customers", adminCustomers_default);
router8.use("/notifications", adminNotifications_default);
router8.use("/dashboard", adminDashboard_default);
router8.use("/banners", adminBanners_default);
router8.use("/melhor-envio", adminMelhorEnvio_default);
router8.use("/mercado-pago", adminMercadoPago_default);
router8.post(
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
var admin_default = router8;

// server/routes/analytics.ts
import { Router as Router9 } from "express";

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
async function recordPageView(sessionId, path) {
  const normalizedPath = path.split("?")[0].slice(0, 500) || "/";
  const { error } = await supabase.from("store_page_views").insert({
    session_id: sessionId,
    path: normalizedPath
  });
  if (error) throw new Error(error.message);
}

// server/routes/analytics.ts
var router9 = Router9();
router9.post("/page-view", async (req, res) => {
  try {
    const path = typeof req.body?.path === "string" ? req.body.path : "/";
    if (path.startsWith("/admin")) {
      res.status(204).send();
      return;
    }
    let sessionId = getVisitorSessionFromCookie(req.cookies ?? {});
    if (!sessionId) {
      sessionId = generateVisitorSessionId();
      setVisitorSessionCookie(res, sessionId);
    }
    await recordPageView(sessionId, path);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao registrar visita"
    });
  }
});
var analytics_default = router9;

// server/routes/banners.ts
import { Router as Router10 } from "express";
var router10 = Router10();
router10.get("/", async (_req, res) => {
  try {
    const banners = await listActiveBanners();
    res.json(banners);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar banners"
    });
  }
});
var banners_default = router10;

// shared/schemas/cart.ts
import { z as z6 } from "zod";
var cartAddItemSchema = z6.object({
  productSlug: z6.string().min(1, "Produto inv\xE1lido"),
  quantity: z6.number().int().min(1, "Quantidade m\xEDnima \xE9 1").max(99),
  size: z6.string().min(1, "Selecione um tamanho"),
  color: z6.string().optional().default("")
});
var cartUpdateItemSchema = z6.object({
  quantity: z6.number().int().min(1, "Quantidade m\xEDnima \xE9 1").max(99)
});
var cartApplyCouponSchema = z6.object({
  couponCode: z6.string().max(50).optional().default("")
});

// server/routes/cart.ts
import { Router as Router11 } from "express";

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
    faq: asFaq(row.faq),
    highlights: asStringArray(row.highlights)
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
    faq: product.faq,
    highlights: product.highlights
  };
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
var router11 = Router11();
router11.use(resolveCartIdentity);
router11.get("/", async (req, res) => {
  try {
    const cart = await getCart(req.cartIdentity);
    res.json(cart);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar carrinho"
    });
  }
});
router11.post("/items", async (req, res) => {
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
router11.patch("/items/:itemId", async (req, res) => {
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
router11.delete("/items/:itemId", async (req, res) => {
  try {
    const cart = await removeCartItem(req.cartIdentity, req.params.itemId);
    res.json(cart);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao remover item";
    const status = message.includes("n\xE3o encontrado") ? 404 : 400;
    res.status(status).json({ error: message });
  }
});
router11.delete("/", async (req, res) => {
  try {
    const cart = await clearCart(req.cartIdentity);
    res.json(cart);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao esvaziar carrinho"
    });
  }
});
router11.patch("/coupon", async (req, res) => {
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
router11.post("/merge", requireCustomerForMerge, async (req, res) => {
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
var cart_default = router11;

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
import { z as z7 } from "zod";
var customerProfileUpdateSchema = z7.object({
  fullName: z7.string().trim().min(2, "Informe seu nome completo").max(120, "Nome muito longo"),
  phone: z7.string().trim().optional().or(z7.literal("")).transform((value) => value ? normalizePhoneBr(value) : "").refine((value) => value === "" || isValidPhoneBr(value), {
    message: "Informe um telefone v\xE1lido com DDD"
  })
});

// server/routes/customers.ts
import { Router as Router12 } from "express";

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
var router12 = Router12();
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
router12.get("/me", requireCustomer, async (req, res) => {
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
router12.put("/me", requireCustomer, async (req, res) => {
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
router12.get("/me/addresses", requireCustomer, async (req, res) => {
  try {
    const addresses = await listCustomerAddresses(req.customerUserId);
    res.json(addresses);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar endere\xE7os"
    });
  }
});
router12.post("/me/addresses", requireCustomer, async (req, res) => {
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
router12.put("/me/addresses/:id", requireCustomer, async (req, res) => {
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
router12.patch("/me/addresses/:id/default", requireCustomer, async (req, res) => {
  try {
    const address = await setDefaultCustomerAddress(req.customerUserId, req.params.id);
    res.json(address);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao definir endere\xE7o padr\xE3o";
    const status = message.includes("n\xE3o encontrado") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});
router12.delete("/me/addresses/:id", requireCustomer, async (req, res) => {
  try {
    await deleteCustomerAddress(req.customerUserId, req.params.id);
    res.status(204).send();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao excluir endere\xE7o";
    const status = message.includes("n\xE3o encontrado") ? 404 : 500;
    res.status(status).json({ error: message });
  }
});
var customers_default = router12;

// server/routes/orders.ts
import { Router as Router13 } from "express";
var router13 = Router13();
router13.get("/me", requireCustomer, async (req, res) => {
  try {
    const orders = await listCustomerOrders(req.customerUserId);
    res.json(orders);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar pedidos"
    });
  }
});
router13.get("/:id", requireCustomer, async (req, res) => {
  try {
    const order = await getCustomerOrder(req.customerUserId, req.params.id);
    res.json(order);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao carregar pedido";
    const status = message.includes("not found") || message.includes("0 rows") ? 404 : 500;
    res.status(status).json({ error: "Pedido n\xE3o encontrado" });
  }
});
router13.post(
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
var orders_default = router13;

// server/routes/mercadoPago.ts
import { Router as Router14 } from "express";
var router14 = Router14();
router14.get("/config", async (_req, res) => {
  try {
    res.json(await getMercadoPagoPublicConfig());
  } catch {
    res.status(503).json({ error: "Pagamento Mercado Pago indispon\xEDvel" });
  }
});
var mercadoPago_default = router14;

// server/routes/mercadoPagoWebhook.ts
import { Router as Router15 } from "express";
var router15 = Router15();
router15.post("/", async (req, res) => {
  const dataId = String(req.query["data.id"] ?? req.body?.data?.id ?? "");
  const requestId = req.header("x-request-id") ?? void 0;
  const signature = req.header("x-signature") ?? void 0;
  try {
    const { data: attempt } = await supabase.from("payment_attempts").select("environment").eq("mercado_pago_order_id", dataId).maybeSingle();
    const environment = attempt?.environment;
    const valid = await verifyMercadoPagoSignature({
      dataId,
      requestId,
      signature,
      environment
    });
    if (!valid) {
      res.status(401).json({ error: "Assinatura inv\xE1lida" });
      return;
    }
    const payload = await getMercadoPagoOrder(dataId, environment);
    const identity = mercadoPagoOrderIdentity(payload);
    const { error } = await supabase.rpc("reconcile_mercado_pago_payment", {
      p_mercado_pago_order_id: identity.orderId,
      p_mercado_pago_payment_id: identity.paymentId,
      p_payment_status: identity.status,
      p_status_detail: identity.statusDetail,
      p_response: payload
    });
    if (error) throw new Error(error.message);
    res.status(200).json({ received: true });
  } catch (error) {
    console.error("Erro no webhook Mercado Pago:", error);
    res.status(500).json({ error: "Falha ao processar notifica\xE7\xE3o" });
  }
});
var mercadoPagoWebhook_default = router15;

// shared/schemas/product.ts
import { z as z8 } from "zod";
var productCategorySchema = z8.enum(["Roupas", "Bolsas", "Acess\xF3rios"]);
var productColorSchema = z8.object({
  name: z8.string().min(1, "Informe o nome da cor"),
  hex: z8.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Cor inv\xE1lida (use o formato #RRGGBB)")
});
var productSizeSchema = z8.object({
  label: z8.string().min(1, "Informe o tamanho"),
  available: z8.boolean()
});
var productFaqSchema = z8.object({
  question: z8.string().min(1, "Informe a pergunta"),
  answer: z8.string().min(1, "Informe a resposta")
});
var productArtisanSchema = z8.object({
  name: z8.string(),
  region: z8.string(),
  story: z8.string()
});
var SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
var productSchema = z8.object({
  slug: z8.string().min(1, "Slug \xE9 obrigat\xF3rio").regex(SLUG_PATTERN, "Use apenas letras min\xFAsculas, n\xFAmeros e h\xEDfens (ex: bolsa-de-praia)"),
  name: z8.string().min(2, "Informe o nome do produto"),
  category: productCategorySchema,
  price: z8.number({ error: "Informe um pre\xE7o v\xE1lido" }).nonnegative("O pre\xE7o n\xE3o pode ser negativo"),
  originalPrice: z8.number().nonnegative("O pre\xE7o original n\xE3o pode ser negativo").nullable(),
  image: z8.string().min(1, "Adicione ao menos uma imagem"),
  images: z8.array(z8.string().min(1)).min(1, "Adicione ao menos uma imagem"),
  badge: z8.string(),
  badgeColor: z8.string().min(1),
  rating: z8.number().min(0).max(5),
  reviews: z8.number().int().min(0),
  featured: z8.boolean(),
  shortDescription: z8.string(),
  description: z8.string(),
  materials: z8.array(z8.string()),
  careInstructions: z8.array(z8.string()),
  artisan: productArtisanSchema,
  sizes: z8.array(productSizeSchema),
  colors: z8.array(productColorSchema),
  sku: z8.string(),
  inStock: z8.boolean(),
  stockCount: z8.number().int().min(0),
  faq: z8.array(productFaqSchema),
  highlights: z8.array(z8.string())
});

// server/routes/products.ts
import { Router as Router16 } from "express";
var router16 = Router16();
router16.get("/", async (req, res) => {
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
router16.get("/:slug", async (req, res) => {
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
router16.post("/", requireAdmin, async (req, res) => {
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
router16.post("/bulk", requireAdmin, async (req, res) => {
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
router16.put("/:slug", requireAdmin, async (req, res) => {
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
router16.delete("/:slug", requireAdmin, async (req, res) => {
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
var products_default = router16;

// server/routes/shipping.ts
import { Router as Router17 } from "express";
var router17 = Router17();
router17.post("/quote", async (req, res) => {
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
var shipping_default = router17;

// server/app.ts
function createApiApp() {
  const app2 = express();
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
  app2.use("/api/products", products_default);
  app2.use("/api/shipping", shipping_default);
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
