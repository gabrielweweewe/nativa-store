import { FREE_SHIPPING_THRESHOLD } from "@shared/const/cart";
import type { Cart, CartItem, CartSummary } from "@shared/types/cart";

export interface CartRow {
  id: string;
  customer_id: string | null;
  session_id: string | null;
  status: string;
  coupon_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartItemRow {
  id: string;
  cart_id: string;
  product_id: number;
  quantity: number;
  size_label: string;
  color_name: string;
  unit_price: number;
  product_name: string;
  product_slug: string;
  product_image: string;
  product_sku: string;
  created_at: string;
  updated_at: string;
}

export interface CartItemEnrichment {
  inStock: boolean;
  stockCount: number;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  return 0;
}

export function mapCartItemRowToCartItem(
  row: CartItemRow,
  enrichment?: CartItemEnrichment,
): CartItem {
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
    updatedAt: row.updated_at,
  };
}

export function buildCartSummary(items: CartItem[]): CartSummary {
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  return {
    itemCount,
    subtotal,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
    freeShippingRemaining,
    qualifiesForFreeShipping: subtotal >= FREE_SHIPPING_THRESHOLD,
  };
}

export function mapCartRowToCart(
  row: CartRow,
  items: CartItem[],
): Cart {
  return {
    id: row.id,
    customerId: row.customer_id,
    sessionId: row.session_id,
    status: row.status as Cart["status"],
    couponCode: row.coupon_code,
    items,
    summary: buildCartSummary(items),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function emptyCartResponse(cartRow: CartRow): Cart {
  return mapCartRowToCart(cartRow, []);
}
