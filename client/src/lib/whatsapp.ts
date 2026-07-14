import { appPath } from "@/lib/appUrl";
import { formatPrice } from "@/lib/products";

/** Número com DDI (ex.: 5511976984558). Sobrescreva com VITE_WHATSAPP_NUMBER. */
export const WHATSAPP_NUMBER =
  ((import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) ?? "5511976984558").replace(
    /\D/g,
    "",
  );

export const WHATSAPP_DISPLAY = "(11) 97698-4558";

export function buildWhatsAppUrl(message?: string): string {
  const base = `https://wa.me/${WHATSAPP_NUMBER}`;
  if (!message?.trim()) return base;
  return `${base}?text=${encodeURIComponent(message.trim())}`;
}

export function defaultWhatsAppMessage(): string {
  return "Olá! Vim pela Nativa Store e gostaria de saber mais. 🌿";
}

export function productInterestWhatsAppMessage(product: {
  name: string;
  slug: string;
  price: number;
}): string {
  const url = appPath(`/produto/${product.slug}`);
  return [
    `Olá! Me interessei pelo produto *${product.name}* da Nativa Store.`,
    "",
    `Valor: ${formatPrice(product.price)}`,
    `Link: ${url}`,
    "",
    "Gostaria de mais informações. 🌿",
  ].join("\n");
}
