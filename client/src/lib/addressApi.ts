import type { CustomerAddressInput, CustomerAddressUpdateInput } from "@shared/schemas/address";
import type { CustomerAddress } from "@shared/types/address";

export class AddressApiError extends Error {
  issues?: unknown;

  constructor(message: string, issues?: unknown) {
    super(message);
    this.name = "AddressApiError";
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
    throw new AddressApiError(body?.error ?? "Erro na requisição", body?.issues);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export function fetchCustomerAddresses(token: string) {
  return request<CustomerAddress[]>("/api/customers/me/addresses", token);
}

export function createCustomerAddress(token: string, input: CustomerAddressInput) {
  return request<CustomerAddress>("/api/customers/me/addresses", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateCustomerAddress(
  token: string,
  addressId: string,
  input: CustomerAddressUpdateInput,
) {
  return request<CustomerAddress>(
    `/api/customers/me/addresses/${encodeURIComponent(addressId)}`,
    token,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
  );
}

export function setDefaultCustomerAddress(token: string, addressId: string) {
  return request<CustomerAddress>(
    `/api/customers/me/addresses/${encodeURIComponent(addressId)}/default`,
    token,
    { method: "PATCH" },
  );
}

export function deleteCustomerAddress(token: string, addressId: string) {
  return request<void>(
    `/api/customers/me/addresses/${encodeURIComponent(addressId)}`,
    token,
    { method: "DELETE" },
  );
}
