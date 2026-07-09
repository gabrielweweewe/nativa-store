// server/app.ts
import cookieParser from "cookie-parser";
import express from "express";

// server/routes/admin.ts
import { Router } from "express";

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
var EXTENSION_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};
async function uploadProductImage(file) {
  const extension = EXTENSION_BY_MIME[file.mimetype] ?? "jpg";
  const path = `products/${Date.now()}-${nanoid(8)}.${extension}`;
  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, file.buffer, {
    contentType: file.mimetype,
    cacheControl: "31536000",
    upsert: false
  });
  if (error) {
    throw new Error(`Falha ao enviar imagem para o Supabase Storage: ${error.message}`);
  }
  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// server/routes/admin.ts
var router = Router();
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
router.post("/login", (req, res) => {
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
router.post("/logout", (_req, res) => {
  res.clearCookie(ADMIN_COOKIE_NAME, { path: "/" });
  res.json({ authenticated: false });
});
router.get("/me", requireAdmin, (_req, res) => {
  res.json({ authenticated: true });
});
router.post("/uploads", requireAdmin, handleSingleImageUpload, async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Nenhum arquivo enviado" });
      return;
    }
    const url2 = await uploadProductImage(req.file);
    res.json({ url: url2 });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao enviar imagem"
    });
  }
});
var admin_default = router;

// shared/schemas/cart.ts
import { z } from "zod";
var cartAddItemSchema = z.object({
  productSlug: z.string().min(1, "Produto inv\xE1lido"),
  quantity: z.number().int().min(1, "Quantidade m\xEDnima \xE9 1").max(99),
  size: z.string().min(1, "Selecione um tamanho"),
  color: z.string().optional().default("")
});
var cartUpdateItemSchema = z.object({
  quantity: z.number().int().min(1, "Quantidade m\xEDnima \xE9 1").max(99)
});
var cartApplyCouponSchema = z.object({
  couponCode: z.string().max(50).optional().default("")
});

// server/routes/cart.ts
import { Router as Router2 } from "express";

// shared/const/cart.ts
var FREE_SHIPPING_THRESHOLD = 299;
var STANDARD_SHIPPING_COST = 15;
function calculateShippingAmount(subtotal) {
  return subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST;
}
var CART_SESSION_COOKIE = "nativa_cart_session";
var CART_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1e3;
var CART_STATUS_ACTIVE = "active";

