export interface CustomerAddress {
  id: string;
  customerId: string;
  label: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Formato usado no checkout e em pedidos (snapshot). */
export interface ShippingAddress {
  cep: string;
  rua: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
}

export function customerAddressToShippingAddress(address: CustomerAddress): ShippingAddress {
  return {
    cep: address.cep,
    rua: address.rua,
    numero: address.numero,
    complemento: address.complemento ?? undefined,
    bairro: address.bairro,
    cidade: address.cidade,
    estado: address.estado,
  };
}

export function formatAddressLine(address: ShippingAddress | CustomerAddress): string {
  const parts = [
    `${address.rua}, ${address.numero}`,
    address.complemento ? address.complemento : null,
    address.bairro,
    `${address.cidade} - ${address.estado}`,
    formatCepDisplay(address.cep),
  ].filter(Boolean);
  return parts.join(" · ");
}

export function formatCepDisplay(cep: string): string {
  const digits = cep.replace(/\D/g, "").slice(0, 8);
  if (digits.length !== 8) return cep;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}
