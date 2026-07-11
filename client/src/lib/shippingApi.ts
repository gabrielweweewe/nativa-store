import type { ShippingQuoteInput } from "@shared/schemas/melhorEnvio";
import type { ShippingQuoteResult } from "@shared/types/melhorEnvio";

export class ShippingApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ShippingApiError";
  }
}

export async function fetchShippingQuote(
  input: ShippingQuoteInput,
): Promise<ShippingQuoteResult> {
  const response = await fetch("/api/shipping/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(input),
  });

  const body = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ShippingApiError(
      (body && typeof body.error === "string" && body.error) || "Erro ao calcular frete",
    );
  }

  return body as ShippingQuoteResult;
}
