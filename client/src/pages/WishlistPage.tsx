/**
 * Lista de desejos — favoritos persistidos no dispositivo.
 */

import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Heart } from "lucide-react";
import type { Product } from "@shared/types/product";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { fetchProducts } from "@/lib/products";
import { useWishlist } from "@/contexts/WishlistContext";
import { usePageMeta } from "@/lib/seo";
import { SITE_NAME } from "@shared/const/site";
import { Spinner } from "@/components/ui/spinner";

export default function WishlistPage() {
  const { slugs, count } = useWishlist();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  usePageMeta({
    title: `Favoritos — ${SITE_NAME}`,
    description: "Suas bolsas salvas na Nativa Store.",
    path: "/favoritos",
    noIndex: true,
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchProducts()
      .then((all) => {
        if (cancelled) return;
        const map = new Map(all.map((p) => [p.slug, p]));
        setProducts(slugs.map((slug) => map.get(slug)).filter((p): p is Product => !!p));
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slugs]);

  return (
    <div className="min-h-screen" style={{ background: "#F5F0E8" }}>
      <Navbar />
      <main className="container pb-16 pt-24 md:pt-28">
        <div className="mb-8 max-w-xl">
          <p
            className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1B7A8C]"
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            Lista de desejos
          </p>
          <h1
            className="mt-2 text-3xl font-semibold text-[#3D2B1F] md:text-4xl"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Seus favoritos
          </h1>
          <p className="mt-2 text-[#8B6F5E]" style={{ fontFamily: "'Lora', serif" }}>
            {count === 0
              ? "Salve bolsas com o coração para encontrar depois."
              : `${count} ${count === 1 ? "bolsa salva" : "bolsas salvas"} neste aparelho.`}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner className="size-8 text-[#C4522A]" />
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed border-[#E8D5C4] bg-white/50 px-6 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#C4522A]/10 text-[#C4522A]">
              <Heart size={24} />
            </div>
            <p
              className="text-lg font-semibold text-[#3D2B1F]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Ainda sem favoritos
            </p>
            <p className="mt-1 max-w-sm text-sm text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
              Explore a coleção e toque no coração nas bolsas que você ama.
            </p>
            <Link
              href="/#colecoes"
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-2xl px-6 text-sm font-bold text-white"
              style={{
                background: "linear-gradient(135deg, #C4522A, #E8821A)",
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              Ver coleções
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
