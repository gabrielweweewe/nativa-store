/**
 * Nativa Store — Product Card
 * Reusable card for product grids and related products
 */

import { useState } from "react";
import { Heart, ShoppingBag, Star } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import type { Product } from "@shared/types/product";
import { formatPrice } from "@/lib/products";
import { useCart } from "@/contexts/CartContext";

export type ProductCardVariant = "default" | "featured" | "wide" | "tall" | "compact";

interface ProductCardProps {
  product: Product;
  variant?: ProductCardVariant;
}

function getDefaultSize(product: Product): string | null {
  const available = product.sizes.filter((s) => s.available);
  if (available.length === 1) return available[0].label;
  if (available.length === 0) return null;
  return null;
}

function getDefaultColor(product: Product): string {
  return product.colors[0]?.name ?? "";
}

function hasComplexVariants(product: Product): boolean {
  const availableSizes = product.sizes.filter((s) => s.available);
  return availableSizes.length > 1 || product.colors.length > 1;
}

export default function ProductCard({ product, variant = "default" }: ProductCardProps) {
  const [isFav, setIsFav] = useState(false);
  const { addItem, openDrawer, isUpdating } = useCart();

  const imageAspect = "aspect-[4/5]";

  const handleFav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsFav(!isFav);
    toast(isFav ? "Removido dos favoritos" : "Adicionado aos favoritos!");
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!product.inStock || product.stockCount <= 0) {
      toast.error("Produto esgotado");
      return;
    }

    if (hasComplexVariants(product)) {
      toast("Escolha as opções na página do produto", {
        description: "Este item possui tamanhos ou cores para selecionar.",
      });
      return;
    }

    const size = getDefaultSize(product);
    if (!size) {
      toast.error("Nenhum tamanho disponível");
      return;
    }

    const ok = await addItem({
      productSlug: product.slug,
      quantity: 1,
      size,
      color: getDefaultColor(product),
    });

    if (ok) {
      toast.success(`${product.name} adicionada!`);
      openDrawer();
    }
  };

  return (
    <Link href={`/produto/${product.slug}`} className="block h-full">
      <div
        className={`nativa-card-hover group rounded-2xl overflow-hidden bg-white border border-[#E8D5C4] flex flex-col h-full cursor-pointer ${
          variant === "featured" ? "shadow-xl" : ""
        }`}
        style={
          variant === "featured"
            ? { boxShadow: "0 16px 48px oklch(0.52 0.14 38 / 0.18)" }
            : {}
        }
      >
        <div className={`relative overflow-hidden flex-shrink-0 w-full ${imageAspect}`}>
          <img
            src={product.image}
            alt={product.name}
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div
            className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-white text-xs font-bold"
            style={{ background: product.badgeColor, fontFamily: "'Nunito', sans-serif" }}
          >
            {product.badge}
          </div>

          <button
            onClick={handleFav}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm transition-all duration-200 hover:scale-110"
            aria-label={isFav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
          >
            <Heart size={14} className={isFav ? "fill-[#C4522A] text-[#C4522A]" : "text-[#8B6F5E]"} />
          </button>

          <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-y-2 group-hover:translate-y-0">
            <button
              onClick={handleAddToCart}
              disabled={isUpdating}
              className="w-full py-2 rounded-xl text-white text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #C4522A, #E8821A)", fontFamily: "'Nunito', sans-serif" }}
            >
              <ShoppingBag size={13} />
              Adicionar ao Carrinho
            </button>
          </div>

          {variant === "featured" && (
            <div
              className="absolute top-12 left-3 px-2.5 py-1 rounded-full text-white text-xs font-bold"
              style={{
                background: "linear-gradient(135deg, #2D6A4F, #1B7A8C)",
                fontFamily: "'Nunito', sans-serif",
              }}
            >
              ✦ Destaque da Coleção
            </div>
          )}
        </div>

        <div className={`flex flex-col gap-2 flex-1 ${variant === "compact" ? "p-3" : "p-4"}`}>
          <p
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ fontFamily: "'Nunito', sans-serif", color: "#1B7A8C" }}
          >
            {product.category}
          </p>
          <h3
            className={`font-semibold text-[#3D2B1F] leading-tight group-hover:text-[#C4522A] transition-colors line-clamp-2 ${
              variant === "featured" ? "text-xl" : variant === "compact" ? "text-sm" : "text-base"
            }`}
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {product.name}
          </h3>

          <div className="flex items-center gap-1.5">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={10}
                  className={i < Math.floor(product.rating) ? "fill-[#C9922A] text-[#C9922A]" : "text-[#D4C5B5]"}
                />
              ))}
            </div>
            <span className="text-xs text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
              {product.rating} ({product.reviews})
            </span>
          </div>

          <div className="flex items-center gap-2 mt-auto pt-1">
            <span
              className={`font-bold text-[#C4522A] ${variant === "featured" ? "text-xl" : "text-lg"}`}
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {formatPrice(product.price)}
            </span>
            {product.originalPrice && (
              <span className="text-sm text-[#B0A090] line-through" style={{ fontFamily: "'Nunito', sans-serif" }}>
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
