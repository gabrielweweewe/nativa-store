import type { CustomerAddress } from "@shared/types/address";

export interface CustomerAddressRow {
  id: string;
  customer_id: string;
  label: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export function mapCustomerAddressRowToCustomerAddress(row: CustomerAddressRow): CustomerAddress {
  return {
    id: row.id,
    customerId: row.customer_id,
    label: row.label,
    cep: row.cep,
    rua: row.rua,
    numero: row.numero,
    complemento: row.complemento,
    bairro: row.bairro,
    cidade: row.cidade,
    estado: row.estado,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCustomerAddressToRow(
  customerId: string,
  input: {
    label: string;
    cep: string;
    rua: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    isDefault?: boolean;
  },
) {
  return {
    customer_id: customerId,
    label: input.label,
    cep: input.cep,
    rua: input.rua,
    numero: input.numero,
    complemento: input.complemento ?? null,
    bairro: input.bairro,
    cidade: input.cidade,
    estado: input.estado,
    is_default: input.isDefault ?? false,
  };
}
