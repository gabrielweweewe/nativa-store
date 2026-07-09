import { z } from "zod";
import { shippingAddressSchema } from "@shared/schemas/address";

export const checkoutSchema = z.object({
  shippingAddress: shippingAddressSchema,
  paymentMethod: z.enum(["pix", "credit_card", "boleto"]),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
