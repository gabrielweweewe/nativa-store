import type { ShippingAddress } from "@shared/types/address";
import type { Order, OrderItem, OrderSummary } from "@shared/types/order";

export interface OrderRow {
  id: string;
  customer_id: string | null;
  status: string;
  total_amount: number;
  shipping_amount: number;
  coupon_code: string | null;
  shipping_address: ShippingAddress;
  payment_method: string;
  created_at: string;
}

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_slug: string;
  name: string;
  quantity: number;
  price: number;
  size: string;
  color: string | null;
  image: string;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  return 0;
}

export function buildOrderTotals(subtotal: number, shippingAmount: number) {
  return {
    subtotal,
    shippingAmount,
    totalAmount: subtotal + shippingAmount,
  };
}

export function mapOrderItemRowToOrderItem(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    orderId: row.order_id,
    productSlug: row.product_slug,
    name: row.name,
    quantity: row.quantity,
    price: toNumber(row.price),
    size: row.size,
    color: row.color,
    image: row.image,
  };
}

export function mapOrderRowToOrder(row: OrderRow, items: OrderItem[]): Order {
  return {
    id: row.id,
    customerId: row.customer_id,
    status: row.status as Order["status"],
    totalAmount: toNumber(row.total_amount),
    shippingAmount: toNumber(row.shipping_amount),
    couponCode: row.coupon_code,
    shippingAddress: row.shipping_address,
    paymentMethod: row.payment_method as Order["paymentMethod"],
    items,
    createdAt: row.created_at,
  };
}

export function mapOrderRowToSummary(row: OrderRow, itemCount: number): OrderSummary {
  return {
    id: row.id,
    status: row.status as OrderSummary["status"],
    totalAmount: toNumber(row.total_amount),
    shippingAmount: toNumber(row.shipping_amount),
    couponCode: row.coupon_code,
    paymentMethod: row.payment_method as OrderSummary["paymentMethod"],
    itemCount,
    createdAt: row.created_at,
  };
}

export function mapCartItemToOrderItemPayload(item: {
  product_slug: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  size_label: string;
  color_name: string;
  product_image: string;
}) {
  return {
    product_slug: item.product_slug,
    name: item.product_name,
    quantity: item.quantity,
    price: toNumber(item.unit_price),
    size: item.size_label,
    color: item.color_name || null,
    image: item.product_image,
  };
}
