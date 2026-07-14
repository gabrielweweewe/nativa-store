import type {
  BrevoAdminStatus,
  BrevoCampaignInput,
  BrevoContactInput,
  BrevoDeliveryKind,
  BrevoNewsletterInput,
  BrevoSettingsInput,
  BrevoTransactionalEmailInput,
} from "@shared/types/brevo";
import { BrevoClient } from "@getbrevo/brevo";
import { decryptSecret, encryptSecret } from "../lib/secretCrypto";
import { supabase } from "../lib/supabase";

const BREVO_API_URL = "https://api.brevo.com/v3";
const BREVO_KEY = "BREVO_ENCRYPTION_KEY";

interface BrevoSettingsRow {
  id: boolean;
  enabled: boolean;
  api_key_encrypted: string | null;
  webhook_token_encrypted: string | null;
  default_sender_id: number | null;
  default_sender_email: string;
  default_sender_name: string;
  reply_to: string;
  default_list_id: number | null;
  template_order_received: number | null;
  template_payment_approved: number | null;
  template_payment_failed: number | null;
  template_payment_refunded: number | null;
  template_order_processing: number | null;
  template_order_shipped: number | null;
  template_order_delivered: number | null;
  account_email: string | null;
  last_tested_at: string | null;
}

interface ActiveBrevoSettings extends BrevoSettingsRow {
  apiKey: string;
}

export class BrevoApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly payload: unknown
  ) {
    super(message);
    this.name = "BrevoApiError";
  }
}

function publicAppUrl(): string {
  const raw =
    process.env.APP_URL?.trim() ||
    process.env.VITE_APP_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000");
  return (raw.startsWith("http") ? raw : `https://${raw}`).replace(/\/$/, "");
}

export function getBrevoWebhookUrl(): string {
  return `${publicAppUrl()}/api/webhooks/brevo`;
}

async function getSettingsRow(): Promise<BrevoSettingsRow> {
  const { data, error } = await supabase
    .from("brevo_settings")
    .select("*")
    .eq("id", true)
    .single();
  if (error) throw new Error(error.message);
  return data as BrevoSettingsRow;
}

async function getActiveSettings(): Promise<ActiveBrevoSettings> {
  const row = await getSettingsRow();
  if (!row.enabled) throw new Error("Brevo não está habilitado");
  if (!row.api_key_encrypted)
    throw new Error("Chave da API Brevo não configurada");
  return {
    ...row,
    apiKey: decryptSecret(row.api_key_encrypted, BREVO_KEY),
  };
}

function adminStatus(row: BrevoSettingsRow): BrevoAdminStatus {
  return {
    enabled: row.enabled,
    defaultSenderId: row.default_sender_id,
    defaultSenderEmail: row.default_sender_email,
    defaultSenderName: row.default_sender_name,
    replyTo: row.reply_to,
    defaultListId: row.default_list_id,
    templateOrderReceived: row.template_order_received,
    templatePaymentApproved: row.template_payment_approved,
    templatePaymentFailed: row.template_payment_failed,
    templatePaymentRefunded: row.template_payment_refunded,
    templateOrderProcessing: row.template_order_processing,
    templateOrderShipped: row.template_order_shipped,
    templateOrderDelivered: row.template_order_delivered,
    hasApiKey: Boolean(row.api_key_encrypted),
    hasWebhookToken: Boolean(row.webhook_token_encrypted),
    configured: Boolean(row.api_key_encrypted),
    connected: Boolean(row.api_key_encrypted && row.last_tested_at),
    accountEmail: row.account_email,
    webhookConfigured: Boolean(
      row.webhook_token_encrypted || process.env.BREVO_WEBHOOK_TOKEN?.trim()
    ),
    lastTestedAt: row.last_tested_at,
    webhookUrl: getBrevoWebhookUrl(),
  };
}

export async function getBrevoAdminStatus(): Promise<BrevoAdminStatus> {
  return adminStatus(await getSettingsRow());
}

