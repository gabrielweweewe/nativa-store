import type { PaymentMethod } from "@shared/types/order";

export type MercadoPagoEnvironment = "test" | "production";
export type PaymentStatus =
  | "pending"
  | "processing"
  | "approved"
  | "rejected"
  | "canceled"
  | "expired"
  | "refunded";

export interface MercadoPagoSettingsInput {
  environment: MercadoPagoEnvironment;
  enabled: boolean;
  publicKey: string;
  accessToken?: string;
  webhookSecret?: string;
  pixEnabled: boolean;
  boletoEnabled: boolean;
  creditCardEnabled: boolean;
  maxInstallments: number;
  boletoExpirationDays: number;
}

export interface MercadoPagoAdminStatus
  extends Omit<MercadoPagoSettingsInput, "accessToken" | "webhookSecret"> {
  hasAccessToken: boolean;
  hasWebhookSecret: boolean;
  configured: boolean;
  webhookUrl: string;
}

export interface MercadoPagoPublicConfig {
  enabled: boolean;
  publicKey: string;
  methods: PaymentMethod[];
  maxInstallments: number;
}

export interface CardPaymentData {
  token: string;
  paymentMethodId: string;
  installments: number;
  issuerId?: string;
}

export interface PaymentInstructions {
  qrCode?: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  barcode?: string;
  expirationDate?: string;
}

export interface CheckoutPaymentResult {
  outcome: "approved" | "pending" | "rejected";
  orderId: string;
  paymentStatus: PaymentStatus;
  statusDetail: string | null;
  instructions: PaymentInstructions | null;
}
