import {
  emptyCartResponse,
  mapCartItemRowToCartItem,
  mapCartRowToCart,
  type CartItemRow,
  type CartRow,
} from "@shared/lib/cartMapper";
import { mapProductRowToProduct, type ProductRow } from "@shared/lib/productMapper";
import { CART_STATUS_ACTIVE } from "@shared/const/cart";
import type { CartAddItemInput, CartApplyCouponInput, CartUpdateItemInput } from "@shared/schemas/cart";
import type { Cart } from "@shared/types/cart";
import type { Product } from "@shared/types/product";
import type { CartIdentity } from "../middleware/resolveCartIdentity";
import { supabase } from "../lib/supabase";
import { getProductBySlug } from "./products";

function normalizeColor(color?: string): string {
  return (color ?? "").trim();
}

function validateVariant(product: Product, size: string, color: string): void {
  if (!product.inStock || product.stockCount <= 0) {
    throw new Error("Produto esgotado");
  }

  const sizeMatch = product.sizes.find((s) => s.label === size);
  if (!sizeMatch) {
    throw new Error("Tamanho inválido para este produto");
  }
  if (!sizeMatch.available) {
    throw new Error("Tamanho indisponível");
  }

  if (product.colors.length > 0 && color) {
    const colorMatch = product.colors.some((c) => c.name === color);
    if (!colorMatch) {
      throw new Error("Cor inválida para este produto");
    }
  }
}

function buildItemSnapshot(product: Product, size: string, color: string) {
  return {
    product_id: product.id,
    size_label: size,
    color_name: color,
    unit_price: product.price,
    product_name: product.name,
    product_slug: product.slug,
    product_image: product.image,
    product_sku: product.sku,
  };
}

async function fetchCartRow(identity: CartIdentity): Promise<CartRow | null> {
  if (identity.customerId) {
    const { data, error } = await supabase
      .from("carts")
      .select("*")
      .eq("customer_id", identity.customerId)
      .eq("status", CART_STATUS_ACTIVE)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as CartRow | null;
  }

  if (identity.sessionId) {
    const { data, error } = await supabase
      .from("carts")
      .select("*")
      .eq("session_id", identity.sessionId)
      .eq("status", CART_STATUS_ACTIVE)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data as CartRow | null;
  }

  return null;
}

