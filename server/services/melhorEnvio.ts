import type {
  MelhorEnvioEnvironment,
  MelhorEnvioSettingsInput,
  MelhorEnvioStatus,
  ShippingQuoteOption,
  ShippingQuoteResult,
} from "@shared/types/melhorEnvio";
import type { ShippingQuoteInput } from "@shared/schemas/melhorEnvio";
import { FREE_SHIPPING_THRESHOLD } from "@shared/const/cart";
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
  error?: string;
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

export async function calculateShipping(
  input: ShippingQuoteInput,
): Promise<ShippingQuoteResult> {
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
      error: item.error ?? null,
    }))
    .sort((a, b) => a.customPrice - b.customPrice);

  const subtotal = input.products.reduce(
    (sum, p) => sum + p.insuranceValue * p.quantity,
    0,
  );
  const freeShippingApplied = subtotal >= FREE_SHIPPING_THRESHOLD;

  if (freeShippingApplied && options.length > 0) {
    const cheapestId = options[0].id;
    for (const option of options) {
      if (option.id === cheapestId) {
        option.customPrice = 0;
        option.price = 0;
      }
    }
  }

  return {
    options,
    environment: row.environment,
    freeShippingApplied,
  };
}
