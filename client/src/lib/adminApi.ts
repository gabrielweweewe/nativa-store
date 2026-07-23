import type {
  AdminCustomerDetail,
  AdminCustomerSummary,
} from "@shared/types/customer";
import type { DashboardPeriod, DashboardStats } from "@shared/types/dashboard";
import type { AdminNotification } from "@shared/types/notification";
import type {
  AdminOrderDetail,
  AdminOrderSummary,
  FulfillmentStatus,
  OrderStatus,
} from "@shared/types/order";
import type { Banner, BannerInput } from "@shared/types/banner";
import type { Coupon, CouponInput } from "@shared/types/coupon";
import type { Region, RegionInput } from "@shared/types/region";
import type {
  MelhorEnvioSettingsInput,
  MelhorEnvioStatus,
} from "@shared/types/melhorEnvio";
import type {
  MercadoPagoAdminStatus,
  MercadoPagoEnvironment,
  MercadoPagoSettingsInput,
} from "@shared/types/mercadoPago";
import type {
  MetaCatalogAdminStatus,
  MetaCatalogSettingsInput,
  MetaCatalogTestResult,
} from "@shared/types/metaCatalog";
import type { ProductInput } from "@shared/schemas/product";
import type { Product } from "@shared/types/product";
import type { QuizExportPayload, QuizImportReport, QuizQuestion, QuizResult } from "@shared/types/quiz";
import { supabaseClient } from "@/lib/supabaseClient";

export class AdminApiError extends Error {
  issues?: unknown;

  constructor(message: string, issues?: unknown) {
    super(message);
    this.name = "AdminApiError";
    this.issues = issues;
  }
}