// shared/lib/cartMapper.ts
function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  return 0;
}
function mapCartItemRowToCartItem(row, enrichment) {
  const unitPrice = toNumber(row.unit_price);
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
async function fetchCartItems(cartId) {
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
  const itemRows = await fetchCartItems(cartRow.id);
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
  const existingItems = await fetchCartItems(cartRow.id);
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
  const guestItems = await fetchCartItems(guestCart.id);
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
import crypto2 from "node:crypto";
function generateCartSessionId() {
  return crypto2.randomUUID();
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
var router2 = Router2();
router2.use(resolveCartIdentity);
router2.get("/", async (req, res) => {
  try {
    const cart = await getCart(req.cartIdentity);
    res.json(cart);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar carrinho"
    });
  }
});
router2.post("/items", async (req, res) => {
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
router2.patch("/items/:itemId", async (req, res) => {
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
router2.delete("/items/:itemId", async (req, res) => {
  try {
    const cart = await removeCartItem(req.cartIdentity, req.params.itemId);
    res.json(cart);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao remover item";
    const status = message.includes("n\xE3o encontrado") ? 404 : 400;
    res.status(status).json({ error: message });
  }
});
router2.delete("/", async (req, res) => {
  try {
    const cart = await clearCart(req.cartIdentity);
    res.json(cart);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao esvaziar carrinho"
    });
  }
});
router2.patch("/coupon", async (req, res) => {
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
router2.post("/merge", requireCustomerForMerge, async (req, res) => {
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
var cart_default = router2;

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
import { z as z2 } from "zod";
var customerProfileUpdateSchema = z2.object({
  fullName: z2.string().trim().min(2, "Informe seu nome completo").max(120, "Nome muito longo"),
  phone: z2.string().trim().optional().or(z2.literal("")).transform((value) => value ? normalizePhoneBr(value) : "").refine((value) => value === "" || isValidPhoneBr(value), {
    message: "Informe um telefone v\xE1lido com DDD"
  })
});

// server/routes/customers.ts
import { Router as Router3 } from "express";

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
var router3 = Router3();
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
router3.get("/me", requireCustomer, async (req, res) => {
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
router3.put("/me", requireCustomer, async (req, res) => {
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
var customers_default = router3;

// shared/schemas/order.ts
import { z as z3 } from "zod";
function normalizeCep(value) {
  return value.replace(/\D/g, "").slice(0, 8);
}
var shippingAddressSchema = z3.object({
  cep: z3.string().trim().min(1, "Informe o CEP").transform(normalizeCep).refine((value) => value.length === 8, { message: "CEP deve ter 8 d\xEDgitos" }),
  rua: z3.string().trim().min(2, "Informe a rua").max(200, "Rua muito longa"),
  numero: z3.string().trim().min(1, "Informe o n\xFAmero").max(20, "N\xFAmero muito longo"),
  complemento: z3.string().trim().max(100, "Complemento muito longo").optional().transform((value) => value || void 0),
  bairro: z3.string().trim().min(2, "Informe o bairro").max(100, "Bairro muito longo"),
  cidade: z3.string().trim().min(2, "Informe a cidade").max(100, "Cidade muito longa"),
  estado: z3.string().trim().length(2, "Informe a UF com 2 letras").transform((value) => value.toUpperCase())
});
var checkoutSchema = z3.object({
  shippingAddress: shippingAddressSchema,
  paymentMethod: z3.enum(["pix", "credit_card", "boleto"])
});

// server/routes/orders.ts
import { Router as Router4 } from "express";

// shared/lib/orderMapper.ts
function toNumber2(value) {
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
    price: toNumber2(row.price),
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
    totalAmount: toNumber2(row.total_amount),
    shippingAmount: toNumber2(row.shipping_amount),
    couponCode: row.coupon_code,
    shippingAddress: row.shipping_address,
    paymentMethod: row.payment_method,
    items,
    createdAt: row.created_at
  };
}
function mapCartItemToOrderItemPayload(item) {
  return {
    product_slug: item.product_slug,
    name: item.product_name,
    quantity: item.quantity,
    price: toNumber2(item.unit_price),
    size: item.size_label,
    color: item.color_name || null,
    image: item.product_image
  };
}

// server/services/orders.ts
async function fetchCustomerCartRow(customerId) {
  const { data, error } = await supabase.from("carts").select("*").eq("customer_id", customerId).eq("status", CART_STATUS_ACTIVE).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
async function fetchCartItems2(cartId) {
  const { data, error } = await supabase.from("cart_items").select("*").eq("cart_id", cartId).order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}
async function fetchOrderWithItems(orderId) {
  const { data: orderRow, error: orderError } = await supabase.from("orders").select("*").eq("id", orderId).single();
  if (orderError) throw new Error(orderError.message);
  const { data: itemRows, error: itemsError } = await supabase.from("order_items").select("*").eq("order_id", orderId).order("id", { ascending: true });
  if (itemsError) throw new Error(itemsError.message);
  const items = (itemRows ?? []).map(mapOrderItemRowToOrderItem);
  return mapOrderRowToOrder(orderRow, items);
}
async function createOrderFromCheckout(customerId, input) {
  const cartRow = await fetchCustomerCartRow(customerId);
  if (!cartRow) {
    throw new Error("Carrinho vazio");
  }
  const cartItems = await fetchCartItems2(cartRow.id);
  if (cartItems.length === 0) {
    throw new Error("Carrinho vazio");
  }
  const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.unit_price) * item.quantity,
    0
  );
  const shippingAmount = calculateShippingAmount(subtotal);
  const totalAmount = subtotal + shippingAmount;
  const itemsPayload = cartItems.map(mapCartItemToOrderItemPayload);
  const { data, error } = await supabase.rpc("checkout_create_order", {
    p_customer_id: customerId,
    p_cart_id: cartRow.id,
    p_status: "paid",
    p_total_amount: totalAmount,
    p_shipping_amount: shippingAmount,
    p_coupon_code: cartRow.coupon_code,
    p_shipping_address: input.shippingAddress,
    p_payment_method: input.paymentMethod,
    p_items: itemsPayload
  });
  if (error) throw new Error(error.message);
  const orderRow = data;
  return fetchOrderWithItems(orderRow.id);
}

// server/routes/orders.ts
var router4 = Router4();
router4.post("/checkout", requireCustomer, async (req, res) => {
  try {
    const parsed = checkoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Dados inv\xE1lidos", issues: parsed.error.issues });
      return;
    }
    const order = await createOrderFromCheckout(req.customerUserId, parsed.data);
    res.json({ success: true, order });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao finalizar compra";
    const status = message.includes("Carrinho vazio") || message.includes("inv\xE1lido") ? 400 : 500;
    res.status(status).json({ error: message });
  }
});
var orders_default = router4;

// shared/schemas/product.ts
import { z as z4 } from "zod";
var productCategorySchema = z4.enum(["Roupas", "Bolsas", "Acess\xF3rios"]);
var productColorSchema = z4.object({
  name: z4.string().min(1, "Informe o nome da cor"),
  hex: z4.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Cor inv\xE1lida (use o formato #RRGGBB)")
});
var productSizeSchema = z4.object({
  label: z4.string().min(1, "Informe o tamanho"),
  available: z4.boolean()
});
var productFaqSchema = z4.object({
  question: z4.string().min(1, "Informe a pergunta"),
  answer: z4.string().min(1, "Informe a resposta")
});
var productArtisanSchema = z4.object({
  name: z4.string(),
  region: z4.string(),
  story: z4.string()
});
var SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
var productSchema = z4.object({
  slug: z4.string().min(1, "Slug \xE9 obrigat\xF3rio").regex(SLUG_PATTERN, "Use apenas letras min\xFAsculas, n\xFAmeros e h\xEDfens (ex: bolsa-de-praia)"),
  name: z4.string().min(2, "Informe o nome do produto"),
  category: productCategorySchema,
  price: z4.number({ error: "Informe um pre\xE7o v\xE1lido" }).nonnegative("O pre\xE7o n\xE3o pode ser negativo"),
  originalPrice: z4.number().nonnegative("O pre\xE7o original n\xE3o pode ser negativo").nullable(),
  image: z4.string().min(1, "Adicione ao menos uma imagem"),
  images: z4.array(z4.string().min(1)).min(1, "Adicione ao menos uma imagem"),
  badge: z4.string(),
  badgeColor: z4.string().min(1),
  rating: z4.number().min(0).max(5),
  reviews: z4.number().int().min(0),
  featured: z4.boolean(),
  shortDescription: z4.string(),
  description: z4.string(),
  materials: z4.array(z4.string()),
  careInstructions: z4.array(z4.string()),
  artisan: productArtisanSchema,
  sizes: z4.array(productSizeSchema),
  colors: z4.array(productColorSchema),
  sku: z4.string(),
  inStock: z4.boolean(),
  stockCount: z4.number().int().min(0),
  faq: z4.array(productFaqSchema),
  highlights: z4.array(z4.string())
});

// server/routes/products.ts
import { Router as Router5 } from "express";
var router5 = Router5();
router5.get("/", async (req, res) => {
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
router5.get("/:slug", async (req, res) => {
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
router5.post("/", requireAdmin, async (req, res) => {
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
router5.post("/bulk", requireAdmin, async (req, res) => {
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
router5.put("/:slug", requireAdmin, async (req, res) => {
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
router5.delete("/:slug", requireAdmin, async (req, res) => {
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
var products_default = router5;

// server/app.ts
function createApiApp() {
  const app2 = express();
  app2.use(express.json());
  app2.use(cookieParser());
  app2.use("/api/admin", admin_default);
  app2.use("/api/cart", cart_default);
  app2.use("/api/customers", customers_default);
  app2.use("/api/orders", orders_default);
  app2.use("/api/products", products_default);
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