export async function updateBrevoSettings(
  input: BrevoSettingsInput
): Promise<BrevoAdminStatus> {
  const update: Record<string, unknown> = {
    enabled: input.enabled,
    updated_at: new Date().toISOString(),
  };
  if (input.defaultSenderId !== undefined)
    update.default_sender_id = input.defaultSenderId;
  if (input.defaultSenderEmail !== undefined) {
    update.default_sender_email = input.defaultSenderEmail.trim().toLowerCase();
  }
  if (input.defaultSenderName !== undefined) {
    update.default_sender_name = input.defaultSenderName.trim();
  }
  if (input.replyTo !== undefined) update.reply_to = input.replyTo.trim().toLowerCase();
  if (input.defaultListId !== undefined)
    update.default_list_id = input.defaultListId;
  const templateColumns = {
    templateOrderReceived: "template_order_received",
    templatePaymentApproved: "template_payment_approved",
    templatePaymentFailed: "template_payment_failed",
    templatePaymentRefunded: "template_payment_refunded",
    templateOrderProcessing: "template_order_processing",
    templateOrderShipped: "template_order_shipped",
    templateOrderDelivered: "template_order_delivered",
  } as const;
  for (const [field, column] of Object.entries(templateColumns) as Array<
    [keyof typeof templateColumns, (typeof templateColumns)[keyof typeof templateColumns]]
  >) {
    if (input[field] !== undefined) update[column] = input[field];
  }
  if (input.apiKey?.trim()) {
    update.api_key_encrypted = encryptSecret(input.apiKey.trim(), BREVO_KEY);
    update.account_email = null;
    update.last_tested_at = null;
  }
  if (input.webhookToken?.trim()) {
    update.webhook_token_encrypted = encryptSecret(
      input.webhookToken.trim(),
      BREVO_KEY
    );
  }
  const { data, error } = await supabase
    .from("brevo_settings")
    .update(update)
    .eq("id", true)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return adminStatus(data as BrevoSettingsRow);
}

export async function getBrevoWebhookToken(): Promise<string> {
  const environmentToken = process.env.BREVO_WEBHOOK_TOKEN?.trim();
  if (environmentToken) return environmentToken;
  const row = await getSettingsRow();
  if (!row.webhook_token_encrypted) {
    throw new Error("Token do webhook Brevo não configurado");
  }
  return decryptSecret(row.webhook_token_encrypted, BREVO_KEY);
}

export async function configureBrevoWebhooks() {
  const token = await getBrevoWebhookToken();
  const url = getBrevoWebhookUrl();
  const definitions = [
    {
      type: "transactional",
      events: [
        "sent",
        "delivered",
        "opened",
        "click",
        "softBounce",
        "hardBounce",
        "invalid",
        "blocked",
        "error",
        "complaint",
        "unsubscribed",
      ],
    },
    {
      type: "marketing",
      events: [
        "delivered",
        "opened",
        "click",
        "softBounce",
        "hardBounce",
        "spam",
        "unsubscribe",
      ],
    },
  ] as const;

  const configured: unknown[] = [];
  for (const definition of definitions) {
    const existing = (await brevoRequest(
      `/webhooks${queryString({ type: definition.type, sort: "desc" })}`
    )) as { webhooks?: Array<{ id: number; url: string }> };
    const match = existing.webhooks?.find(webhook => webhook.url === url);
    const body = {
      description: `Nativa Store (${definition.type})`,
      url,
      events: definition.events,
      type: definition.type,
      auth: { type: "bearer", token },
    };
    configured.push(
      await brevoRequest(match ? `/webhooks/${match.id}` : "/webhooks", {
        method: match ? "PUT" : "POST",
        body: JSON.stringify(body),
      })
    );
  }
  return { success: true, webhookUrl: url, configured };
}

export async function getBrevoTransactionalConfig() {
  const settings = await getActiveSettings();
  return {
    enabled: settings.enabled,
    replyTo: settings.reply_to,
    templates: {
      order_received: settings.template_order_received,
      payment_approved: settings.template_payment_approved,
      payment_failed: settings.template_payment_failed,
      payment_refunded: settings.template_payment_refunded,
      order_processing: settings.template_order_processing,
      order_shipped: settings.template_order_shipped,
      order_delivered: settings.template_order_delivered,
    },
  };
}

function queryString(
  values: Record<string, string | number | boolean | undefined>
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) query.set(key, String(value));
  }
  const encoded = query.toString();
  return encoded ? `?${encoded}` : "";
}