async function parseJsonSafe(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    ...options,
  });

  if (!response.ok) {
    const body = await parseJsonSafe(response);
    throw new AdminApiError(body?.error ?? "Erro na requisição", body?.issues);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export function adminLogin(password: string) {
  return request<{ authenticated: boolean }>("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function adminLogout() {
  return request<{ authenticated: boolean }>("/api/admin/logout", {
    method: "POST",
  });
}

export function adminMe() {
  return request<{ authenticated: boolean }>("/api/admin/me");
}

export async function uploadProductImage(
  file: File,
  folder: "products" | "banners" | "quiz" = "products"
): Promise<{ url: string }> {
  // GIF e arquivos maiores: upload direto ao Supabase (Vercel limita ~4,5MB no body da function).
  const mustUseDirectUpload =
    file.type === "image/gif" || file.size > 3 * 1024 * 1024;

  if (mustUseDirectUpload) {
    if (file.size > 15 * 1024 * 1024) {
      throw new AdminApiError("Arquivo muito grande. O limite é 15MB por imagem.");
    }

    const signed = await request<{
      path: string;
      token: string;
      publicUrl: string;
    }>("/api/admin/uploads/sign", {
      method: "POST",
      body: JSON.stringify({ folder, contentType: file.type || "image/gif" }),
    });

    const { error } = await supabaseClient.storage
      .from("product-images")
      .uploadToSignedUrl(signed.path, signed.token, file, {
        contentType: file.type || "image/gif",
        upsert: false,
      });

    if (error) {
      throw new AdminApiError(error.message || "Falha no upload direto da imagem");
    }

    return { url: signed.publicUrl };
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const response = await fetch("/api/admin/uploads", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const body = await parseJsonSafe(response);

  if (!response.ok) {
    throw new AdminApiError(body?.error ?? "Erro ao enviar imagem");
  }

  return body;
}

export function createProduct(input: ProductInput) {
  return request<Product>("/api/products", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateProduct(slug: string, input: ProductInput) {
  return request<Product>(`/api/products/${encodeURIComponent(slug)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteProduct(slug: string) {
  return request<void>(`/api/products/${encodeURIComponent(slug)}`, {
    method: "DELETE",
  });
}

export interface BulkImportError {
  index: number;
  issues: unknown;
}

export interface BulkImportResponse {
  created: number;
  updated: number;
  total: number;
  errors: BulkImportError[];
}

export function bulkImportProducts(products: ProductInput[]) {
  return request<BulkImportResponse>("/api/products/bulk", {
    method: "POST",
    body: JSON.stringify({ products }),
  });
}

export function fetchAdminDashboard(period: DashboardPeriod = "30d") {
  return request<DashboardStats>(
    `/api/admin/dashboard?period=${encodeURIComponent(period)}`
  );
}

export function fetchAdminOrders() {
  return request<AdminOrderSummary[]>("/api/admin/orders");
}

export function fetchAdminOrder(orderId: string) {
  return request<AdminOrderDetail>(
    `/api/admin/orders/${encodeURIComponent(orderId)}`
  );
}

export function updateAdminOrderStatus(orderId: string, status: OrderStatus) {
  return request<AdminOrderDetail>(
    `/api/admin/orders/${encodeURIComponent(orderId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );
}

export function updateAdminOrderFulfillment(
  orderId: string,
  input: {
    status: FulfillmentStatus;
    trackingCode?: string | null;
    trackingUrl?: string | null;
  }
) {
  return request<AdminOrderDetail>(
    `/api/admin/orders/${encodeURIComponent(orderId)}/fulfillment`,
    { method: "PATCH", body: JSON.stringify(input) }
  );
}

export function retryAdminOrderShipment(orderId: string) {
  return request<AdminOrderDetail>(
    `/api/admin/orders/${encodeURIComponent(orderId)}/shipment/retry`,
    { method: "POST" }
  );
}

export function retryAdminOrderEmail(orderId: string, deliveryId: string) {
  return request<AdminOrderDetail>(
    `/api/admin/orders/${encodeURIComponent(orderId)}/emails/${encodeURIComponent(
      deliveryId
    )}/retry`,
    { method: "POST" }
  );
}

export function deleteAdminOrders(ids: string[]) {
  return request<{ deleted: number }>("/api/admin/orders/bulk/delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}

async function downloadAdminOrdersExport(
  ids: string[],
  format: "csv" | "pdf"
): Promise<void> {
  const response = await fetch("/api/admin/orders/bulk/export", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids, format }),
  });

  if (!response.ok) {
    const body = await parseJsonSafe(response);
    throw new AdminApiError(body?.error ?? "Erro ao exportar pedidos", body?.issues);
  }

  const blob = await response.blob();
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="?([^"]+)"?/i);
  const filename =
    match?.[1] ??
    `pedidos-nativa-${new Date().toISOString().slice(0, 10)}.${format}`;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function exportAdminOrdersCsv(ids: string[]) {
  return downloadAdminOrdersExport(ids, "csv");
}

export function exportAdminOrdersPdf(ids: string[]) {
  return downloadAdminOrdersExport(ids, "pdf");
}

export function fetchAdminCustomers() {
  return request<AdminCustomerSummary[]>("/api/admin/customers");
}

export function fetchAdminCustomer(customerId: string) {
  return request<AdminCustomerDetail>(
    `/api/admin/customers/${encodeURIComponent(customerId)}`
  );
}

export interface AdminUnreadCountResponse {
  count: number;
  byType: Record<"new_order" | "new_customer", number>;
}

export function fetchAdminNotifications() {
  return request<AdminNotification[]>("/api/admin/notifications");
}

export function fetchAdminUnreadCount() {
  return request<AdminUnreadCountResponse>(
    "/api/admin/notifications/unread-count"
  );
}

export function markAdminNotificationRead(notificationId: string) {
  return request<AdminNotification>(
    `/api/admin/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: "PATCH" }
  );
}

export function markAllAdminNotificationsRead() {
  return request<{ success: true }>("/api/admin/notifications/read-all", {
    method: "PATCH",
  });
}

export function fetchAdminBanners() {
  return request<Banner[]>("/api/admin/banners");
}

export function createAdminBanner(input: BannerInput) {
  return request<Banner>("/api/admin/banners", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminBanner(id: string, input: BannerInput) {
  return request<Banner>(`/api/admin/banners/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteAdminBanner(id: string) {
  return request<void>(`/api/admin/banners/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function reorderAdminBanners(orderedIds: string[]) {
  return request<Banner[]>("/api/admin/banners/reorder", {
    method: "PATCH",
    body: JSON.stringify({ orderedIds }),
  });
}

export function fetchAdminCoupons() {
  return request<Coupon[]>("/api/admin/coupons");
}

export function createAdminCoupon(input: CouponInput) {
  return request<Coupon>("/api/admin/coupons", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminCoupon(id: string, input: CouponInput) {
  return request<Coupon>(`/api/admin/coupons/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteAdminCoupon(id: string) {
  return request<void>(`/api/admin/coupons/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export function fetchAdminRegions() {
  return request<Region[]>("/api/admin/regions");
}

export function fetchAdminRegion(id: string) {
  return request<Region>(`/api/admin/regions/${encodeURIComponent(id)}`);
}

export function createAdminRegion(input: RegionInput) {
  return request<Region>("/api/admin/regions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAdminRegion(id: string, input: RegionInput) {
  return request<Region>(`/api/admin/regions/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function deleteAdminRegion(id: string) {
  return request<void>(`/api/admin/regions/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export type MelhorEnvioAdminStatus = MelhorEnvioStatus & {
  suggestedRedirectUri: string;
};

export function fetchMelhorEnvioStatus() {
  return request<MelhorEnvioAdminStatus>("/api/admin/melhor-envio/status");
}

export function updateMelhorEnvioSettings(input: MelhorEnvioSettingsInput) {
  return request<MelhorEnvioAdminStatus>("/api/admin/melhor-envio/settings", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function disconnectMelhorEnvio() {
  return request<MelhorEnvioAdminStatus>("/api/admin/melhor-envio/disconnect", {
    method: "POST",
  });
}

export function fetchMercadoPagoStatus(environment: MercadoPagoEnvironment) {
  return request<MercadoPagoAdminStatus>(
    `/api/admin/mercado-pago/status?environment=${encodeURIComponent(environment)}`
  );
}

export function updateMercadoPagoSettings(input: MercadoPagoSettingsInput) {
  return request<MercadoPagoAdminStatus>("/api/admin/mercado-pago/settings", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function testMercadoPagoCredentials(
  environment: MercadoPagoEnvironment
) {
  return request<{ success: true }>("/api/admin/mercado-pago/test", {
    method: "POST",
    body: JSON.stringify({ environment }),
  });
}

export function fetchMetaCatalogStatus() {
  return request<MetaCatalogAdminStatus>("/api/admin/meta-catalog/status");
}

export function updateMetaCatalogSettings(input: MetaCatalogSettingsInput) {
  return request<MetaCatalogAdminStatus>("/api/admin/meta-catalog/settings", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function testMetaCatalogFeed() {
  return request<MetaCatalogTestResult>("/api/admin/meta-catalog/test", {
    method: "POST",
  });
}

export interface BrevoStatus {
  enabled: boolean;
  configured: boolean;
  hasApiKey: boolean;
  hasWebhookToken: boolean;
  webhookUrl: string;
  connected?: boolean;
  accountEmail?: string | null;
  webhookConfigured?: boolean;
  lastTestedAt?: string | null;
  defaultSenderId?: number | null;
  defaultSenderEmail?: string;
  defaultSenderName?: string;
  replyTo?: string;
  merchantNotifyEmail?: string;
  defaultListId?: number | null;
  templateOrderReceived?: number | null;
  templateOrderReceivedMerchant?: number | null;
  templatePaymentApproved?: number | null;
  templatePaymentFailed?: number | null;
  templatePaymentRefunded?: number | null;
  templateOrderProcessing?: number | null;
  templateOrderShipped?: number | null;
  templateOrderDelivered?: number | null;
}

export interface BrevoSettingsInput {
  enabled: boolean;
  apiKey?: string;
  webhookToken?: string;
  defaultSenderId?: number | null;
  defaultSenderEmail?: string;
  defaultSenderName?: string;
  replyTo?: string;
  merchantNotifyEmail?: string;
  defaultListId?: number | null;
  templateOrderReceived?: number | null;
  templateOrderReceivedMerchant?: number | null;
  templatePaymentApproved?: number | null;
  templatePaymentFailed?: number | null;
  templatePaymentRefunded?: number | null;
  templateOrderProcessing?: number | null;
  templateOrderShipped?: number | null;
  templateOrderDelivered?: number | null;
}

export interface BrevoSender {
  id: number;
  name: string;
  email: string;
  active?: boolean;
}

export interface BrevoTemplate {
  id: number;
  name: string;
  subject?: string;
  htmlContent?: string;
  isActive?: boolean;
}

export interface BrevoList {
  id: number;
  name: string;
  totalSubscribers?: number;
  createdAt?: string;
}

export interface BrevoContact {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  listIds?: number[];
  subscribed?: boolean;
  createdAt?: string;
}

export type BrevoCampaignStatus =
  | "draft"
  | "scheduled"
  | "sent"
  | "paused"
  | "failed";

export interface BrevoCampaign {
  id: string | number;
  name: string;
  subject: string;
  htmlContent?: string;
  senderId?: number;
  listIds?: number[];
  status: BrevoCampaignStatus;
  scheduledAt?: string | null;
  sentAt?: string | null;
  createdAt?: string;
}

export interface BrevoCampaignInput {
  name: string;
  subject: string;
  htmlContent: string;
  senderId: number;
  listIds: number[];
}

export interface BrevoCampaignMetrics {
  delivered: number;
  opened: number;
  uniqueOpens?: number;
  clicked: number;
  uniqueClicks?: number;
  bounced: number;
  unsubscribed: number;
  openRate: number;
  clickRate: number;
}

export function fetchBrevoStatus() {
  return request<BrevoStatus>("/api/admin/brevo/status");
}

export function updateBrevoSettings(input: BrevoSettingsInput) {
  return request<BrevoStatus>("/api/admin/brevo/settings", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function testBrevoConnection() {
  return request<{ success: true; account?: unknown }>(
    "/api/admin/brevo/test",
    { method: "POST" }
  );
}

export function testBrevoOrderTemplate(input: {
  event: "order_received" | "order_received_merchant" | "payment_approved";
  email: string;
}) {
  return request<{ messageId?: string }>(
    "/api/admin/brevo/emails/test-template",
    {
      method: "POST",
      body: JSON.stringify(input),
    }
  );
}

export interface StoreEmailTemplate {
  event: "order_received" | "order_received_merchant" | "payment_approved";
  name: string;
  subject: string;
  htmlContent: string;
  enabled: boolean;
  updatedAt: string;
}

export function fetchStoreEmailTemplates() {
  return request<StoreEmailTemplate[]>("/api/admin/brevo/store-templates");
}

export function updateStoreEmailTemplate(input: {
  event: StoreEmailTemplate["event"];
  name?: string;
  subject: string;
  htmlContent: string;
  enabled?: boolean;
}) {
  return request<StoreEmailTemplate>("/api/admin/brevo/store-templates", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function configureBrevoWebhook() {
  return request<{ success: true; webhookUrl: string }>(
    "/api/admin/brevo/webhook/configure",
    { method: "POST" }
  );
}

export async function fetchBrevoTemplates() {
  return request<BrevoTemplate[]>("/api/admin/brevo/templates");
}

export async function fetchBrevoSenders() {
  return request<BrevoSender[]>("/api/admin/brevo/senders");
}

export async function fetchBrevoLists() {
  const result = await request<
    Array<BrevoList & { uniqueSubscribers?: number }>
  >("/api/admin/brevo/lists");
  return result.map(list => ({
    ...list,
    totalSubscribers: list.totalSubscribers ?? list.uniqueSubscribers ?? 0,
  }));
}

export function createBrevoList(name: string, folderId?: number) {
  return request<BrevoList>("/api/admin/brevo/lists", {
    method: "POST",
    body: JSON.stringify({ name, folderId }),
  });
}

export function deleteBrevoList(listId: number) {
  return request<void>(`/api/admin/brevo/lists/${listId}`, {
    method: "DELETE",
  });
}

export async function fetchBrevoContacts(params: {
  search?: string;
  listId?: number;
} = {}) {
  const query = new URLSearchParams({ limit: "500" });
  if (params.search?.trim()) query.set("search", params.search.trim());
  if (params.listId) query.set("listId", String(params.listId));
  const result = await request<
    Array<{
      id: string | number;
      email: string;
      firstName?: string;
      lastName?: string;
      attributes?: Record<string, string | undefined>;
      listIds?: number[];
      emailBlacklisted?: boolean;
      subscribed?: boolean;
      createdAt?: string;
    }>
  >(`/api/admin/brevo/contacts?${query.toString()}`);
  return result.map(contact => ({
    id: String(contact.id),
    email: contact.email,
    firstName:
      contact.firstName ??
      contact.attributes?.NOME ??
      contact.attributes?.FIRSTNAME,
    lastName:
      contact.lastName ??
      contact.attributes?.SOBRENOME ??
      contact.attributes?.LASTNAME,
    listIds: contact.listIds ?? [],
    subscribed: contact.subscribed ?? !contact.emailBlacklisted,
    createdAt: contact.createdAt,
  }));
}

export function createBrevoContact(input: {
  email: string;
  firstName?: string;
  lastName?: string;
  listIds: number[];
}) {
  return request<BrevoContact>("/api/admin/brevo/contacts", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      attributes: {
        ...(input.firstName ? { NOME: input.firstName } : {}),
        ...(input.lastName ? { SOBRENOME: input.lastName } : {}),
      },
      listIds: input.listIds,
      updateEnabled: true,
    }),
  }).then(result => ({
    id: String(result.id ?? input.email),
    email: result.email ?? input.email,
    firstName: result.firstName ?? input.firstName,
    lastName: result.lastName ?? input.lastName,
    listIds: result.listIds ?? input.listIds,
    subscribed: result.subscribed ?? true,
  }));
}

export function updateBrevoContactLists(email: string, listIds: number[]) {
  return request<BrevoContact>(
    `/api/admin/brevo/contacts/${encodeURIComponent(email)}/lists`,
    {
      method: "PUT",
      body: JSON.stringify({ listIds }),
    }
  );
}

export function removeBrevoContact(email: string) {
  return request<void>(
    `/api/admin/brevo/contacts/${encodeURIComponent(email)}`,
    { method: "DELETE" }
  );
}

export interface MarketingSubscription {
  id: string;
  email: string;
  name: string | null;
  status: "subscribed" | "unsubscribed";
  source: string;
  sync_status: "pending" | "synced" | "failed";
  sync_error: string | null;
  brevo_contact_id: string | null;
  brevo_list_ids: number[];
  consented_at: string;
  synced_at: string | null;
  created_at: string;
}

export function fetchMarketingSubscriptions() {
  return request<MarketingSubscription[]>(
    "/api/admin/brevo/marketing-subscriptions?limit=200"
  );
}

export function resyncMarketingSubscriptions(emails?: string[]) {
  return request<{
    total: number;
    synced: number;
    failed: number;
    results: Array<{ email: string; ok: boolean; error?: string }>;
  }>("/api/admin/brevo/marketing-subscriptions/resync", {
    method: "POST",
    body: JSON.stringify(emails?.length ? { emails } : {}),
  });
}

type BrevoRawCampaign = {
  id: string | number;
  name?: string;
  subject?: string;
  htmlContent?: string;
  sender?: { id?: number; email?: string; name?: string };
  recipients?: { lists?: number[]; listIds?: number[] };
  status?: string;
  scheduledAt?: string;
  sentDate?: string;
  createdAt?: string;
};

function normalizeBrevoCampaign(campaign: BrevoRawCampaign): BrevoCampaign {
  const rawStatus = campaign.status?.toLowerCase();
  const status: BrevoCampaignStatus =
    rawStatus === "sent"
      ? "sent"
      : rawStatus === "queued" || Boolean(campaign.scheduledAt)
        ? "scheduled"
        : rawStatus === "suspended" || rawStatus === "archive"
          ? "paused"
          : rawStatus === "draft"
            ? "draft"
            : "failed";
  return {
    id: campaign.id,
    name: campaign.name ?? `Campanha ${campaign.id}`,
    subject: campaign.subject ?? "Sem assunto",
    htmlContent: campaign.htmlContent,
    senderId: campaign.sender?.id,
    listIds: campaign.recipients?.lists ?? campaign.recipients?.listIds ?? [],
    status,
    scheduledAt: campaign.scheduledAt,
    sentAt: campaign.sentDate,
    createdAt: campaign.createdAt,
  };
}

export async function fetchBrevoCampaigns() {
  const result = await request<BrevoRawCampaign[]>(
    "/api/admin/brevo/campaigns"
  );
  return result.map(normalizeBrevoCampaign);
}

export async function fetchBrevoCampaign(campaignId: string) {
  const campaign = await request<BrevoRawCampaign>(
    `/api/admin/brevo/campaigns/${encodeURIComponent(campaignId)}`
  );
  return normalizeBrevoCampaign(campaign);
}

function brevoCampaignPayload(input: BrevoCampaignInput) {
  return {
    name: input.name,
    subject: input.subject,
    htmlContent: input.htmlContent,
    senderId: input.senderId,
    recipients: { listIds: input.listIds },
  };
}

export async function createBrevoCampaign(input: BrevoCampaignInput) {
  const result = await request<{ id: string | number }>(
    "/api/admin/brevo/campaigns",
    {
    method: "POST",
      body: JSON.stringify(brevoCampaignPayload(input)),
    }
  );
  return { ...input, id: result.id, status: "draft" as const };
}

export function updateBrevoCampaign(
  campaignId: string,
  input: BrevoCampaignInput
) {
  return request<BrevoRawCampaign>(
    `/api/admin/brevo/campaigns/${encodeURIComponent(campaignId)}`,
    { method: "PUT", body: JSON.stringify(brevoCampaignPayload(input)) }
  ).then(result =>
    normalizeBrevoCampaign({ ...result, id: result.id ?? campaignId })
  );
}

export function sendBrevoCampaign(campaignId: string) {
  return request<unknown>(
    `/api/admin/brevo/campaigns/${encodeURIComponent(campaignId)}/send-now`,
    { method: "POST" }
  );
}

export function scheduleBrevoCampaign(campaignId: string, scheduledAt: string) {
  return request<unknown>(
    `/api/admin/brevo/campaigns/${encodeURIComponent(campaignId)}/schedule`,
    { method: "POST", body: JSON.stringify({ scheduledAt }) }
  );
}

export function sendBrevoTestEmail(input: {
  email: string;
  subject: string;
  htmlContent: string;
  senderId: number;
}) {
  return request<{ success: true }>("/api/admin/brevo/campaigns/test", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchAdminQuiz() {
  return request<{ questions: QuizQuestion[]; results: QuizResult[] }>("/api/admin/quiz");
}

export function exportQuiz() {
  return request<QuizExportPayload>("/api/admin/quiz/export");
}

export function importQuiz(payload: QuizExportPayload) {
  return request<QuizImportReport>("/api/admin/quiz/import", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateQuizOptionImage(
  questionId: string,
  optionId: string,
  imageUrl: string,
) {
  return request<QuizQuestion>(
    `/api/admin/quiz/questions/${encodeURIComponent(questionId)}/options/${encodeURIComponent(optionId)}/image`,
    {
      method: "PATCH",
      body: JSON.stringify({ imageUrl }),
    },
  );
}

export async function fetchBrevoCampaignMetrics(campaignId: string) {
  const result = await request<BrevoCampaignMetrics & {
    statistics?: {
      globalStats?: {
        delivered?: number;
        viewed?: number;
        uniqueViews?: number;
        clicks?: number;
        clickers?: number;
        hardBounces?: number;
        softBounces?: number;
        unsubscriptions?: number;
      };
    };
  }>(
    `/api/admin/brevo/campaigns/${encodeURIComponent(campaignId)}/metrics`
  );
  if (
    typeof result.delivered === "number" &&
    typeof result.openRate === "number"
  ) {
    return result;
  }
  const stats = result.statistics?.globalStats ?? {};
  const delivered = stats.delivered ?? 0;
  const opened = stats.uniqueViews ?? stats.viewed ?? 0;
  const clicked = stats.clickers ?? stats.clicks ?? 0;
  return {
    delivered,
    opened,
    uniqueOpens: stats.uniqueViews,
    clicked,
    uniqueClicks: stats.clickers,
    bounced: (stats.hardBounces ?? 0) + (stats.softBounces ?? 0),
    unsubscribed: stats.unsubscriptions ?? 0,
    openRate: delivered ? (opened / delivered) * 100 : 0,
    clickRate: delivered ? (clicked / delivered) * 100 : 0,
  };
}
