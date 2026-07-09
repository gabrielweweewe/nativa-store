import { z } from "zod";

export function normalizeCep(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8);
}

export const shippingAddressSchema = z.object({
  cep: z
    .string()
    .trim()
    .min(1, "Informe o CEP")
    .transform(normalizeCep)
    .refine((value) => value.length === 8, { message: "CEP deve ter 8 dígitos" }),
  rua: z.string().trim().min(2, "Informe a rua").max(200, "Rua muito longa"),
  numero: z.string().trim().min(1, "Informe o número").max(20, "Número muito longo"),
  complemento: z
    .string()
    .trim()
    .max(100, "Complemento muito longo")
    .optional()
    .transform((value) => value || undefined),
  bairro: z.string().trim().min(2, "Informe o bairro").max(100, "Bairro muito longo"),
  cidade: z.string().trim().min(2, "Informe a cidade").max(100, "Cidade muito longa"),
  estado: z
    .string()
    .trim()
    .length(2, "Informe a UF com 2 letras")
    .transform((value) => value.toUpperCase()),
});

export const customerAddressSchema = shippingAddressSchema.extend({
  label: z.string().trim().min(1, "Informe um nome para o endereço").max(40, "Nome muito longo"),
  isDefault: z.boolean().optional().default(false),
});

export const customerAddressUpdateSchema = customerAddressSchema.partial();

export type CustomerAddressInput = z.infer<typeof customerAddressSchema>;
export type CustomerAddressUpdateInput = z.infer<typeof customerAddressUpdateSchema>;
