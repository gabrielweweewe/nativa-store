import type { OrderStatus, PaymentMethod } from "@shared/types/order";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendente",
  paid: "Confirmado",
  canceled: "Cancelado",
};

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-[#E8821A]/15 text-[#B86A12] ring-[#E8821A]/20",
  paid: "bg-[#2D6A4F]/12 text-[#2D6A4F] ring-[#2D6A4F]/20",
  canceled: "bg-[#8B6F5E]/15 text-[#6B5344] ring-[#8B6F5E]/20",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix",
  credit_card: "Cartão de crédito",
  boleto: "Boleto",
};

export function formatOrderShortId(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}
