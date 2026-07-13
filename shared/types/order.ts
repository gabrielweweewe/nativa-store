import type { ShippingAddress } from "@shared/types/address";
import type {
  CheckoutPaymentResult,
  PaymentInstructions,
  PaymentStatus,
} from "@shared/types/mercadoPago";

export type { ShippingAddress };

export type OrderStatus = "pending" | "paid" | "canceled";

export type PaymentMethod = "pix" | "credit_card" | "boleto";

export interface OrderItem {
  id: string;
  orderId: string;
  productSlug: string;
  name: string;
  quantity: number;
  price: number;
  size: string;
  color: string | null;
  image: string;
}

export interface Order {
  id: string;
  customerId: string | null;
  status: OrderStatus;
  totalAmount: number;
  shippingAmount: number;
  couponCode: string | null;
  shippingAddress: ShippingAddress;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentStatusDetail: string | null;
  paymentExpiresAt: string | null;
  paidAt: string | null;
  paymentInstructions: PaymentInstructions | null;
  items: OrderItem[];
  createdAt: string;
}

export interface CheckoutResponse {
  success: true;
  order: Order;
  payment: CheckoutPaymentResult;
}

export interface OrderSummary {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  shippingAmount: number;
  couponCode: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  itemCount: number;
  createdAt: string;
}

export interface AdminOrderSummary extends OrderSummary {
  customerId: string | null;
  customerName: string | null;
  customerEmail: string | null;
}

export interface AdminOrderDetail extends Order {
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
}
