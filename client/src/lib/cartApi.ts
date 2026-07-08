import type { Cart } from "@shared/types/cart";
import type {
  CartAddItemInput,
  CartApplyCouponInput,
  CartUpdateItemInput,
} from "@shared/schemas/cart";

export class CartApiError extends Error {
  issues?: unknown;

  constructor(message: string, issues?: unknown) {
    super(message);
    this.name = "CartApiError";
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

function buildHeaders(token?: string | null): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function request<T>(
  url: string,
  options: RequestInit = {},
  token?: string | null,
): Promise<T> {
  const response = await fetch(url, {
    credentials: "include",
    headers: buildHeaders(token),
    ...options,
  });

  if (!response.ok) {
    const body = await parseJsonSafe(response);
    throw new CartApiError(body?.error ?? "Erro na requisição", body?.issues);
  }

  return response.json();
}

export function fetchCart(token?: string | null) {
  return request<Cart>("/api/cart", {}, token);
}

export function addCartItem(input: CartAddItemInput, token?: string | null) {
  return request<Cart>(
    "/api/cart/items",
    { method: "POST", body: JSON.stringify(input) },
    token,
  );
}

export function updateCartItem(itemId: string, input: CartUpdateItemInput, token?: string | null) {
  return request<Cart>(
    `/api/cart/items/${encodeURIComponent(itemId)}`,
    { method: "PATCH", body: JSON.stringify(input) },
    token,
  );
}

export function removeCartItem(itemId: string, token?: string | null) {
  return request<Cart>(
    `/api/cart/items/${encodeURIComponent(itemId)}`,
    { method: "DELETE" },
    token,
  );
}

export function clearCart(token?: string | null) {
  return request<Cart>("/api/cart", { method: "DELETE" }, token);
}

export function applyCartCoupon(input: CartApplyCouponInput, token?: string | null) {
  return request<Cart>(
    "/api/cart/coupon",
    { method: "PATCH", body: JSON.stringify(input) },
    token,
  );
}

export function mergeCart(token: string) {
  return request<Cart>("/api/cart/merge", { method: "POST" }, token);
}
