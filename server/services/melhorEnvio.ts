import type {
  MelhorEnvioEnvironment,
  MelhorEnvioSettingsInput,
  MelhorEnvioStatus,
  ShippingQuoteOption,
  ShippingQuoteResult,
} from "@shared/types/melhorEnvio";
import type { ShippingQuoteInput } from "@shared/schemas/melhorEnvio";
import {
  applyFreeShipping,
  groupShipmentVolumes,
} from "@shared/lib/shipping";
import jwt from "jsonwebtoken";
import { supabase } from "../lib/supabase";

const SETTINGS_ID = "default";

/** Todas as permissões — próximos módulos (etiquetas, carrinho, etc.) já autorizados. */
export const MELHOR_ENVIO_SCOPES = [
  "cart-read",
  "cart-write",
  "companies-read",
  "companies-write",
  "coupons-read",
  "coupons-write",
  "notifications-read",
  "orders-read",
  "products-read",
  "products-write",
  "purchases-read",
  "shipping-calculate",
  "shipping-cancel",
  "shipping-checkout",
  "shipping-companies",
  "shipping-generate",
  "shipping-preview",
  "shipping-print",
  "shipping-share",
  "shipping-tracking",
  "ecommerce-shipping",
  "transactions-read",
  "users-read",
  "users-write",
].join(" ");

export interface MelhorEnvioSettingsRow {
  id: string;
  environment: MelhorEnvioEnvironment;
  production_client_id: string;
  production_client_secret: string;
  production_access_token: string | null;
  production_refresh_token: string | null;
  production_token_expires_at: string | null;
  sandbox_client_id: string;
  sandbox_client_secret: string;
  sandbox_access_token: string | null;
  sandbox_refresh_token: string | null;
  sandbox_token_expires_at: string | null;
  redirect_uri: string;
  user_agent: string;
  origin_postal_code: string;
  default_width_cm: number;
  default_height_cm: number;
  default_length_cm: number;
  default_weight_kg: number;
  free_shipping_enabled: boolean;
  free_shipping_threshold: number;
  sender_name: string;
  sender_email: string;
  sender_phone: string;
  sender_document_type: "cpf" | "cnpj";
  sender_document: string;
  sender_state_register: string;
  sender_address: string;
  sender_number: string;
  sender_complement: string;
  sender_district: string;
  sender_city: string;
  sender_state_abbr: string;
  created_at: string;
  updated_at: string;
}

interface TokenResponse {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
}

interface MelhorEnvioCalculateItem {
  id: number | string;
  name: string;
  price: string | number;
  custom_price: string | number;
  discount?: string | number;
  currency: string;
  delivery_time: number;
  custom_delivery_time?: number;
  company?: { id: number; name: string; picture?: string };
  packages?: Array<{
    height?: string | number;
    width?: string | number;
    length?: string | number;
    weight?: string | number;
    dimensions?: {
      height?: string | number;
      width?: string | number;
      length?: string | number;
    };
  }>;
  error?: string;
}

interface ShippingCalculationDetails {
  result: ShippingQuoteResult;
  requestPayload: Record<string, unknown>;
  responsePayload: unknown;
  fromPostalCode: string;
}

function getJwtSecret(): string {
  const secret = process.env.ADMIN_JWT_SECRET?.trim();
  if (!secret) {
    throw new Error("Configure ADMIN_JWT_SECRET no arquivo .env");
  }
  return secret;
}

export function getMelhorEnvioBaseUrl(environment: MelhorEnvioEnvironment): string {
  return environment === "sandbox"
    ? "https://sandbox.melhorenvio.com.br"
    : "https://melhorenvio.com.br";
}

function resolvePublicAppUrl(): string {
  const fromEnv =
    process.env.APP_URL?.trim() ||
    process.env.VITE_APP_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

  if (fromEnv) {
    const withProtocol = fromEnv.startsWith("http") ? fromEnv : `https://${fromEnv}`;
    return withProtocol.replace(/\/$/, "");
  }

  return "http://localhost:3000";
}

export function getDefaultRedirectUri(): string {
  return `${resolvePublicAppUrl()}/api/admin/melhor-envio/callback`;
}

function envPrefix(environment: MelhorEnvioEnvironment) {
  return environment === "sandbox" ? "sandbox" : "production";
}

