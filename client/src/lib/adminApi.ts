import type {
  AdminCustomerDetail,
  AdminCustomerSummary,
} from "@shared/types/customer";
import type { DashboardPeriod, DashboardStats } from "@shared/types/dashboard";
import type { AdminNotification } from "@shared/types/notification";
import type {
  AdminOrderDetail,
  AdminOrderSummary,
  OrderStatus,
} from "@shared/types/order";
import type { Banner, BannerInput } from "@shared/types/banner";
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
import type { ProductInput } from "@shared/schemas/product";
import type { Product } from "@shared/types/product";
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
  folder: "products" | "banners" = "products"
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

export function retryAdminOrderShipment(orderId: string) {
  return request<AdminOrderDetail>(
    `/api/admin/orders/${encodeURIComponent(orderId)}/shipment/retry`,
    { method: "POST" }
  );
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
