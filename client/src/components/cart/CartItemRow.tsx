import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/products";
import type { CartItem } from "@shared/types/cart";
import { Link } from "wouter";
import { Trash2 } from "lucide-react";
import CartQuantityControl from "./CartQuantityControl";

interface CartItemRowProps {
  item: CartItem;
  compact?: boolean;
}

export default function CartItemRow({ item, compact = false }: CartItemRowProps) {
  const { updateQuantity, removeItem, isUpdating } = useCart();

  const variantParts = [item.sizeLabel];
  if (item.colorName) variantParts.push(item.colorName);
  const variantLabel = variantParts.join(" · ");

  return (
    <div
      className={`flex gap-3 rounded-2xl border border-[#E8D5C4] bg-white ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <Link
        href={`/produto/${item.productSlug}`}
        className="shrink-0 overflow-hidden rounded-xl border border-[#E8D5C4] bg-[#FAF7F2]"
      >
        <img
          src={item.productImage}
          alt={item.productName}
          className={`object-cover ${compact ? "w-16 h-20" : "w-20 h-24"}`}
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`/produto/${item.productSlug}`}
              className="block truncate font-semibold text-[#3D2B1F] hover:text-[#C4522A] transition-colors"
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: compact ? "0.9rem" : "1rem",
              }}
            >
              {item.productName}
            </Link>
            <p
              className="mt-0.5 text-xs text-[#8B6F5E]"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              {variantLabel}
            </p>
            {!item.inStock && (
              <p className="mt-1 text-xs font-semibold text-[#C4522A]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                Produto esgotado
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => removeItem(item.id)}
            disabled={isUpdating}
            className="shrink-0 rounded-lg p-1.5 text-[#8B6F5E] hover:bg-[#C4522A]/10 hover:text-[#C4522A] transition-colors disabled:opacity-50"
            aria-label="Remover item"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <CartQuantityControl
            quantity={item.quantity}
            max={Math.min(item.stockCount || 99, 99)}
            disabled={isUpdating || !item.inStock}
            onChange={(qty) => updateQuantity(item.id, qty)}
            size={compact ? "sm" : "md"}
          />
          <div className="text-right">
            <p
              className="font-bold text-[#C4522A]"
              style={{ fontFamily: "'Playfair Display', serif", fontSize: compact ? "0.95rem" : "1.05rem" }}
            >
              {formatPrice(item.lineTotal)}
            </p>
            {item.quantity > 1 && (
              <p className="text-[10px] text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                {formatPrice(item.unitPrice)} cada
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
