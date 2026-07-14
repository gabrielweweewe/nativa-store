import type { LucideIcon } from "lucide-react";
import {
  CreditCard,
  Facebook,
  Instagram,
  Mail,
  MessageCircle,
  Package,
  ShoppingBag,
  Store,
  Truck,
} from "lucide-react";

export type IntegrationId =
  | "mercado-pago"
  | "melhor-envio"
  | "brevo"
  | "mercado-livre"
  | "amazon"
  | "shopee"
  | "instagram"
  | "whatsapp"
  | "facebook";

export type IntegrationCategoryId =
  | "payments"
  | "shipping"
  | "marketing"
  | "marketplaces"
  | "social";

export type IntegrationAvailability = "available" | "coming_soon";

export type IntegrationCategory = {
  id: IntegrationCategoryId;
  label: string;
  description: string;
};

export type IntegrationDefinition = {
  id: IntegrationId;
  categoryId: IntegrationCategoryId;
  name: string;
  description: string;
  availability: IntegrationAvailability;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
};

export const INTEGRATION_CATEGORIES: IntegrationCategory[] = [
  {
    id: "payments",
    label: "Pagamentos",
    description: "Receba no checkout com cartão, Pix e boleto.",
  },
  {
    id: "shipping",
    label: "Envios",
    description: "Cotação, etiquetas e rastreio de pedidos.",
  },
  {
    id: "marketing",
    label: "Marketing e CRM",
    description: "E-mail, automações e relacionamento com clientes.",
  },
  {
    id: "marketplaces",
    label: "Marketplaces",
    description: "Sincronize catálogo e pedidos com canais externos.",
  },
  {
    id: "social",
    label: "Redes sociais",
    description: "Conecte canais de atendimento e divulgação.",
  },
];

export const INTEGRATIONS: IntegrationDefinition[] = [
  {
    id: "mercado-pago",
    categoryId: "payments",
    name: "Mercado Pago",
    description: "Checkout transparente com Pix, cartão e boleto.",
    availability: "available",
    icon: CreditCard,
    iconBg: "bg-sky-50",
    iconColor: "text-sky-600",
  },
  {
    id: "melhor-envio",
    categoryId: "shipping",
    name: "Melhor Envio",
    description: "Cotação de frete, etiquetas e rastreio.",
    availability: "available",
    icon: Truck,
    iconBg: "bg-orange-50",
    iconColor: "text-[var(--admin-accent)]",
  },
  {
    id: "brevo",
    categoryId: "marketing",
    name: "Brevo",
    description: "E-mails transacionais, newsletters e automações.",
    availability: "available",
    icon: Mail,
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
  {
    id: "mercado-livre",
    categoryId: "marketplaces",
    name: "Mercado Livre",
    description: "Anúncios, estoque e pedidos no marketplace.",
    availability: "coming_soon",
    icon: ShoppingBag,
    iconBg: "bg-yellow-50",
    iconColor: "text-yellow-700",
  },
  {
    id: "amazon",
    categoryId: "marketplaces",
    name: "Amazon",
    description: "Catálogo e pedidos na Amazon Brasil.",
    availability: "coming_soon",
    icon: Package,
    iconBg: "bg-slate-100",
    iconColor: "text-slate-700",
  },
  {
    id: "shopee",
    categoryId: "marketplaces",
    name: "Shopee",
    description: "Sincronize produtos e pedidos com a Shopee.",
    availability: "coming_soon",
    icon: Store,
    iconBg: "bg-orange-50",
    iconColor: "text-orange-600",
  },
  {
    id: "instagram",
    categoryId: "social",
    name: "Instagram",
    description: "Catálogo e atendimento via Direct.",
    availability: "coming_soon",
    icon: Instagram,
    iconBg: "bg-pink-50",
    iconColor: "text-pink-600",
  },
  {
    id: "whatsapp",
    categoryId: "social",
    name: "WhatsApp",
    description: "Notificações e atendimento pelo WhatsApp Business.",
    availability: "coming_soon",
    icon: MessageCircle,
    iconBg: "bg-green-50",
    iconColor: "text-green-600",
  },
  {
    id: "facebook",
    categoryId: "social",
    name: "Facebook",
    description: "Catálogo e anúncios conectados à loja.",
    availability: "coming_soon",
    icon: Facebook,
    iconBg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
];

export function getIntegrationById(
  id: string | null | undefined
): IntegrationDefinition | undefined {
  if (!id) return undefined;
  return INTEGRATIONS.find(item => item.id === id);
}

export function getIntegrationsByCategory(
  categoryId: IntegrationCategoryId
): IntegrationDefinition[] {
  return INTEGRATIONS.filter(item => item.categoryId === categoryId);
}
