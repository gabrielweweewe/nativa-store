import { z } from "zod";

export const mercadoPagoSettingsSchema = z.object({
  environment: z.enum(["test", "production"]),
  enabled: z.boolean(),
  publicKey: z.string().trim().max(300),
  accessToken: z.string().trim().max(500).optional(),
  webhookSecret: z.string().trim().max(500).optional(),
  pixEnabled: z.boolean(),
  boletoEnabled: z.boolean(),
  creditCardEnabled: z.boolean(),
  maxInstallments: z.number().int().min(1).max(12),
  boletoExpirationDays: z.number().int().min(1).max(30),
});

export const cardPaymentDataSchema = z.object({
  token: z.string().trim().min(1),
  paymentMethodId: z.string().trim().min(1).max(50),
  installments: z.number().int().min(1).max(12),
  issuerId: z.string().trim().max(50).optional(),
});

export type MercadoPagoSettingsSchemaInput = z.infer<
  typeof mercadoPagoSettingsSchema
>;