function getClientId(row: MelhorEnvioSettingsRow, environment = row.environment): string {
  return environment === "sandbox" ? row.sandbox_client_id : row.production_client_id;
}

function getClientSecret(row: MelhorEnvioSettingsRow, environment = row.environment): string {
  return environment === "sandbox" ? row.sandbox_client_secret : row.production_client_secret;
}

function getAccessToken(row: MelhorEnvioSettingsRow, environment = row.environment): string | null {
  return environment === "sandbox" ? row.sandbox_access_token : row.production_access_token;
}

function getRefreshToken(row: MelhorEnvioSettingsRow, environment = row.environment): string | null {
  return environment === "sandbox" ? row.sandbox_refresh_token : row.production_refresh_token;
}

function getTokenExpiresAt(
  row: MelhorEnvioSettingsRow,
  environment = row.environment,
): string | null {
  return environment === "sandbox"
    ? row.sandbox_token_expires_at
    : row.production_token_expires_at;
}

function isConnected(row: MelhorEnvioSettingsRow, environment = row.environment): boolean {
  return Boolean(getAccessToken(row, environment) && getRefreshToken(row, environment));
}

function isConfigured(row: MelhorEnvioSettingsRow, environment: MelhorEnvioEnvironment): boolean {
  return Boolean(getClientId(row, environment).trim() && getClientSecret(row, environment).trim());
}

function toStatus(row: MelhorEnvioSettingsRow): MelhorEnvioStatus {
  const env = row.environment;
  return {
    environment: env,
    redirectUri: row.redirect_uri || getDefaultRedirectUri(),
    userAgent: row.user_agent,
    originPostalCode: row.origin_postal_code,
    defaultWidthCm: Number(row.default_width_cm),
    defaultHeightCm: Number(row.default_height_cm),
    defaultLengthCm: Number(row.default_length_cm),
    defaultWeightKg: Number(row.default_weight_kg),
    freeShippingEnabled: row.free_shipping_enabled ?? true,
    freeShippingThreshold: Number(row.free_shipping_threshold ?? 299),
    senderName: row.sender_name ?? "",
    senderEmail: row.sender_email ?? "",
    senderPhone: row.sender_phone ?? "",
    senderDocumentType: row.sender_document_type ?? "cpf",
    senderDocument: row.sender_document ?? "",
    senderStateRegister: row.sender_state_register ?? "ISENTO",
    senderAddress: row.sender_address ?? "",
    senderNumber: row.sender_number ?? "",
    senderComplement: row.sender_complement ?? "",
    senderDistrict: row.sender_district ?? "",
    senderCity: row.sender_city ?? "",
    senderStateAbbr: row.sender_state_abbr ?? "",
    clientId: getClientId(row, env),
    hasClientSecret: Boolean(getClientSecret(row, env).trim()),
    connected: isConnected(row, env),
    tokenExpiresAt: getTokenExpiresAt(row, env),
    productionConfigured: isConfigured(row, "production"),
    sandboxConfigured: isConfigured(row, "sandbox"),
    productionConnected: isConnected(row, "production"),
    sandboxConnected: isConnected(row, "sandbox"),
  };
}

