export type MelhorEnvioEnvironment = "production" | "sandbox";

/** Status seguro para o admin (sem secrets/tokens). */
export interface MelhorEnvioStatus {
  environment: MelhorEnvioEnvironment;
  redirectUri: string;
  userAgent: string;
  originPostalCode: string;
  defaultWidthCm: number;
  defaultHeightCm: number;
  defaultLengthCm: number;
  defaultWeightKg: number;
  /** Credenciais do ambiente ativo */
  clientId: string;
  hasClientSecret: boolean;
  connected: boolean;
  tokenExpiresAt: string | null;
  /** Indica se o outro ambiente também tem app configurado */
  productionConfigured: boolean;
  sandboxConfigured: boolean;
  productionConnected: boolean;
  sandboxConnected: boolean;
}

export interface MelhorEnvioSettingsInput {
  environment?: MelhorEnvioEnvironment;
  redirectUri?: string;
  userAgent?: string;
  originPostalCode?: string;
  defaultWidthCm?: number;
  defaultHeightCm?: number;
  defaultLengthCm?: number;
  defaultWeightKg?: number;
  /** Client ID do ambiente ativo (ou de `environment` se enviado junto) */
  clientId?: string;
  /** Se vazio/omitido, mantém o secret atual */
  clientSecret?: string;
}

export interface ShippingQuoteOption {
  id: string;
  name: string;
  company: string;
  price: number;
  customPrice: number;
  deliveryTime: number;
  customDeliveryTime: number;
  currency: string;
  error?: string | null;
}

export interface ShippingQuoteResult {
  options: ShippingQuoteOption[];
  environment: MelhorEnvioEnvironment;
  freeShippingApplied: boolean;
}
