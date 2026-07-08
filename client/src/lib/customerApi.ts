import type { CustomerProfile, CustomerProfileUpdateInput } from "@shared/types/customer";

export class CustomerApiError extends Error {
  issues?: unknown;

  constructor(message: string, issues?: unknown) {
    super(message);
    this.name = "CustomerApiError";
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
    throw new CustomerApiError(body?.error ?? "Erro na requisição", body?.issues);
  }

  return response.json();
}

export function fetchCustomerProfile(token: string) {
  return request<CustomerProfile>("/api/customers/me", token);
}

export function updateCustomerProfile(token: string, input: CustomerProfileUpdateInput) {
  return request<CustomerProfile>("/api/customers/me", token, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}