export async function getMelhorEnvioSettings(): Promise<MelhorEnvioSettingsRow> {
  const { data, error } = await supabase
    .from("melhor_envio_settings")
    .select("*")
    .eq("id", SETTINGS_ID)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao carregar Melhor Envio: ${error.message}`);
  }

  if (!data) {
    const { data: inserted, error: insertError } = await supabase
      .from("melhor_envio_settings")
      .insert({ id: SETTINGS_ID, redirect_uri: getDefaultRedirectUri() })
      .select("*")
      .single();

    if (insertError) {
      throw new Error(
        `Tabela melhor_envio_settings não encontrada. Execute supabase/melhor_envio.sql no Supabase. (${insertError.message})`,
      );
    }

    return inserted as MelhorEnvioSettingsRow;
  }

  return data as MelhorEnvioSettingsRow;
}

export async function getMelhorEnvioStatus(): Promise<MelhorEnvioStatus> {
  const row = await getMelhorEnvioSettings();
  return toStatus(row);
}

export async function getPublicShippingConfig(): Promise<{
  freeShippingEnabled: boolean;
  freeShippingThreshold: number;
}> {
  const row = await getMelhorEnvioSettings();
  return {
    freeShippingEnabled: row.free_shipping_enabled ?? true,
    freeShippingThreshold: Number(row.free_shipping_threshold ?? 299),
  };
}

export async function updateMelhorEnvioSettings(
  input: MelhorEnvioSettingsInput,
): Promise<MelhorEnvioStatus> {
  const row = await getMelhorEnvioSettings();
  const targetEnv = input.environment ?? row.environment;
  const prefix = envPrefix(targetEnv);

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.environment) {
    patch.environment = input.environment;
  }
  if (input.redirectUri !== undefined) {
    patch.redirect_uri = input.redirectUri.trim();
  }
  if (input.userAgent !== undefined) {
    patch.user_agent = input.userAgent.trim();
  }
  if (input.originPostalCode !== undefined) {
    patch.origin_postal_code = input.originPostalCode.replace(/\D/g, "");
  }
  if (input.defaultWidthCm !== undefined) patch.default_width_cm = input.defaultWidthCm;
  if (input.defaultHeightCm !== undefined) patch.default_height_cm = input.defaultHeightCm;
  if (input.defaultLengthCm !== undefined) patch.default_length_cm = input.defaultLengthCm;
  if (input.defaultWeightKg !== undefined) patch.default_weight_kg = input.defaultWeightKg;
  if (input.freeShippingEnabled !== undefined) {
    patch.free_shipping_enabled = input.freeShippingEnabled;
  }
  if (input.freeShippingThreshold !== undefined) {
    patch.free_shipping_threshold = input.freeShippingThreshold;
  }
  if (input.senderName !== undefined) patch.sender_name = input.senderName.trim();
  if (input.senderEmail !== undefined) patch.sender_email = input.senderEmail.trim();
  if (input.senderPhone !== undefined) patch.sender_phone = input.senderPhone.replace(/\D/g, "");
  if (input.senderDocumentType !== undefined) patch.sender_document_type = input.senderDocumentType;
  if (input.senderDocument !== undefined) patch.sender_document = input.senderDocument.replace(/\D/g, "");
  if (input.senderStateRegister !== undefined) patch.sender_state_register = input.senderStateRegister.trim();
  if (input.senderAddress !== undefined) patch.sender_address = input.senderAddress.trim();
  if (input.senderNumber !== undefined) patch.sender_number = input.senderNumber.trim();
  if (input.senderComplement !== undefined) patch.sender_complement = input.senderComplement.trim();
  if (input.senderDistrict !== undefined) patch.sender_district = input.senderDistrict.trim();
  if (input.senderCity !== undefined) patch.sender_city = input.senderCity.trim();
  if (input.senderStateAbbr !== undefined) patch.sender_state_abbr = input.senderStateAbbr.trim().toUpperCase();

  if (input.clientId !== undefined) {
    patch[`${prefix}_client_id`] = input.clientId.trim();
  }
  if (input.clientSecret !== undefined && input.clientSecret.trim() !== "") {
    patch[`${prefix}_client_secret`] = input.clientSecret.trim();
  }

  const { data, error } = await supabase
    .from("melhor_envio_settings")
    .update(patch)
    .eq("id", SETTINGS_ID)
    .select("*")
    .single();

  if (error) {
    throw new Error(`Erro ao salvar Melhor Envio: ${error.message}`);
  }

  return toStatus(data as MelhorEnvioSettingsRow);
}

export function createOAuthState(environment: MelhorEnvioEnvironment): string {
  return jwt.sign(
    { purpose: "melhor_envio_oauth", environment },
    getJwtSecret(),
    { expiresIn: "15m" },
  );
}

export function verifyOAuthState(state: string): MelhorEnvioEnvironment {
  const payload = jwt.verify(state, getJwtSecret());
  if (
    typeof payload !== "object" ||
    payload === null ||
    (payload as { purpose?: string }).purpose !== "melhor_envio_oauth"
  ) {
    throw new Error("State OAuth inválido");
  }

  const environment = (payload as { environment?: string }).environment;
  if (environment !== "production" && environment !== "sandbox") {
    throw new Error("Ambiente OAuth inválido");
  }

  return environment;
}

export async function buildAuthorizeUrl(): Promise<string> {
  const row = await getMelhorEnvioSettings();
  const clientId = getClientId(row).trim();
  const redirectUri = (row.redirect_uri || getDefaultRedirectUri()).trim();

  if (!clientId) {
    throw new Error("Configure o Client ID do Melhor Envio antes de conectar");
  }
  if (!getClientSecret(row).trim()) {
    throw new Error("Configure o Client Secret do Melhor Envio antes de conectar");
  }
  if (!redirectUri) {
    throw new Error("Configure a URL de callback (redirect_uri)");
  }

  const state = createOAuthState(row.environment);
  const base = getMelhorEnvioBaseUrl(row.environment);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    state,
    scope: MELHOR_ENVIO_SCOPES,
  });

  return `${base}/oauth/authorize?${params.toString()}`;
}

async function requestToken(
  environment: MelhorEnvioEnvironment,
  body: Record<string, string>,
  userAgent: string,
): Promise<TokenResponse> {
  const base = getMelhorEnvioBaseUrl(environment);
  const form = new URLSearchParams(body);

  const response = await fetch(`${base}/oauth/token`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": userAgent,
    },
    body: form.toString(),
  });

  const data = (await response.json().catch(() => null)) as
    | (TokenResponse & { message?: string; error?: string; error_description?: string })
    | null;

  if (!response.ok || !data?.access_token) {
    const message =
      data?.error_description ||
      data?.message ||
      data?.error ||
      `Falha ao obter token Melhor Envio (HTTP ${response.status})`;
    throw new Error(message);
  }

  return data;
}

async function saveTokens(
  environment: MelhorEnvioEnvironment,
  tokens: TokenResponse,
): Promise<void> {
  const prefix = envPrefix(environment);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  const { error } = await supabase
    .from("melhor_envio_settings")
    .update({
      [`${prefix}_access_token`]: tokens.access_token,
      [`${prefix}_refresh_token`]: tokens.refresh_token,
      [`${prefix}_token_expires_at`]: expiresAt,
      environment,
      updated_at: new Date().toISOString(),
    })
    .eq("id", SETTINGS_ID);

  if (error) {
    throw new Error(`Erro ao salvar tokens Melhor Envio: ${error.message}`);
  }
}

export async function exchangeAuthorizationCode(
  code: string,
  state: string,
): Promise<MelhorEnvioStatus> {
  const environment = verifyOAuthState(state);
  const row = await getMelhorEnvioSettings();
  const redirectUri = (row.redirect_uri || getDefaultRedirectUri()).trim();
  const clientId = getClientId(row, environment).trim();
  const clientSecret = getClientSecret(row, environment).trim();

  if (!clientId || !clientSecret) {
    throw new Error("Credenciais do Melhor Envio não configuradas para este ambiente");
  }

  const tokens = await requestToken(
    environment,
    {
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      code,
    },
    row.user_agent,
  );

  await saveTokens(environment, tokens);
  return getMelhorEnvioStatus();
}

async function refreshAccessToken(
  row: MelhorEnvioSettingsRow,
  environment: MelhorEnvioEnvironment,
): Promise<MelhorEnvioSettingsRow> {
  const refreshToken = getRefreshToken(row, environment);
  const clientId = getClientId(row, environment).trim();
  const clientSecret = getClientSecret(row, environment).trim();

  if (!refreshToken || !clientId || !clientSecret) {
    throw new Error("Melhor Envio não conectado. Autorize pelo painel admin.");
  }

  const tokens = await requestToken(
    environment,
    {
      grant_type: "refresh_token",
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
    },
    row.user_agent,
  );

  await saveTokens(environment, tokens);
  return getMelhorEnvioSettings();
}

/** Retorna access_token válido, renovando automaticamente se estiver perto de expirar. */
export async function getValidAccessToken(): Promise<{
  accessToken: string;
  row: MelhorEnvioSettingsRow;
}> {
  let row = await getMelhorEnvioSettings();
  const environment = row.environment;
  let accessToken = getAccessToken(row, environment);
  const expiresAt = getTokenExpiresAt(row, environment);

  if (!accessToken || !getRefreshToken(row, environment)) {
    throw new Error("Melhor Envio não conectado. Autorize pelo painel admin.");
  }

  const expiresMs = expiresAt ? new Date(expiresAt).getTime() : 0;
  const needsRefresh = !expiresAt || expiresMs - Date.now() < 5 * 60 * 1000;

  if (needsRefresh) {
    row = await refreshAccessToken(row, environment);
    accessToken = getAccessToken(row, environment);
    if (!accessToken) {
      throw new Error("Não foi possível renovar o token do Melhor Envio");
    }
  }

  return { accessToken, row };
}

export async function disconnectMelhorEnvio(): Promise<MelhorEnvioStatus> {
  const row = await getMelhorEnvioSettings();
  const prefix = envPrefix(row.environment);

  const { error } = await supabase
    .from("melhor_envio_settings")
    .update({
      [`${prefix}_access_token`]: null,
      [`${prefix}_refresh_token`]: null,
      [`${prefix}_token_expires_at`]: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", SETTINGS_ID);

  if (error) {
    throw new Error(`Erro ao desconectar Melhor Envio: ${error.message}`);
  }

  return getMelhorEnvioStatus();
}

function toNumber(value: string | number | undefined, fallback = 0): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const n = Number(value.replace(",", "."));
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

async function calculateShippingDetailed(
  input: ShippingQuoteInput,
): Promise<ShippingCalculationDetails> {
  const { accessToken, row } = await getValidAccessToken();
  const fromCep = row.origin_postal_code.replace(/\D/g, "");

  if (fromCep.length !== 8) {
    throw new Error("Configure o CEP de origem da loja no painel Melhor Envio");
  }

  const products = input.products.map((product) => ({
    id: product.id,
    width: product.width ?? Number(row.default_width_cm),
    height: product.height ?? Number(row.default_height_cm),
    length: product.length ?? Number(row.default_length_cm),
    weight: product.weight ?? Number(row.default_weight_kg),
    insurance_value: Number(product.insuranceValue.toFixed(2)),
    quantity: product.quantity,
  }));

  const body: Record<string, unknown> = {
    from: { postal_code: fromCep },
    to: { postal_code: input.toPostalCode },
    products,
    options: {
      receipt: input.receipt ?? false,
      own_hand: input.ownHand ?? false,
    },
  };

  if (input.services?.trim()) {
    body.services = input.services.trim();
  }

  const base = getMelhorEnvioBaseUrl(row.environment);
  const response = await fetch(`${base}/api/v2/me/shipment/calculate`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": row.user_agent,
    },
    body: JSON.stringify(body),
  });

  const raw = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (raw && typeof raw === "object" && "message" in raw && String((raw as { message: unknown }).message)) ||
      `Erro na cotação Melhor Envio (HTTP ${response.status})`;
    throw new Error(message);
  }

  const items = (Array.isArray(raw) ? raw : []) as MelhorEnvioCalculateItem[];

  const options: ShippingQuoteOption[] = items
    .filter((item) => !item.error)
    .map((item) => ({
      id: String(item.id),
      name: item.name,
      company: item.company?.name ?? "",
      price: toNumber(item.price),
      customPrice: toNumber(item.custom_price ?? item.price),
      deliveryTime: item.delivery_time,
      customDeliveryTime: item.custom_delivery_time ?? item.delivery_time,
      currency: item.currency || "R$",
      companyId: item.company?.id ?? null,
      packages: (item.packages ?? []).map((entry) => ({
        height: toNumber(entry.height ?? entry.dimensions?.height),
        width: toNumber(entry.width ?? entry.dimensions?.width),
        length: toNumber(entry.length ?? entry.dimensions?.length),
        weight: toNumber(entry.weight),
      })),
      error: item.error ?? null,
    }))
    .sort((a, b) => a.customPrice - b.customPrice);

  const subtotal = input.products.reduce(
    (sum, p) => sum + p.insuranceValue * p.quantity,
    0,
  );
  const freeShipping = applyFreeShipping(
    options,
    subtotal,
    row.free_shipping_enabled ?? true,
    Number(row.free_shipping_threshold ?? 299),
  );

  return {
    result: {
      options: freeShipping.options,
      environment: row.environment,
      freeShippingApplied: freeShipping.applied,
    },
    requestPayload: body,
    responsePayload: raw,
    fromPostalCode: fromCep,
  };
}

export async function calculateShipping(
  input: ShippingQuoteInput,
): Promise<ShippingQuoteResult> {
  return (await calculateShippingDetailed(input)).result;
}

interface CheckoutCartItemRow {
  product_id: number;
  product_slug: string;
  quantity: number;
  unit_price: number | string;
}

export interface ValidatedShippingSelection {
  quoteId: string;
  service: ShippingQuoteOption;
  environment: MelhorEnvioEnvironment;
  chargedPrice: number;
  snapshot: {
    requestPayload: Record<string, unknown>;
    responsePayload: unknown;
    option: ShippingQuoteOption;
  };
}

export async function createCheckoutShippingQuote(
  customerId: string,
  toPostalCode: string,
): Promise<ShippingQuoteResult> {
  const { data: cart, error: cartError } = await supabase
    .from("carts")
    .select("id")
    .eq("customer_id", customerId)
    .eq("status", "active")
    .maybeSingle();
  if (cartError) throw new Error(cartError.message);
  if (!cart) throw new Error("Carrinho vazio");

  const { data: items, error: itemsError } = await supabase
    .from("cart_items")
    .select("product_id, product_slug, quantity, unit_price")
    .eq("cart_id", cart.id);
  if (itemsError) throw new Error(itemsError.message);
  const cartItems = (items ?? []) as CheckoutCartItemRow[];
  if (!cartItems.length) throw new Error("Carrinho vazio");

  const productIds = Array.from(new Set(cartItems.map((item) => item.product_id)));
  const { data: dimensions, error: dimensionsError } = await supabase
    .from("products")
    .select("id, width_cm, height_cm, length_cm, weight_kg")
    .in("id", productIds);
  if (dimensionsError) throw new Error(dimensionsError.message);
  const dimensionMap = new Map(
    (dimensions ?? []).map((product) => [Number(product.id), product]),
  );

  const input: ShippingQuoteInput = {
    toPostalCode,
    products: cartItems.map((item) => {
      const product = dimensionMap.get(Number(item.product_id));
      return {
        id: item.product_slug,
        quantity: item.quantity,
        insuranceValue: Number(item.unit_price),
        width: product?.width_cm == null ? undefined : Number(product.width_cm),
        height: product?.height_cm == null ? undefined : Number(product.height_cm),
        length: product?.length_cm == null ? undefined : Number(product.length_cm),
        weight: product?.weight_kg == null ? undefined : Number(product.weight_kg),
      };
    }),
  };
  const calculation = await calculateShippingDetailed(input);
  const subtotal = cartItems.reduce(
    (total, item) => total + Number(item.unit_price) * item.quantity,
    0,
  );
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
  const { data: quote, error: quoteError } = await supabase
    .from("shipping_quotes")
    .insert({
      customer_id: customerId,
      cart_id: cart.id,
      environment: calculation.result.environment,
      from_postal_code: calculation.fromPostalCode,
      to_postal_code: toPostalCode,
      subtotal,
      free_shipping_applied: calculation.result.freeShippingApplied,
      request_payload: calculation.requestPayload,
      response_payload: calculation.responsePayload,
      options: calculation.result.options,
      expires_at: expiresAt,
    })
    .select("id, expires_at")
    .single();
  if (quoteError) throw new Error(quoteError.message);

  return {
    ...calculation.result,
    quoteId: quote.id,
    expiresAt: quote.expires_at,
  };
}

export async function validateShippingSelection(params: {
  customerId: string;
  cartId: string;
  quoteId: string;
  serviceId: string;
  toPostalCode: string;
  subtotal: number;
  items: CheckoutCartItemRow[];
}): Promise<ValidatedShippingSelection> {
  const { data, error } = await supabase
    .from("shipping_quotes")
    .select("*")
    .eq("id", params.quoteId)
    .eq("customer_id", params.customerId)
    .eq("cart_id", params.cartId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Cotação de frete inválida");
  if (new Date(data.expires_at).getTime() <= Date.now()) {
    throw new Error("Cotação de frete expirada. Calcule novamente.");
  }
  if (
    String(data.to_postal_code).replace(/\D/g, "") !==
    params.toPostalCode.replace(/\D/g, "")
  ) {
    throw new Error("O CEP mudou. Calcule o frete novamente.");
  }
  if (Math.abs(Number(data.subtotal) - params.subtotal) > 0.009) {
    throw new Error("O carrinho mudou. Calcule o frete novamente.");
  }

  const quotedProducts = Array.isArray(data.request_payload?.products)
    ? data.request_payload.products
        .map((product: Record<string, unknown>) => ({
          id: String(product.id),
          quantity: Number(product.quantity),
          insuranceValue: Number(product.insurance_value),
        }))
        .sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id))
    : [];
  const currentProducts = params.items
    .map((item) => ({
      id: item.product_slug,
      quantity: item.quantity,
      insuranceValue: Number(item.unit_price),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
  if (JSON.stringify(quotedProducts) !== JSON.stringify(currentProducts)) {
    throw new Error("O carrinho mudou. Calcule o frete novamente.");
  }

  const options = (Array.isArray(data.options) ? data.options : []) as ShippingQuoteOption[];
  const service = options.find((option) => option.id === params.serviceId);
  if (!service) throw new Error("Serviço de entrega indisponível nesta cotação");

  return {
    quoteId: data.id,
    service,
    environment: data.environment as MelhorEnvioEnvironment,
    chargedPrice: Number(service.customPrice),
    snapshot: {
      requestPayload: data.request_payload as Record<string, unknown>,
      responsePayload: data.response_payload,
      option: service,
    },
  };
}

function requiredSender(row: MelhorEnvioSettingsRow) {
  const required = [
    row.sender_name,
    row.sender_email,
    row.sender_phone,
    row.sender_document,
    row.sender_address,
    row.sender_number,
    row.sender_district,
    row.sender_city,
    row.sender_state_abbr,
    row.origin_postal_code,
  ];
  if (required.some((value) => !String(value ?? "").trim())) {
    throw new Error("Complete os dados do remetente no painel do Melhor Envio");
  }
}

function cartResponseId(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  const id = record.id ?? record.order_id ?? record.shipment_id;
  return id == null ? null : String(id);
}

export async function ensurePaidOrderInMelhorEnvioCart(orderId: string) {
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (orderError) throw new Error(orderError.message);
  if (order.payment_status !== "approved") {
    throw new Error("A etiqueta só pode ser preparada após o pagamento");
  }
  if (!order.shipping_service_id || !order.shipping_quote_snapshot) {
    throw new Error("Pedido sem cotação do Melhor Envio");
  }

  const { data: orderItems, error: itemsError } = await supabase
    .from("order_items")
    .select("name, quantity, price")
    .eq("order_id", orderId);
  if (itemsError) throw new Error(itemsError.message);

  const { accessToken, row } = await getValidAccessToken();
  requiredSender(row);
  if (row.environment !== order.shipping_environment) {
    throw new Error("O ambiente do Melhor Envio mudou desde a cotação");
  }

  const snapshot = order.shipping_quote_snapshot as {
    requestPayload?: { products?: Array<Record<string, unknown>> };
    option?: ShippingQuoteOption;
  };
  const quotedProducts = snapshot.requestPayload?.products ?? [];
  let volumes = snapshot.option?.packages ?? [];
  if (!volumes.length) {
    volumes = quotedProducts.map((product) => ({
      height: toNumber(product.height as string | number),
      width: toNumber(product.width as string | number),
      length: toNumber(product.length as string | number),
      weight:
        toNumber(product.weight as string | number) *
        Math.max(1, toNumber(product.quantity as string | number, 1)),
    }));
  }
  if (!volumes.length) throw new Error("Cotação sem volumes para a etiqueta");

  const company = String(order.shipping_company ?? "");
  const groups = groupShipmentVolumes(company, volumes);
  const recipient = order.shipping_recipient as {
    name: string;
    email: string;
    phone: string;
    document: string;
  };
  const address = order.shipping_address as {
    cep: string;
    rua: string;
    numero: string;
    complemento?: string | null;
    bairro: string;
    cidade: string;
    estado: string;
  };
  const products = (orderItems ?? []).map((item) => ({
    name: String(item.name).slice(0, 255),
    quantity: Number(item.quantity),
    unitary_value: Number(item.price).toFixed(2),
  }));
  const insuranceValue = (orderItems ?? []).reduce(
    (total, item) => total + Number(item.price) * Number(item.quantity),
    0,
  );
  const results: Array<{ volumeIndex: number; status: string; cartId: string | null }> = [];

  for (let volumeIndex = 0; volumeIndex < groups.length; volumeIndex += 1) {
    await supabase.from("melhor_envio_shipments").upsert(
      {
        order_id: orderId,
        volume_index: volumeIndex,
        environment: row.environment,
        status: "pending",
      },
      { onConflict: "order_id,volume_index", ignoreDuplicates: true },
    );
    const { data: claimed, error: claimError } = await supabase
      .from("melhor_envio_shipments")
      .update({
        status: "processing",
        error_message: null,
        last_attempt_at: new Date().toISOString(),
      })
      .eq("order_id", orderId)
      .eq("volume_index", volumeIndex)
      .in("status", ["pending", "failed"])
      .select("id, attempt_count")
      .maybeSingle();
    if (claimError) throw new Error(claimError.message);
    if (!claimed) {
      const { data: existing } = await supabase
        .from("melhor_envio_shipments")
        .select("status, melhor_envio_cart_id")
        .eq("order_id", orderId)
        .eq("volume_index", volumeIndex)
        .single();
      results.push({
        volumeIndex,
        status: existing?.status ?? "processing",
        cartId: existing?.melhor_envio_cart_id ?? null,
      });
      continue;
    }

    const from: Record<string, unknown> = {
      name: row.sender_name,
      email: row.sender_email,
      phone: row.sender_phone,
      address: row.sender_address,
      complement: row.sender_complement,
      number: row.sender_number,
      district: row.sender_district,
      city: row.sender_city,
      postal_code: row.origin_postal_code.replace(/\D/g, ""),
      state_abbr: row.sender_state_abbr,
      state_register: row.sender_state_register || "ISENTO",
    };
    if (row.sender_document_type === "cnpj") {
      from.company_document = row.sender_document;
    } else {
      from.document = row.sender_document;
    }
    const body = {
      service: Number(order.shipping_service_id),
      from,
      to: {
        name: recipient.name,
        email: recipient.email,
        phone: recipient.phone,
        document: recipient.document,
        state_register: "ISENTO",
        address: address.rua,
        complement: address.complemento ?? "",
        number: address.numero,
        district: address.bairro,
        city: address.cidade,
        postal_code: address.cep.replace(/\D/g, ""),
        country_id: "BR",
        state_abbr: address.estado,
      },
      products,
      volumes: groups[volumeIndex],
      options: {
        platform: "Nativa Store",
        reminder: `Pedido ${orderId.slice(0, 8).toUpperCase()}`,
        insurance_value: Number(insuranceValue.toFixed(2)),
        receipt: false,
        own_hand: false,
        reverse: false,
      },
    };

    try {
      const response = await fetch(
        `${getMelhorEnvioBaseUrl(row.environment)}/api/v2/me/cart`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": row.user_agent,
          },
          body: JSON.stringify(body),
        },
      );
      const responsePayload = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          responsePayload &&
          typeof responsePayload === "object" &&
          "message" in responsePayload
            ? String((responsePayload as { message: unknown }).message)
            : `Erro ao inserir frete no carrinho (HTTP ${response.status})`;
        throw Object.assign(new Error(message), { payload: responsePayload });
      }
      const cartId = cartResponseId(responsePayload);
      if (!cartId) throw new Error("Melhor Envio não retornou o ID da etiqueta");
      await supabase
        .from("melhor_envio_shipments")
        .update({
          status: "in_cart",
          melhor_envio_cart_id: cartId,
          request_payload: body,
          response_payload: responsePayload,
          attempt_count: Number(claimed.attempt_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", claimed.id);
      results.push({ volumeIndex, status: "in_cart", cartId });
    } catch (error) {
      await supabase
        .from("melhor_envio_shipments")
        .update({
          status: "failed",
          request_payload: body,
          response_payload:
            (error as Error & { payload?: unknown }).payload ?? null,
          error_message:
            error instanceof Error ? error.message : "Erro desconhecido",
          attempt_count: Number(claimed.attempt_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", claimed.id);
      results.push({ volumeIndex, status: "failed", cartId: null });
    }
  }

  return results;
}
