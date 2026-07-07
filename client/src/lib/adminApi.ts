import type { ProductInput } from "@shared/schemas/product";
import type { Product } from "@shared/types/product";

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
  return request<{ authenticated: boolean }>("/api/admin/logout", { method: "POST" });
}

export function adminMe() {
  return request<{ authenticated: boolean }>("/api/admin/me");
}

export async function uploadProductImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);

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