export async function brevoRequest<T>(
  path: string,
  options: RequestInit = {},
  apiKey?: string
): Promise<T> {
  const key = apiKey ?? (await getActiveSettings()).apiKey;
  const client = new BrevoClient({
    apiKey: key,
    maxRetries: 3,
    timeoutInSeconds: 20,
  });
  const response = await client.fetch(
    `${BREVO_API_URL}${path}`,
    {
      ...options,
      headers: {
        accept: "application/json",
        ...(options.body ? { "content-type": "application/json" } : {}),
        ...(options.headers ?? {}),
      },
    },
    { maxRetries: 3, timeoutInSeconds: 20 }
  );
  const raw = await response.text();
  let body: any = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = { message: raw };
  }
  if (!response.ok) {
    throw new BrevoApiError(
      String(
        body?.message ??
          body?.error ??
          `Brevo respondeu HTTP ${response.status}`
      ),
      response.status,
      body
    );
  }
  return body as T;
}

export async function testBrevoCredentials(): Promise<{
  success: true;
  account: unknown;
}> {
  const account = (await brevoRequest("/account")) as { email?: string };
  const testedAt = new Date().toISOString();
  const { error } = await supabase
    .from("brevo_settings")
    .update({
      account_email: account.email ?? null,
      last_tested_at: testedAt,
      updated_at: testedAt,
    })
    .eq("id", true);
  if (error) throw new Error(error.message);
  return { success: true, account };
}

export async function listBrevoTemplates(limit = 50, offset = 0) {
  const result = (await brevoRequest(
    `/smtp/templates${queryString({ limit, offset, sort: "desc" })}`
  )) as { templates?: unknown[] };
  return result.templates ?? [];
}

export async function listBrevoSenders() {
  const result = (await brevoRequest("/senders")) as { senders?: unknown[] };
  return result.senders ?? [];
}

export async function listBrevoLists(limit = 50, offset = 0) {
  const result = (await brevoRequest(
    `/contacts/lists${queryString({ limit, offset, sort: "desc" })}`
  )) as { lists?: unknown[] };
  return result.lists ?? [];
}

export async function createBrevoList(input: {
  name: string;
  folderId?: number;
}) {
  let folderId = input.folderId;
  if (!folderId) {
    const result = (await brevoRequest(
      `/contacts/folders${queryString({ limit: 1, offset: 0, sort: "desc" })}`
    )) as { folders?: Array<{ id: number }> };
    folderId = result.folders?.[0]?.id;
  }
  if (!folderId) throw new Error("Nenhuma pasta Brevo disponível para a lista");
  return brevoRequest("/contacts/lists", {
    method: "POST",
    body: JSON.stringify({ name: input.name, folderId }),
  });
}

export function deleteBrevoList(listId: number) {
  return brevoRequest(`/contacts/lists/${listId}`, { method: "DELETE" });
}

function mapContact(contact: any) {
  return {
    ...contact,
    id: String(contact.id ?? contact.email),
    firstName: contact.attributes?.FIRSTNAME ?? contact.attributes?.NOME,
    lastName: contact.attributes?.LASTNAME ?? contact.attributes?.SOBRENOME,
    subscribed: !contact.emailBlacklisted,
  };
}

export async function listBrevoContacts(
  limit = 50,
  offset = 0,
  filters: { search?: string; listId?: number } = {}
) {
  const base = filters.listId
    ? `/contacts/lists/${filters.listId}/contacts`
    : "/contacts";
  const result = (await brevoRequest(
    `${base}${queryString({
      limit,
      offset,
      sort: "desc",
      "filter[query]": filters.search,
    })}`
  )) as { contacts?: unknown[] };
  return (result.contacts ?? []).map(mapContact);
}

export function upsertBrevoContact(input: BrevoContactInput) {
  return brevoRequest("/contacts", {
    method: "POST",
    body: JSON.stringify({
      email: input.email.toLowerCase(),
      attributes: {
        ...(input.attributes ?? {}),
        ...(input.firstName ? { FIRSTNAME: input.firstName } : {}),
        ...(input.lastName ? { LASTNAME: input.lastName } : {}),
      },
      listIds: input.listIds,
      unlinkListIds: input.unlinkListIds,
      updateEnabled: input.updateEnabled ?? true,
    }),
  });
}

export function deleteBrevoContact(email: string) {
  return brevoRequest(`/contacts/${encodeURIComponent(email)}`, {
    method: "DELETE",
  });
}

function mapCampaign(campaign: any) {
  return {
    ...campaign,
    senderId: campaign.sender?.id ?? campaign.senderId,
    listIds:
      campaign.recipients?.lists ??
      campaign.recipients?.listIds ??
      campaign.listIds ??
      [],
    sentAt: campaign.sentDate ?? campaign.sentAt ?? null,
  };
}

