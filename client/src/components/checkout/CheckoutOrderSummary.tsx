import { formatPrice } from "@/lib/products";
import { calculateShippingAmount } from "@shared/const/cart";
import type { CartItem } from "@shared/types/cart";
import { Tag, Truck } from "lucide-react";

interface CheckoutOrderSummaryProps {
  items: CartItem[];
  subtotal: number;
  couponCode: string | null;
  isSubmitting: boolean;
  onSubmit: () => void;
  showSubmit?: boolean;
}

export default function CheckoutOrderSummary({
  items,
  subtotal,
  couponCode,
  isSubmitting,
  onSubmit,
  showSubmit = true,
}: CheckoutOrderSummaryProps) {
  const shippingAmount = calculateShippingAmount(subtotal);
  const total = subtotal + shippingAmount;
  const freeShipping = shippingAmount === 0;

  return (
    <div className="sticky top-24 space-y-4 rounded-2xl border border-[#E8D5C4] bg-white p-5 shadow-sm">
      <h2
        className="text-lg font-bold text-[#3D2B1F]"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        Resumo do pedido
      </h2>

      <ul className="max-h-64 space-y-3 overflow-y-auto pr-1">
        {items.map(item => (
          <li key={item.id} className="flex gap-3">
            <img
              src={item.productImage}
              alt={item.productName}
              className="h-16 w-14 shrink-0 rounded-lg border border-[#E8D5C4] object-cover"
            />
            <div className="min-w-0 flex-1">
              <p
                className="truncate text-sm font-semibold text-[#3D2B1F]"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {item.productName}
              </p>
              <p
                className="text-xs text-[#8B6F5E]"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              >
                {item.quantity}x · {item.sizeLabel}
                {item.colorName ? ` · ${item.colorName}` : ""}
              </p>
              <p
                className="text-sm font-semibold text-[#C4522A]"
                style={{ fontFamily: "'Nunito', sans-serif" }}
              >
                {formatPrice(item.lineTotal)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div
        className="space-y-2 border-t border-[#E8D5C4] pt-4 text-sm"
        style={{ fontFamily: "'Nunito', sans-serif" }}
      >
        <div className="flex justify-between text-[#8B6F5E]">
          <span>Subtotal</span>
          <span className="font-medium text-[#3D2B1F]">
            {formatPrice(subtotal)}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[#8B6F5E]">
            <Truck size={14} />
            Frete
          </span>
          {freeShipping ? (
            <span className="font-semibold text-[#2D6A4F]">Grátis</span>
          ) : (
            <span className="font-medium text-[#3D2B1F]">
              {formatPrice(shippingAmount)}
            </span>
          )}
        </div>

        {couponCode && (
          <div className="flex items-center justify-between text-[#8B6F5E]">
            <span className="flex items-center gap-1.5">
              <Tag size={14} />
              Cupom
            </span>
            <span className="rounded-full bg-[#C4522A]/10 px-2 py-0.5 text-xs font-semibold uppercase text-[#C4522A]">
              {couponCode}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-[#E8D5C4] pt-3">
          <span className="font-semibold text-[#3D2B1F]">Total</span>
          <span
            className="text-xl font-bold text-[#3D2B1F]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {formatPrice(total)}
          </span>
        </div>
      </div>

      {showSubmit && (
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, #C4522A, #E8821A)",
            fontFamily: "'Nunito', sans-serif",
          }}
        >
          {isSubmitting ? "Processando..." : "Finalizar Compra"}
        </button>
      )}
    </div>
  );
}
