import { z } from "zod";

export const cartAddItemSchema = z.object({
  productSlug: z.string().min(1, "Produto inválido"),
  quantity: z.number().int().min(1, "Quantidade mínima é 1").max(99),
  size: z.string().min(1, "Selecione um tamanho"),
  color: z.string().optional().default(""),
});

export const cartUpdateItemSchema = z.object({
  quantity: z.number().int().min(1, "Quantidade mínima é 1").max(99),
});

export const cartApplyCouponSchema = z.object({
  couponCode: z.string().max(50).optional().default(""),
});

export type CartAddItemInput = z.infer<typeof cartAddItemSchema>;
export type CartUpdateItemInput = z.infer<typeof cartUpdateItemSchema>;
export type CartApplyCouponInput = z.infer<typeof cartApplyCouponSchema>;
