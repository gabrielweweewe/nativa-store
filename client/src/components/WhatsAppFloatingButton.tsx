import { useLocation } from "wouter";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { buildWhatsAppUrl, defaultWhatsAppMessage } from "@/lib/whatsapp";

/**
 * Botão flutuante de WhatsApp — canto inferior direito.
 * Oculto no painel admin e no checkout. Na PDP sobe um pouco para não cobrir a barra sticky.
 */
export default function WhatsAppFloatingButton() {
  const [location] = useLocation();

  const isAdmin = location === "/admin" || location.startsWith("/admin/");
  const isCheckout = location === "/checkout" || location.startsWith("/checkout/");
  const isProductPage = location.startsWith("/produto/");

  if (isAdmin || isCheckout) return null;

  return (
    <a
      href={buildWhatsAppUrl(defaultWhatsAppMessage())}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      title="Falar no WhatsApp"
      className={`whatsapp-fab group fixed right-4 z-[45] flex size-14 items-center justify-center rounded-full text-white outline-none transition-transform duration-300 hover:scale-105 focus-visible:ring-2 focus-visible:ring-[#25D366]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F0E8] sm:right-6 ${
        isProductPage
          ? "bottom-[calc(5.75rem+env(safe-area-inset-bottom))] lg:bottom-8"
          : "bottom-[calc(1.25rem+env(safe-area-inset-bottom))] sm:bottom-8"
      }`}
    >
      <span className="whatsapp-fab-pulse pointer-events-none absolute inset-0 rounded-full" aria-hidden />
      <WhatsAppIcon size={28} className="relative drop-shadow-sm" />
      <span
        className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-full bg-[#1A3D2B] px-3 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-all duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 sm:block"
        style={{ fontFamily: "'Nunito', sans-serif" }}
      >
        Fale conosco
      </span>
    </a>
  );
}
