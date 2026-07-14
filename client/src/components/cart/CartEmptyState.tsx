import { Link } from "wouter";
import { ShoppingBag } from "lucide-react";

export default function CartEmptyState({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        compact ? "py-10 px-4" : "py-16 px-6"
      }`}
    >
      <div
        className={`mb-4 flex items-center justify-center rounded-full bg-[#C4522A]/10 text-[#C4522A] ${
          compact ? "w-16 h-16" : "w-20 h-20"
        }`}
      >
        <ShoppingBag size={compact ? 28 : 36} strokeWidth={1.5} />
      </div>
      <h3
        className={`font-semibold text-[#3D2B1F] mb-2 ${compact ? "text-lg" : "text-xl"}`}
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Seu carrinho está vazio
      </h3>
      <p
        className="text-sm text-[#8B6F5E] mb-6 max-w-xs"
        style={{ fontFamily: "'Lora', serif" }}
      >
        Explore nossas bolsas artesanais brasileiras e encontre peças únicas feitas com alma.
      </p>
      <Link
        href="/#colecoes"
        className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90"
        style={{
          background: "linear-gradient(135deg, #C4522A, #E8821A)",
          fontFamily: "'Nunito', sans-serif",
        }}
      >
        Explorar coleções
      </Link>
    </div>
  );
}
