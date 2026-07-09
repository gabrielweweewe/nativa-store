export interface ViaCepResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  erro?: boolean;
}

export interface ViaCepAddress {
  rua: string;
  bairro: string;
  cidade: string;
  estado: string;
  complemento?: string;
}

export function normalizeCepDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8);
}

export function formatCepInput(value: string): string {
  const digits = normalizeCepDigits(value);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export async function fetchAddressByCep(cep: string): Promise<ViaCepAddress | null> {
  const digits = normalizeCepDigits(cep);
  if (digits.length !== 8) return null;

  const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
  if (!response.ok) return null;

  const data = (await response.json()) as ViaCepResponse;
  if (data.erro) return null;

  return {
    rua: data.logradouro ?? "",
    bairro: data.bairro ?? "",
    cidade: data.localidade ?? "",
    estado: data.uf ?? "",
    complemento: data.complemento || undefined,
  };
}
