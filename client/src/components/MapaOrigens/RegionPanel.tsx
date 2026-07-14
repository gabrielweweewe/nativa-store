/**
 * Nativa Store — Mapa Vivo das Origens
 * Painel de história + produtos da região selecionada.
 */

import { formatPrice } from "@/lib/products";
import type { RegionWithProducts } from "@shared/types/region";
import { Compass } from "lucide-react";
import { Link } from "wouter";

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-full"
        style={{ background: "#C4522A15", color: "#C4522A" }}
        aria-hidden
      >
        <Compass size={22} strokeWidth={1.75} />
      </span>
      <p
        className="max-w-[16rem] text-base text-[#8B6F5E]"
        style={{ fontFamily: "'Lora', serif", fontStyle: "italic" }}
      >
        Toque no mapa para descobrir a origem de cada bordado
      </p>
    </div>
  );
}

function RegionProductCard({ product }: { product: RegionWithProducts["products"][number] }) {
  return (
    <Link
      href={`/produto/${product.slug}`}
      className="group flex items-center gap-3 rounded-xl border border-[#E8D5C4] bg-white p-2.5 transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-[#F5F0E8]">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="truncate text-sm font-semibold text-[#3D2B1F] transition-colors group-hover:text-[#C4522A]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {product.name}
        </p>
        <p
          className="mt-0.5 text-sm font-bold text-[#C4522A]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {formatPrice(product.price)}
        </p>
      </div>
    </Link>
  );
}

interface RegionPanelProps {
  region: RegionWithProducts | null;
}

export default function RegionPanel({ region }: RegionPanelProps) {
  return (
    <div
      className="flex min-h-[22rem] flex-col rounded-2xl border border-[#E8D5C4] p-6 transition-opacity duration-300 sm:p-7"
      style={{ background: "#FAF7F2" }}
      aria-live="polite"
    >
      {!region ? (
        <EmptyState />
      ) : (
        <div className="flex flex-1 flex-col gap-5 animate-in fade-in duration-300">
          <div>
            <p
              className="text-xs font-bold uppercase tracking-[0.2em] text-[#1B7A8C]"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              {region.name}
            </p>
            <h3
              className="mt-2 text-2xl font-bold leading-tight text-[#3D2B1F] sm:text-3xl"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {region.title}
            </h3>
          </div>

          <p
            className="text-base leading-relaxed text-[#5C4A3A]"
            style={{ fontFamily: "'Lora', serif" }}
          >
            {region.story}
          </p>

          {region.products.length > 0 && (
            <div className="mt-auto space-y-2.5 pt-2">
              <p
                className="text-xs font-bold uppercase tracking-widest text-[#8B6F5E]"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              >
                Bordado desta região
              </p>
              <div className="space-y-2.5">
                {region.products.map((product) => (
                  <RegionProductCard key={product.id} product={product} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
