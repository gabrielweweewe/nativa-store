import { z } from "zod";

export const melhorEnvioEnvironmentSchema = z.enum(["production", "sandbox"]);

const postalCodeSchema = z
  .string()
  .transform((v) => v.replace(/\D/g, ""))
  .refine((v) => v === "" || v.length === 8, "CEP deve ter 8 dígitos");

export const melhorEnvioSettingsSchema = z.object({
  environment: melhorEnvioEnvironmentSchema.optional(),
  redirectUri: z
    .union([z.literal(""), z.string().url("Informe uma URL válida")])
    .optional(),
  userAgent: z
    .string()
    .min(5, "Informe o User-Agent (ex: Nativa Store (email@dominio.com))")
    .optional(),
  originPostalCode: postalCodeSchema.optional(),
  defaultWidthCm: z.number().positive("Largura deve ser positiva").max(200).optional(),
  defaultHeightCm: z.number().positive("Altura deve ser positiva").max(200).optional(),
  defaultLengthCm: z.number().positive("Comprimento deve ser positivo").max(200).optional(),
  defaultWeightKg: z.number().positive("Peso deve ser positivo").max(100).optional(),
  freeShippingEnabled: z.boolean().optional(),
  freeShippingThreshold: z
    .number()
    .positive("O valor mínimo deve ser maior que zero")
    .max(100000)
    .optional(),
  senderName: z.string().max(120).optional(),
  senderEmail: z.union([z.literal(""), z.string().email("E-mail inválido")]).optional(),
  senderPhone: z.string().max(20).optional(),
  senderDocumentType: z.enum(["cpf", "cnpj"]).optional(),
  senderDocument: z.string().max(18).optional(),
  senderStateRegister: z.string().max(30).optional(),
  senderAddress: z.string().max(160).optional(),
  senderNumber: z.string().max(20).optional(),
  senderComplement: z.string().max(80).optional(),
  senderDistrict: z.string().max(80).optional(),
  senderCity: z.string().max(80).optional(),
  senderStateAbbr: z.string().max(2).optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
});

export type MelhorEnvioSettingsParsed = z.infer<typeof melhorEnvioSettingsSchema>;

export const shippingQuoteProductSchema = z.object({
  id: z.string().min(1),
  width: z.number().positive().optional(),
  height: z.number().positive().optional(),
  length: z.number().positive().optional(),
  weight: z.number().positive().optional(),
  insuranceValue: z.number().nonnegative(),
  quantity: z.number().int().positive().default(1),
});

export const shippingQuoteSchema = z.object({
  toPostalCode: postalCodeSchema.refine((v) => v.length === 8, "CEP de destino inválido"),
  products: z.array(shippingQuoteProductSchema).min(1, "Informe ao menos um produto"),
  services: z.string().optional(),
  receipt: z.boolean().optional(),
  ownHand: z.boolean().optional(),
});

export const checkoutShippingQuoteSchema = z.object({
  toPostalCode: postalCodeSchema.refine((v) => v.length === 8, "CEP de destino inválido"),
});

export type ShippingQuoteInput = z.infer<typeof shippingQuoteSchema>;
export type CheckoutShippingQuoteInput = z.infer<typeof checkoutShippingQuoteSchema>;
