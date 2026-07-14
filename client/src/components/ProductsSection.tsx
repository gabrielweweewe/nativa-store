/**
 * Nativa Store — Products Section
 * Design: Brasil Vivo — Artesanato com Alma
 * Grid uniforme responsivo — catálogo alinhado e legível
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { Product } from "@shared/types/product";
import { FeatherOrange, FeatherBlue, FeatherGreen } from "./NativaDecorations";
import ProductCard from "./ProductCard";
import { fetchProducts } from "@/lib/products";

function StitchDivider() {
  return (
    <div className="flex items-center gap-4 py-6">
      <div className="flex-1 border-t-2 border-dashed border-[#C4522A]/20" />
      <div className="flex items-center gap-2">
        <span className="text-[#C4522A] text-lg">✦</span>
        <span
          className="text-xs font-bold text-[#C4522A] uppercase tracking-[0.2em]"
          style={{ fontFamily: "'Nunito', sans-serif" }}
        >
          Coleção 2025
        </span>
        <span className="text-[#C4522A] text-lg">✦</span>
      </div>
      <div className="flex-1 border-t-2 border-dashed border-[#C4522A]/20" />
    </div>
  );
}

export default function ProductsSection() {
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const filters = ["Todos", "Bolsas"];

  useEffect(() => {
    fetchProducts()
      .then(setProducts)
      .catch((err) => setError(err instanceof Error ? err.message : "Erro ao carregar produtos"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    function onSetCategory(event: Event) {
      const detail = (event as CustomEvent<string>).detail;
      if (detail === "Todos" || detail === "Bolsas") {
        setActiveFilter(detail);
      }
    }

    window.addEventListener("nativa:set-category", onSetCategory);
    return () => window.removeEventListener("nativa:set-category", onSetCategory);
  }, []);

  const filtered =
    activeFilter === "Todos" ? products : products.filter((p) => p.category === activeFilter);

  const sortedProducts = [...filtered].sort((a, b) => {
    if (a.featured && !b.featured) return -1;
    if (!a.featured && b.featured) return 1;
    return 0;
  });

  return (
    <section id="colecoes" className="py-12 md:py-20 relative overflow-hidden" style={{ background: "#FAF7F2" }}>
      <div className="absolute top-12 right-6 feather-float opacity-35">
        <FeatherOrange className="w-6 h-14 rotate-[20deg]" />
      </div>
      <div className="absolute top-32 right-20 feather-float-delay opacity-30">
        <FeatherBlue className="w-5 h-12 rotate-[-15deg]" />
      </div>
      <div className="absolute bottom-20 left-4 feather-float-delay2 opacity-25">
        <FeatherGreen className="w-5 h-12 rotate-[10deg]" />
      </div>

      <div className="container">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full mb-3 text-xs font-bold uppercase tracking-widest"
              style={{
                background: "linear-gradient(135deg, #C4522A15, #E8821A15)",
                border: "1px solid #C4522A30",
                color: "#C4522A",
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              ✦ Bolsas Artesanais
            </div>
            <h2
              className="text-3xl md:text-5xl font-bold leading-tight"
              style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                background: "linear-gradient(135deg, #C4522A, #E8821A, #C9922A)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Nossa Coleção
            </h2>
            <p
              className="text-[#8B6F5E] text-base mt-2 max-w-sm"
              style={{ fontFamily: "'Lora', serif", fontStyle: "italic" }}
            >
              Cada bolsa é única, feita à mão com amor e identidade brasileira
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                  activeFilter === filter
                    ? "text-white shadow-md"
                    : "text-[#8B6F5E] border border-[#C4522A]/25 hover:border-[#C4522A]/50"
                }`}
                style={{
                  fontFamily: "'Nunito', sans-serif",
                  background:
                    activeFilter === filter ? "linear-gradient(135deg, #C4522A, #E8821A)" : "transparent",
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <p className="text-center text-[#8B6F5E] py-16" style={{ fontFamily: "'Lora', serif" }}>
            Carregando coleção...
          </p>
        )}

        {error && (
          <p className="text-center text-[#C4522A] py-16" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {error}
          </p>
        )}

        {!loading && !error && sortedProducts.length > 0 && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5 mb-10">
              {sortedProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  variant={product.featured ? "featured" : "default"}
                />
              ))}
            </div>

            <StitchDivider />
          </>
        )}

        {!loading && !error && sortedProducts.length === 0 && (
          <p className="text-center text-[#8B6F5E] py-16" style={{ fontFamily: "'Lora', serif" }}>
            Nenhum produto cadastrado ainda.
          </p>
        )}

        <div className="text-center mt-8">
          <button
            onClick={() => toast("Mais bolsas em breve!", { description: "Estamos preparando novas criações artesanais." })}
            className="nativa-btn-outline px-10 py-3.5 rounded-full text-sm"
          >
            Ver Mais Bolsas
          </button>
        </div>
      </div>
    </section>
  );
}
