import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ArrowRight, Package, Sparkles, Truck } from "lucide-react";
import { buildWhatsAppUrl, defaultWhatsAppMessage } from "@/lib/whatsapp";

export default function OrdersEmptyState() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-[#E8D5C4] bg-gradient-to-br from-[#FFFCF8] via-white to-[#F5F0E8] px-6 py-12 text-center md:px-10 md:py-14">
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
        <div className="absolute left-8 top-8 size-16 rounded-full bg-[#C4522A]/10 blur-xl" />
        <div className="absolute bottom-10 right-10 size-20 rounded-full bg-[#2D6A4F]/10 blur-xl" />
      </div>

      <div className="relative mx-auto mb-6 flex size-24 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#C4522A]/15 to-[#E8821A]/10 ring-1 ring-[#C4522A]/10" />
        <Package className="relative size-10 text-[#C4522A]" strokeWidth={1.5} />
        <Sparkles className="absolute -right-1 top-2 size-5 text-[#E8821A]" />
        <Truck className="absolute -bottom-1 -left-2 size-5 text-[#2D6A4F]" />
      </div>

      <h3
        className="relative text-xl font-bold text-[#3D2B1F]"
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        Nenhum pedido ainda
      </h3>
      <p
        className="relative mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#8B6F5E]"
        style={{ fontFamily: "'Nunito', sans-serif" }}
      >
        Quando você fizer sua primeira compra, ela aparecerá aqui com status, detalhes e
        acompanhamento de entrega.
      </p>

      <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button asChild className="nativa-btn-primary rounded-full px-6">
          <Link href="/#colecoes">
            Explorar coleções
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="rounded-full border-[#C4522A]/30 text-[#C4522A]">
          <a
            href={buildWhatsAppUrl(defaultWhatsAppMessage())}
            target="_blank"
            rel="noopener noreferrer"
          >
            Falar no WhatsApp
          </a>
        </Button>
      </div>
    </div>
  );
}