async function createCart(identity: CartIdentity): Promise<CartRow> {
  if (identity.customerId) {
    const { data, error } = await supabase
      .from("carts")
      .insert({
        customer_id: identity.customerId,
        session_id: null,
        status: CART_STATUS_ACTIVE,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message);
    return data as CartRow;
  }

  if (!identity.sessionId) {
    throw new Error("Sessão do carrinho inválida");
  }

  const { data, error } = await supabase
    .from("carts")
    .insert({
      customer_id: null,
      session_id: identity.sessionId,
      status: CART_STATUS_ACTIVE,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as CartRow;
}

async function getOrCreateCartRow(identity: CartIdentity): Promise<CartRow> {
  const existing = await fetchCartRow(identity);
  if (existing) return existing;
  return createCart(identity);
}

async function fetchCartItems(cartId: string): Promise<CartItemRow[]> {
  const { data, error } = await supabase
    .from("cart_items")
    .select("*")
    .eq("cart_id", cartId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []) as CartItemRow[];
}

async function enrichCartItems(items: CartItemRow[]): Promise<ReturnType<typeof mapCartItemRowToCartItem>[]> {
  if (items.length === 0) return [];

  const productIds = Array.from(new Set(items.map((item) => item.product_id)));

  const { data, error } = await supabase
    .from("products")
    .select("id, in_stock, stock_count")
    .in("id", productIds);

  if (error) throw new Error(error.message);

  const stockMap = new Map<number, { inStock: boolean; stockCount: number }>();
  for (const row of data ?? []) {
    stockMap.set(row.id, {
      inStock: Boolean(row.in_stock),
      stockCount: Number(row.stock_count ?? 0),
    });
  }

  return items.map((item) =>
    mapCartItemRowToCartItem(item, stockMap.get(item.product_id) ?? { inStock: false, stockCount: 0 }),
  );
}

async function buildCartResponse(cartRow: CartRow): Promise<Cart> {
  const itemRows = await fetchCartItems(cartRow.id);
  const items = await enrichCartItems(itemRows);
  return mapCartRowToCart(cartRow, items);
}

export async function getCart(identity: CartIdentity): Promise<Cart> {
  const cartRow = await fetchCartRow(identity);
  if (!cartRow) {
    if (identity.customerId || identity.sessionId) {
      const placeholder: CartRow = {
        id: "00000000-0000-0000-0000-000000000000",
        customer_id: identity.customerId,
        session_id: identity.sessionId,
        status: CART_STATUS_ACTIVE,
        coupon_code: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      return emptyCartResponse(placeholder);
    }
    return emptyCartResponse({
      id: "00000000-0000-0000-0000-000000000000",
      customer_id: null,
      session_id: null,
      status: CART_STATUS_ACTIVE,
      coupon_code: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  return buildCartResponse(cartRow);
}

export async function addCartItem(identity: CartIdentity, input: CartAddItemInput): Promise<Cart> {
  const product = await getProductBySlug(input.productSlug);
  if (!product) {
    throw new Error("Produto não encontrado");
  }

  const color = normalizeColor(input.color);
  validateVariant(product, input.size, color);

  if (input.quantity > product.stockCount) {
    throw new Error(`Estoque insuficiente. Disponível: ${product.stockCount}`);
  }

  const cartRow = await getOrCreateCartRow(identity);
  const existingItems = await fetchCartItems(cartRow.id);

  const match = existingItems.find(
    (item) =>
      item.product_id === product.id &&
      item.size_label === input.size &&
      item.color_name === color,
  );

  if (match) {
    const newQuantity = match.quantity + input.quantity;
    if (newQuantity > product.stockCount) {
      throw new Error(`Estoque insuficiente. Disponível: ${product.stockCount}`);
    }

    const { error } = await supabase
      .from("cart_items")
      .update({
        quantity: newQuantity,
        unit_price: product.price,
        product_name: product.name,
        product_slug: product.slug,
        product_image: product.image,
        product_sku: product.sku,
      })
      .eq("id", match.id);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("cart_items").insert({
      cart_id: cartRow.id,
      quantity: input.quantity,
      ...buildItemSnapshot(product, input.size, color),
    });

    if (error) throw new Error(error.message);
  }

  return buildCartResponse(cartRow);
}

export async function updateCartItemQuantity(
  identity: CartIdentity,
  itemId: string,
  input: CartUpdateItemInput,
): Promise<Cart> {
  const cartRow = await fetchCartRow(identity);
  if (!cartRow) {
    throw new Error("Carrinho não encontrado");
  }

  const { data: item, error: itemError } = await supabase
    .from("cart_items")
    .select("*")
    .eq("id", itemId)
    .eq("cart_id", cartRow.id)
    .maybeSingle();

  if (itemError) throw new Error(itemError.message);
  if (!item) throw new Error("Item não encontrado no carrinho");

  const { data: productRow, error: productError } = await supabase
    .from("products")
    .select("*")
    .eq("id", item.product_id)
    .maybeSingle();

  if (productError) throw new Error(productError.message);
  if (!productRow) throw new Error("Produto não encontrado");

  const product = mapProductRowToProduct(productRow as ProductRow);
  validateVariant(product, item.size_label, item.color_name);

  if (input.quantity > product.stockCount) {
    throw new Error(`Estoque insuficiente. Disponível: ${product.stockCount}`);
  }

  const { error } = await supabase
    .from("cart_items")
    .update({
      quantity: input.quantity,
      unit_price: product.price,
      product_name: product.name,
      product_slug: product.slug,
      product_image: product.image,
      product_sku: product.sku,
    })
    .eq("id", itemId);

  if (error) throw new Error(error.message);

  return buildCartResponse(cartRow);
}

export async function removeCartItem(identity: CartIdentity, itemId: string): Promise<Cart> {
  const cartRow = await fetchCartRow(identity);
  if (!cartRow) {
    throw new Error("Carrinho não encontrado");
  }

  const { error } = await supabase
    .from("cart_items")
    .delete()
    .eq("id", itemId)
    .eq("cart_id", cartRow.id);

  if (error) throw new Error(error.message);

  return buildCartResponse(cartRow);
}

export async function clearCart(identity: CartIdentity): Promise<Cart> {
  const cartRow = await fetchCartRow(identity);
  if (!cartRow) {
    return getCart(identity);
  }

  const { error } = await supabase.from("cart_items").delete().eq("cart_id", cartRow.id);
  if (error) throw new Error(error.message);

  return buildCartResponse(cartRow);
}

export async function applyCartCoupon(
  identity: CartIdentity,
  input: CartApplyCouponInput,
): Promise<Cart> {
  const cartRow = await getOrCreateCartRow(identity);
  const couponCode = input.couponCode.trim() || null;

  const { error } = await supabase
    .from("carts")
    .update({ coupon_code: couponCode })
    .eq("id", cartRow.id);

  if (error) throw new Error(error.message);

  const refreshed = await fetchCartRow(identity);
  if (!refreshed) throw new Error("Carrinho não encontrado");

  return buildCartResponse(refreshed);
}

export async function mergeGuestCartIntoCustomer(
  customerId: string,
  guestSessionId: string | null,
): Promise<Cart> {
  const customerIdentity: CartIdentity = { customerId, sessionId: null };

  if (!guestSessionId) {
    return getCart(customerIdentity);
  }

  const { data: guestCart, error: guestError } = await supabase
    .from("carts")
    .select("*")
    .eq("session_id", guestSessionId)
    .eq("status", CART_STATUS_ACTIVE)
    .maybeSingle();

  if (guestError) throw new Error(guestError.message);

  if (!guestCart) {
    return getCart(customerIdentity);
  }

  const userCartRow = await getOrCreateCartRow(customerIdentity);
  const guestItems = await fetchCartItems(guestCart.id);

  for (const guestItem of guestItems) {
    const { data: productRow } = await supabase
      .from("products")
      .select("*")
      .eq("id", guestItem.product_id)
      .maybeSingle();

    if (!productRow) continue;

    const product = mapProductRowToProduct(productRow as ProductRow);

    try {
      validateVariant(product, guestItem.size_label, guestItem.color_name);
    } catch {
      continue;
    }

    const { data: existingItem } = await supabase
      .from("cart_items")
      .select("*")
      .eq("cart_id", userCartRow.id)
      .eq("product_id", guestItem.product_id)
      .eq("size_label", guestItem.size_label)
      .eq("color_name", guestItem.color_name)
      .maybeSingle();

    const mergedQuantity = (existingItem?.quantity ?? 0) + guestItem.quantity;
    const finalQuantity = Math.min(mergedQuantity, product.stockCount);

    if (finalQuantity <= 0) continue;

    if (existingItem) {
      await supabase
        .from("cart_items")
        .update({
          quantity: finalQuantity,
          unit_price: product.price,
          product_name: product.name,
          product_slug: product.slug,
          product_image: product.image,
          product_sku: product.sku,
        })
        .eq("id", existingItem.id);
    } else {
      await supabase.from("cart_items").insert({
        cart_id: userCartRow.id,
        quantity: finalQuantity,
        ...buildItemSnapshot(product, guestItem.size_label, guestItem.color_name),
      });
    }
  }

  if (guestCart.coupon_code && !userCartRow.coupon_code) {
    await supabase
      .from("carts")
      .update({ coupon_code: guestCart.coupon_code })
      .eq("id", userCartRow.id);
  }

  await supabase.from("cart_items").delete().eq("cart_id", guestCart.id);
  await supabase.from("carts").delete().eq("id", guestCart.id);

  const refreshed = await fetchCartRow(customerIdentity);
  if (!refreshed) throw new Error("Carrinho não encontrado");

  return buildCartResponse(refreshed);
}
