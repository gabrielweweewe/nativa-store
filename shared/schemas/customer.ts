import { isValidPhoneBr, normalizePhoneBr } from "@shared/lib/phoneBr";
import { z } from "zod";

export const customerProfileUpdateSchema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome completo").max(120, "Nome muito longo"),
  phone: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .transform((value) => (value ? normalizePhoneBr(value) : ""))
    .refine((value) => value === "" || isValidPhoneBr(value), {
      message: "Informe um telefone válido com DDD",
    }),
});

export type CustomerProfileUpdateInput = z.infer<typeof customerProfileUpdateSchema>;
