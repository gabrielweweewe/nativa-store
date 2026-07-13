import type { CheckoutInput } from "@shared/schemas/order";
import type {
  CheckoutPaymentResult,
  MercadoPagoAdminStatus,
  MercadoPagoEnvironment,
  MercadoPagoPublicConfig,
  MercadoPagoSettingsInput,
  PaymentInstructions,
  PaymentStatus,
} from "@shared/types/mercadoPago";
import type { Order } from "@shared/types/order";
import { decryptSecret, encryptSecret } from "../lib/secretCrypto";
import { validateMercadoPagoSignature } from "../lib/mercadoPagoSignature";
import { supabase } from "../lib/supabase";

const API_URL = "https://api.mercadopago.com";

interface SettingsRow {
  environment: MercadoPagoEnvironment;
  enabled: boolean;
  public_key: string;
  access_token_encrypted: string | null;
  webhook_secret_encrypted: string | null;
  pix_enabled: boolean;
  boleto_enabled: boolean;
  credit_card_enabled: boolean;
  max_installments: number;
  boleto_expiration_days: number;
}

interface ActiveSettings extends SettingsRow {
  accessToken: string;
  webhookSecret: string;
}

export function getPublicAppUrl(): string {
  const raw =
    process.env.APP_URL?.trim() ||
    process.env.VITE_APP_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");
  const withProtocol = raw.startsWith("http") ? raw : `https://${raw}`;
  return withProtocol.replace(/\/$/, "");
}

export function getMercadoPagoWebhookUrl(): string {
  return `${getPublicAppUrl()}/api/webhooks/mercado-pago`;
}

async function getSettingsRow(
  environment: MercadoPagoEnvironment
): Promise<SettingsRow> {
  const { data, error } = await supabase
    .from("mercado_pago_settings")
    .select("*")
    .eq("environment", environment)
    .single();
  if (error) throw new Error(error.message);
  return data as SettingsRow;
}

