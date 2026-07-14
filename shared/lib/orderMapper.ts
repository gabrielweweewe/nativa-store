import type { ShippingAddress } from "@shared/types/address";
import type { PaymentInstructions } from "@shared/types/mercadoPago";
import type { Order, OrderItem, OrderSummary } from "@shared/types/order";
import type { MelhorEnvioEnvironment } from "@shared/types/melhorEnvio";

export interface OrderRow {
  id: string;
  customer_id: string | null;
  status: string;
  total_amount: number;
  shipping_amount: number;
  shipping_quote_id?: string | null;
  shipping_service_id?: string | null;
  shipping_service_name?: string | null;
  shipping_company?: string | null;
  shipping_delivery_days?: number | null;
  shipping_environment?: MelhorEnvioEnvironment | null;
  shipping_recipient?: Order["shippingRecipient"];
  coupon_code: string | null;
  shipping_address: ShippingAddress;
  payment_method: string;
  payment_status?: string;
  payment_status_detail?: string | null;
  payment_expires_at?: string | null;
  paid_at?: string | null;
  payment_instructions?: PaymentInstructions | null;
  fulfillment_status?: string;
  tracking_code?: string | null;
  tracking_url?: string | null;
  processing_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
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
    shippingQuoteId: row.shipping_quote_id ?? null,
    shippingServiceId: row.shipping_service_id ?? null,
    shippingServiceName: row.shipping_service_name ?? null,
    shippingCompany: row.shipping_company ?? null,
    shippingDeliveryDays:
      row.shipping_delivery_days == null ? null : Number(row.shipping_delivery_days),
    shippingEnvironment: row.shipping_environment ?? null,
    shippingRecipient: row.shipping_recipient ?? null,
    couponCode: row.coupon_code,
    shippingAddress: row.shipping_address,
    paymentMethod: row.payment_method as Order["paymentMethod"],
    paymentStatus: (row.payment_status ?? "pending") as Order["paymentStatus"],
    paymentStatusDetail: row.payment_status_detail ?? null,
    paymentExpiresAt: row.payment_expires_at ?? null,
    paidAt: row.paid_at ?? null,
    paymentInstructions: row.payment_instructions ?? null,
    fulfillmentStatus: (row.fulfillment_status ??
      "unfulfilled") as Order["fulfillmentStatus"],
    trackingCode: row.tracking_code ?? null,
    trackingUrl: row.tracking_url ?? null,
    processingAt: row.processing_at ?? null,
    shippedAt: row.shipped_at ?? null,
    deliveredAt: row.delivered_at ?? null,
    items,
    createdAt: row.created_at,
  };
}

export function mapOrderRowToSummary(
  row: OrderRow,
  itemCount: number
): OrderSummary {
  return {
    id: row.id,
    status: row.status as OrderSummary["status"],
    totalAmount: toNumber(row.total_amount),
    shippingAmount: toNumber(row.shipping_amount),
    couponCode: row.coupon_code,
    paymentMethod: row.payment_method as OrderSummary["paymentMethod"],
    paymentStatus: (row.payment_status ??
      "pending") as OrderSummary["paymentStatus"],
    fulfillmentStatus: (row.fulfillment_status ??
      "unfulfilled") as OrderSummary["fulfillmentStatus"],
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