export async function listBrevoCampaigns(limit = 50, offset = 0) {
  const result = (await brevoRequest(
    `/emailCampaigns${queryString({ limit, offset, sort: "desc" })}`
  )) as { campaigns?: unknown[] };
  return (result.campaigns ?? []).map(mapCampaign);
}

export async function getBrevoCampaign(campaignId: number) {
  return mapCampaign(await brevoRequest(`/emailCampaigns/${campaignId}`));
}

function campaignPayload(
  input: BrevoCampaignInput,
  settings: BrevoSettingsRow
) {
  return {
    name: input.name,
    subject: input.subject,
    htmlContent: input.htmlContent,
    templateId: input.templateId,
    replyTo: input.replyTo,
    tag: input.tag,
    recipients: input.recipients ?? { listIds: input.listIds ?? [] },
    sender: input.senderId
      ? { id: input.senderId }
      : (input.sender ??
        (settings.default_sender_id
          ? { id: settings.default_sender_id }
          : {
              email: settings.default_sender_email,
              name: settings.default_sender_name,
            })),
  };
}

export async function createBrevoCampaign(input: BrevoCampaignInput) {
  const settings = await getActiveSettings();
  return brevoRequest(
    "/emailCampaigns",
    {
      method: "POST",
      body: JSON.stringify(campaignPayload(input, settings)),
    },
    settings.apiKey
  );
}

export async function updateBrevoCampaign(
  campaignId: number,
  input: BrevoCampaignInput
) {
  const settings = await getActiveSettings();
  return brevoRequest(
    `/emailCampaigns/${campaignId}`,
    {
      method: "PUT",
      body: JSON.stringify(campaignPayload(input, settings)),
    },
    settings.apiKey
  );
}

async function recordCampaignDelivery(
  campaignId: number,
  status: string,
  metadata: Record<string, unknown> = {},
  kind: BrevoDeliveryKind = "campaign"
) {
  const { error } = await supabase.from("brevo_email_deliveries").insert({
    kind,
    campaign_id: campaignId,
    status,
    metadata,
    sent_at: status === "sent" ? new Date().toISOString() : null,
  });
  if (error) throw new Error(error.message);
}

export async function sendBrevoCampaignNow(campaignId: number) {
  const result = await brevoRequest(`/emailCampaigns/${campaignId}/sendNow`, {
    method: "POST",
  });
  await recordCampaignDelivery(campaignId, "sent");
  return result;
}

export async function sendBrevoCampaignTest(
  campaignId: number,
  emails: string[]
) {
  const result = await brevoRequest(`/emailCampaigns/${campaignId}/sendTest`, {
    method: "POST",
    body: JSON.stringify({ emailTo: emails }),
  });
  await recordCampaignDelivery(
    campaignId,
    "test_sent",
    { recipients: emails },
    "test"
  );
  return result;
}

export async function scheduleBrevoCampaign(
  campaignId: number,
  scheduledAt: string
) {
  const result = await brevoRequest(`/emailCampaigns/${campaignId}/schedule`, {
    method: "POST",
    body: JSON.stringify({ scheduledAt }),
  });
  await recordCampaignDelivery(campaignId, "scheduled", { scheduledAt });
  return result;
}

export async function getBrevoCampaignMetrics(campaignId: number) {
  const campaign = (await brevoRequest(`/emailCampaigns/${campaignId}`)) as any;
  const stats = campaign.statistics?.globalStats ?? campaign.statistics ?? {};
  const delivered = Number(stats.delivered ?? 0);
  const opened = Number(stats.viewed ?? stats.opened ?? 0);
  const clicked = Number(stats.clicked ?? 0);
  return {
    delivered,
    opened,
    uniqueOpens: Number(stats.uniqueViews ?? stats.uniqueOpens ?? opened),
    clicked,
    uniqueClicks: Number(stats.uniqueClicks ?? clicked),
    bounced: Number(stats.hardBounces ?? 0) + Number(stats.softBounces ?? 0),
    unsubscribed: Number(stats.unsubscriptions ?? stats.unsubscribed ?? 0),
    openRate: delivered ? (opened / delivered) * 100 : 0,
    clickRate: delivered ? (clicked / delivered) * 100 : 0,
  };
}

