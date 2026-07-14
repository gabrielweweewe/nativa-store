import WhatsAppIcon from "@/components/WhatsAppIcon";
import { buildWhatsAppUrl, productInterestWhatsAppMessage } from "@/lib/whatsapp";

type ProductWhatsAppButtonProps = {
  name: string;
  slug: string;
  price: number;
  variant?: "full" | "icon";
  className?: string;
};

export default function ProductWhatsAppButton({
  name,
  slug,
  price,
  variant = "full",
  className = "",
}: ProductWhatsAppButtonProps) {
  const href = buildWhatsAppUrl(productInterestWhatsAppMessage({ name, slug, price }));

  if (variant === "icon") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Tirar dúvidas sobre ${name} no WhatsApp`}
        title="Tirar dúvidas no WhatsApp"
        className={`flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#25D366] text-white shadow-md shadow-[#25D366]/30 transition-transform duration-200 hover:scale-105 active:scale-95 ${className}`}
      >
        <WhatsAppIcon size={22} />
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl border-2 border-[#25D366]/35 bg-gradient-to-r from-[#25D366]/12 via-[#20BD5A]/08 to-[#128C7E]/10 px-5 py-3.5 text-sm font-bold text-[#0E6B4F] shadow-[0_8px_24px_rgba(37,211,102,0.12)] transition-all duration-200 hover:border-[#25D366]/55 hover:from-[#25D366]/18 hover:to-[#128C7E]/16 hover:shadow-[0_10px_28px_rgba(37,211,102,0.2)] hover:scale-[1.01] active:scale-[0.99] ${className}`}
      style={{ fontFamily: "'Nunito', sans-serif" }}
    >
      <span
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(circle at 20% 50%, rgba(37,211,102,0.18), transparent 55%)",
        }}
        aria-hidden
      />
      <span className="relative flex size-9 items-center justify-center rounded-full bg-[#25D366] text-white shadow-md shadow-[#25D366]/35 transition-transform duration-200 group-hover:scale-110">
        <WhatsAppIcon size={18} />
      </span>
      <span className="relative flex flex-col items-start leading-tight sm:flex-row sm:items-center sm:gap-1.5">
        <span>Tenho interesse — WhatsApp</span>
        <span className="text-[11px] font-semibold text-[#128C7E]/90 sm:text-xs">
          Resposta rápida
        </span>
      </span>
    </a>
  );
}
