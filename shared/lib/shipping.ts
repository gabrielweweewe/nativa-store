import { FREE_SHIPPING_THRESHOLD } from "@shared/const/cart";
import type {
  ShippingQuoteOption,
  ShippingQuotePackage,
} from "@shared/types/melhorEnvio";

export function applyFreeShipping(
  options: ShippingQuoteOption[],
  subtotal: number,
  enabled = true,
  threshold = FREE_SHIPPING_THRESHOLD,
): { options: ShippingQuoteOption[]; applied: boolean } {
  const sorted = options.map((option) => ({ ...option, packages: [...option.packages] }));
  if (!enabled || subtotal < threshold || sorted.length === 0) {
    return { options: sorted, applied: false };
  }
  sorted[0] = { ...sorted[0], price: 0, customPrice: 0 };
  return { options: sorted, applied: true };
}

export function groupShipmentVolumes(
  company: string,
  volumes: ShippingQuotePackage[],
): ShippingQuotePackage[][] {
  return /(correios|j&t|loggi)/i.test(company)
    ? volumes.map((volume) => [volume])
    : [volumes];
}
