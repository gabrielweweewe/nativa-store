import { z } from "zod";
import { shippingAddressSchema } from "@shared/schemas/address";

export const checkoutSchema = z.object({
  shippingAddress: shippingAddressSchema,
  paymentMethod: z.enum(["pix", "credit_card", "boleto"]),
});

export const orderStatusUpdateSchema = z.object({
  status: z.enum(["pending", "paid", "canceled"]),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>;
