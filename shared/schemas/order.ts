import { z } from "zod";
import { shippingAddressSchema } from "@shared/schemas/address";
import { cardPaymentDataSchema } from "@shared/schemas/mercadoPago";

function isValidCpf(value: string): boolean {
  if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) return false;
  const digit = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index++) {
      sum += Number(value[index]) * (length + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(value[9]) && digit(10) === Number(value[10]);
}

export const checkoutSchema = z
  .object({
    shippingAddress: shippingAddressSchema,
    paymentMethod: z.enum(["pix", "credit_card", "boleto"]),
    idempotencyKey: z.string().uuid(),
    payer: z.object({
      identificationNumber: z
        .string()
        .transform(value => value.replace(/\D/g, ""))
        .refine(isValidCpf, "Informe um CPF válido"),
    }),
    card: cardPaymentDataSchema.optional(),
  })
  .superRefine((value, context) => {
    if (value.paymentMethod === "credit_card" && !value.card) {
      context.addIssue({
        code: "custom",
        path: ["card"],
        message: "Os dados tokenizados do cartão são obrigatórios",
      });
    }
  });

export const orderStatusUpdateSchema = z.object({
  status: z.enum(["pending", "paid", "canceled"]),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type OrderStatusUpdateInput = z.infer<typeof orderStatusUpdateSchema>;
