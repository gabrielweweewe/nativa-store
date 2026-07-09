import type { CheckoutInput } from "@shared/schemas/order";
import type { CheckoutResponse, Order, OrderSummary } from "@shared/types/order";

export class OrderApiError extends Error {
  issues?: unknown;

  constructor(message: string, issues?: unknown) {
    super(message);
    this.name = "OrderApiError";
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

async function request<T>(url: string, token: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
    ...options,
  });

  if (!response.ok) {
    const body = await parseJsonSafe(response);
    throw new OrderApiError(body?.error ?? "Erro na requisição", body?.issues);
  }

  return response.json();
}

export function checkoutOrder(token: string, input: CheckoutInput) {
  return request<CheckoutResponse>("/api/orders/checkout", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchCustomerOrders(token: string) {
  return request<OrderSummary[]>("/api/orders/me", token);
}

export function fetchCustomerOrder(token: string, orderId: string) {
  return request<Order>("/api/orders/" + encodeURIComponent(orderId), token);
}