async function getActiveSettings(): Promise<ActiveSettings> {
  const { data, error } = await supabase
    .from("mercado_pago_settings")
    .select("*")
    .eq("enabled", true)
    .order("environment", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Mercado Pago não está habilitado");
  const row = data as SettingsRow;
  if (
    !row.public_key ||
    !row.access_token_encrypted ||
    !row.webhook_secret_encrypted
  ) {
    throw new Error("Credenciais do Mercado Pago incompletas");
  }
  return {
    ...row,
    accessToken: decryptSecret(row.access_token_encrypted),
    webhookSecret: decryptSecret(row.webhook_secret_encrypted),
  };
}

async function getEnvironmentSettings(
  environment: MercadoPagoEnvironment
): Promise<ActiveSettings> {
  const row = await getSettingsRow(environment);
  if (!row.access_token_encrypted || !row.webhook_secret_encrypted) {
    throw new Error(
      `Credenciais do Mercado Pago incompletas em ${environment}`
    );
  }
  return {
    ...row,
    accessToken: decryptSecret(row.access_token_encrypted),
    webhookSecret: decryptSecret(row.webhook_secret_encrypted),
  };
}

export async function getActiveMercadoPagoEnvironment(): Promise<MercadoPagoEnvironment> {
  return (await getActiveSettings()).environment;
}

function toAdminStatus(row: SettingsRow): MercadoPagoAdminStatus {
  return {
    environment: row.environment,
    enabled: row.enabled,
    publicKey: row.public_key,
    pixEnabled: row.pix_enabled,
    boletoEnabled: row.boleto_enabled,
    creditCardEnabled: row.credit_card_enabled,
    maxInstallments: row.max_installments,
    boletoExpirationDays: row.boleto_expiration_days,
    hasAccessToken: Boolean(row.access_token_encrypted),
    hasWebhookSecret: Boolean(row.webhook_secret_encrypted),
    configured: Boolean(
      row.public_key &&
        row.access_token_encrypted &&
        row.webhook_secret_encrypted
    ),
    webhookUrl: getMercadoPagoWebhookUrl(),
  };
}

export async function getMercadoPagoAdminStatus(
  environment: MercadoPagoEnvironment
): Promise<MercadoPagoAdminStatus> {
  return toAdminStatus(await getSettingsRow(environment));
}

export async function updateMercadoPagoSettings(
  input: MercadoPagoSettingsInput
): Promise<MercadoPagoAdminStatus> {
  const current = await getSettingsRow(input.environment);
  const update: Record<string, unknown> = {
    enabled: input.enabled,
    public_key: input.publicKey.trim(),
    pix_enabled: input.pixEnabled,
    boleto_enabled: input.boletoEnabled,
    credit_card_enabled: input.creditCardEnabled,
    max_installments: input.maxInstallments,
    boleto_expiration_days: input.boletoExpirationDays,
    updated_at: new Date().toISOString(),
  };
  if (input.accessToken?.trim())
    update.access_token_encrypted = encryptSecret(input.accessToken.trim());
  if (input.webhookSecret?.trim()) {
    update.webhook_secret_encrypted = encryptSecret(input.webhookSecret.trim());
  }

  if (input.enabled) {
    const { error: disableError } = await supabase
      .from("mercado_pago_settings")
      .update({ enabled: false })
      .neq("environment", input.environment);
    if (disableError) throw new Error(disableError.message);
  }

  const { data, error } = await supabase
    .from("mercado_pago_settings")
    .update(update)
    .eq("environment", input.environment)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return toAdminStatus({ ...current, ...(data as SettingsRow) });
}

export async function getMercadoPagoPublicConfig(): Promise<MercadoPagoPublicConfig> {
  const settings = await getActiveSettings();
  const methods: MercadoPagoPublicConfig["methods"] = [];
  if (settings.pix_enabled) methods.push("pix");
  if (settings.credit_card_enabled) methods.push("credit_card");
  if (settings.boleto_enabled) methods.push("boleto");
  return {
    enabled: true,
    publicKey: settings.public_key,
    methods,
    maxInstallments: settings.max_installments,
  };
}

export function normalizeMercadoPagoStatus(value: unknown): PaymentStatus {
  const status = String(value ?? "pending").toLowerCase();
  if (status === "processed" || status === "accredited") return "approved";
  if (status === "failed") return "rejected";
  if (
    [
      "pending",
      "processing",
      "approved",
      "rejected",
      "canceled",
      "expired",
      "refunded",
    ].includes(status)
  ) {
    return status as PaymentStatus;
  }
  return "pending";
}

function firstPayment(payload: any): any {
  return (
    payload?.transactions?.payments?.[0] ??
    payload?.payments?.[0] ??
    payload?.payment ??
    {}
  );
}

function normalizeInstructions(payload: any): PaymentInstructions | null {
  const payment = firstPayment(payload);
  const transactionData =
    payment?.payment_method?.transaction_data ??
    payment?.point_of_interaction?.transaction_data ??
    payload?.point_of_interaction?.transaction_data ??
    {};
  const instructions: PaymentInstructions = {
    qrCode: transactionData.qr_code ?? payment?.payment_method?.qr_code,
    qrCodeBase64:
      transactionData.qr_code_base64 ?? payment?.payment_method?.qr_code_base64,
    ticketUrl:
      transactionData.ticket_url ??
      payment?.payment_method?.ticket_url ??
      payment?.transaction_details?.external_resource_url,
    barcode:
      payment?.payment_method?.digitable_line ??
      payment?.payment_method?.barcode_content ??
      payment?.payment_method?.barcode?.content ??
      payment?.barcode?.content,
    expirationDate:
      payment?.expiration_time ??
      payment?.date_of_expiration ??
      transactionData.expiration_date,
  };
  return Object.values(instructions).some(Boolean) ? instructions : null;
}

async function mercadoPagoRequest<T>(
  path: string,
  settings: ActiveSettings,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${settings.accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      body?.errors?.[0]?.message ??
      body?.message ??
      body?.error ??
      `Mercado Pago respondeu HTTP ${response.status}`;
    const error = new Error(String(message)) as Error & {
      payload?: unknown;
      status?: number;
    };
    error.payload = body;
    error.status = response.status;
    throw error;
  }
  return body as T;
}

export async function testMercadoPagoCredentials(
  environment: MercadoPagoEnvironment
): Promise<{ success: true }> {
  const row = await getSettingsRow(environment);
  if (!row.access_token_encrypted) throw new Error("Informe o Access Token");
  const settings = {
    ...row,
    accessToken: decryptSecret(row.access_token_encrypted),
    webhookSecret: row.webhook_secret_encrypted
      ? decryptSecret(row.webhook_secret_encrypted)
      : "",
  };
  await mercadoPagoRequest("/v1/payment_methods", settings);
  return { success: true };
}

export async function createMercadoPagoOrder(params: {
  order: Order;
  checkout: CheckoutInput;
  payer: { email: string; firstName?: string };
  environment?: MercadoPagoEnvironment;
}): Promise<{
  result: CheckoutPaymentResult;
  raw: any;
  environment: MercadoPagoEnvironment;
}> {
  const settings = params.environment
    ? await getEnvironmentSettings(params.environment)
    : await getActiveSettings();
  const methodEnabled =
    (params.checkout.paymentMethod === "pix" && settings.pix_enabled) ||
    (params.checkout.paymentMethod === "boleto" && settings.boleto_enabled) ||
    (params.checkout.paymentMethod === "credit_card" &&
      settings.credit_card_enabled);
  if (!methodEnabled) throw new Error("Forma de pagamento indisponível");

  const method =
    params.checkout.paymentMethod === "credit_card"
      ? {
          id: params.checkout.card!.paymentMethodId,
          type: "credit_card",
          token: params.checkout.card!.token,
          installments: Math.min(
            params.checkout.card!.installments,
            settings.max_installments
          ),
          ...(params.checkout.card!.issuerId
            ? { issuer_id: params.checkout.card!.issuerId }
            : {}),
        }
      : params.checkout.paymentMethod === "pix"
        ? { id: "pix", type: "bank_transfer" }
        : { id: "boleto", type: "ticket" };

  const address = params.checkout.shippingAddress;
  const payment: Record<string, unknown> = {
    amount: params.order.totalAmount.toFixed(2),
    payment_method: method,
  };
  if (params.checkout.paymentMethod === "boleto") {
    payment.expiration_time = `P${settings.boleto_expiration_days}D`;
  }

  const payload = {
    type: "online",
    processing_mode: "automatic",
    total_amount: params.order.totalAmount.toFixed(2),
    external_reference: params.order.id,
    payer: {
      email: params.payer.email,
      first_name: params.payer.firstName,
      identification: {
        type: "CPF",
        number: params.checkout.payer.identificationNumber,
      },
      address: {
        zip_code: address.cep.replace(/\D/g, ""),
        street_name: address.rua,
        street_number: address.numero,
        neighborhood: address.bairro,
        city: address.cidade,
        state: address.estado,
      },
    },
    transactions: { payments: [payment] },
  };

  const raw = await mercadoPagoRequest<any>("/v1/orders", settings, {
    method: "POST",
    headers: { "X-Idempotency-Key": params.checkout.idempotencyKey },
    body: JSON.stringify(payload),
  });
  const mpPayment = firstPayment(raw);
  const paymentStatus = normalizeMercadoPagoStatus(
    mpPayment?.status ?? raw?.status
  );
  const outcome =
    paymentStatus === "approved"
      ? "approved"
      : paymentStatus === "rejected"
        ? "rejected"
        : "pending";
  return {
    environment: settings.environment,
    raw,
    result: {
      outcome,
      orderId: params.order.id,
      paymentStatus,
      statusDetail: mpPayment?.status_detail ?? raw?.status_detail ?? null,
      instructions: normalizeInstructions(raw),
    },
  };
}

export async function getMercadoPagoOrder(
  mpOrderId: string,
  environment?: MercadoPagoEnvironment
): Promise<any> {
  const settings = environment
    ? await getEnvironmentSettings(environment)
    : await getActiveSettings();
  return mercadoPagoRequest(
    `/v1/orders/${encodeURIComponent(mpOrderId)}`,
    settings
  );
}

export function mercadoPagoOrderIdentity(payload: any): {
  orderId: string;
  paymentId: string | null;
  status: PaymentStatus;
  statusDetail: string | null;
  instructions: PaymentInstructions | null;
} {
  const payment = firstPayment(payload);
  return {
    orderId: String(payload?.id ?? ""),
    paymentId: payment?.id == null ? null : String(payment.id),
    status: normalizeMercadoPagoStatus(payment?.status ?? payload?.status),
    statusDetail: payment?.status_detail ?? payload?.status_detail ?? null,
    instructions: normalizeInstructions(payload),
  };
}

export async function verifyMercadoPagoSignature(params: {
  dataId: string;
  requestId?: string;
  signature?: string;
  environment?: MercadoPagoEnvironment;
}): Promise<boolean> {
  if (!params.signature || !params.dataId) return false;
  const settings = params.environment
    ? await getEnvironmentSettings(params.environment)
    : await getActiveSettings();
  return validateMercadoPagoSignature({
    ...params,
    secret: settings.webhookSecret,
  });
}