export async function sendBrevoQuickTest(input: {
  email: string;
  subject: string;
  htmlContent: string;
  senderId: number;
}) {
  const senders = (await listBrevoSenders()) as Array<{
    id?: number;
    email?: string;
    name?: string;
  }>;
  const sender = senders.find(item => Number(item.id) === input.senderId);
  if (!sender?.email) throw new Error("Remetente Brevo não encontrado");
  return sendBrevoTransactionalEmail(
    {
      to: [{ email: input.email }],
      sender: { email: sender.email, name: sender.name },
      subject: input.subject,
      htmlContent: input.htmlContent,
    },
    "test"
  );
}

async function recordTransactionalDeliveries(params: {
  kind: BrevoDeliveryKind;
  messageId: string | null;
  input: BrevoTransactionalEmailInput;
}) {
  const rows = params.input.to.map(recipient => ({
    kind: params.kind,
    message_id: params.messageId,
    recipient_email: recipient.email.toLowerCase(),
    template_id: params.input.templateId ?? null,
    subject: params.input.subject ?? null,
    status: params.input.sandbox ? "sandboxed" : "sent",
    sent_at: new Date().toISOString(),
    metadata: { tags: params.input.tags ?? [] },
  }));
  const { error } = await supabase.from("brevo_email_deliveries").insert(rows);
  if (error) throw new Error(error.message);
}

export async function sendBrevoTransactionalEmail(
  input: BrevoTransactionalEmailInput,
  kind: BrevoDeliveryKind = "transactional",
  options: { record?: boolean } = {}
) {
  const settings = await getActiveSettings();
  let sender = input.sender;
  if (!sender && settings.default_sender_email) {
    sender = {
      email: settings.default_sender_email,
      name: settings.default_sender_name,
    };
  }
  if (!sender && settings.default_sender_id) {
    const result = (await brevoRequest("/senders", {}, settings.apiKey)) as {
      senders?: Array<{ id?: number; email?: string; name?: string }>;
    };
    const configured = result.senders?.find(
      item => Number(item.id) === settings.default_sender_id
    );
    if (configured?.email) {
      sender = { email: configured.email, name: configured.name };
    }
  }
  if (!sender?.email) throw new Error("Remetente padrão não configurado");
  const payload = {
    ...input,
    sandbox: undefined,
    sender,
    replyTo:
      input.replyTo ??
      (settings.reply_to ? { email: settings.reply_to } : undefined),
  };
  const result = await brevoRequest<{ messageId?: string }>(
    "/smtp/email",
    {
      method: "POST",
      headers: input.sandbox ? { "X-Sib-Sandbox": "drop" } : undefined,
      body: JSON.stringify(payload),
    },
    settings.apiKey
  );
  if (options.record !== false) {
    await recordTransactionalDeliveries({
      kind,
      messageId: result.messageId ?? null,
      input,
    });
  }
  return result;
}

export async function subscribeToNewsletter(
  input: BrevoNewsletterInput,
  context: { ip?: string; userAgent?: string }
): Promise<void> {
  const email = input.email.trim().toLowerCase();
  const now = new Date().toISOString();
  const { error } = await supabase.from("marketing_subscriptions").upsert(
    {
      email,
      name: input.name?.trim() || null,
      status: "subscribed",
      source: input.source?.trim() || "newsletter",
      consent_ip: context.ip || null,
      consent_user_agent: context.userAgent || null,
      consented_at: now,
      unsubscribed_at: null,
      sync_status: "pending",
      sync_error: null,
      updated_at: now,
    },
    { onConflict: "email" }
  );
  if (error) throw new Error(error.message);

  try {
    const settings = await getActiveSettings();
    const listIds = settings.default_list_id ? [settings.default_list_id] : [];
    const result = (await upsertBrevoContact({
      email,
      attributes: input.name ? { NOME: input.name.trim() } : undefined,
      listIds,
      updateEnabled: true,
    })) as { id?: string | number };
    const { error: syncedError } = await supabase
      .from("marketing_subscriptions")
      .update({
        brevo_contact_id: result?.id == null ? null : String(result.id),
        brevo_list_ids: listIds,
        sync_status: "synced",
        sync_error: null,
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("email", email);
    if (syncedError) throw new Error(syncedError.message);
  } catch (syncError) {
    const message =
      syncError instanceof Error ? syncError.message : "Falha ao sincronizar";
    const { error: failedError } = await supabase
      .from("marketing_subscriptions")
      .update({
        sync_status: "failed",
        sync_error: message.slice(0, 2000),
        updated_at: new Date().toISOString(),
      })
      .eq("email", email);
    if (failedError) throw new Error(failedError.message);
  }
}
