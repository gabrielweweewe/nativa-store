import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/products";
import {
  fetchPublicShippingConfig,
  type PublicShippingConfig,
} from "@/lib/shippingApi";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { ArrowRight, Check, Tag, Truck } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface CartSummaryProps {
  compact?: boolean;
  showCoupon?: boolean;
  showCheckoutButton?: boolean;
  onCheckout?: () => void;
}

export default function CartSummary({
  compact = false,
  showCoupon = true,
  showCheckoutButton = true,
  onCheckout,
}: CartSummaryProps) {
  const { summary, couponCode, applyCoupon, isUpdating, itemCount } = useCart();
  const [couponInput, setCouponInput] = useState(couponCode ?? "");
  const [shippingUnlock, setShippingUnlock] = useState(false);
  const [shippingConfig, setShippingConfig] = useState<PublicShippingConfig>({
    freeShippingEnabled: true,
    freeShippingThreshold: 299,
  });
  const prevQualifiesRef = useRef<boolean | null>(null);

  useEffect(() => {
    setCouponInput(couponCode ?? "");
  }, [couponCode]);

  useEffect(() => {
    void fetchPublicShippingConfig().then(setShippingConfig).catch(() => {
      // Mantém a configuração padrão enquanto a API estiver indisponível.
    });
  }, []);

  const qualifiesForFreeShipping =
    shippingConfig.freeShippingEnabled &&
    summary.subtotal >= shippingConfig.freeShippingThreshold;
  const freeShippingRemaining = Math.max(
    0,
    shippingConfig.freeShippingThreshold - summary.subtotal,
  );
  const progressPercent = qualifiesForFreeShipping
    ? 100
    : Math.min(
        100,
        (summary.subtotal / shippingConfig.freeShippingThreshold) * 100,
      );

  useEffect(() => {
    if (!shippingConfig.freeShippingEnabled) return;
    const prev = prevQualifiesRef.current;
    prevQualifiesRef.current = qualifiesForFreeShipping;
    if (prev === false && qualifiesForFreeShipping) {
      setShippingUnlock(true);
      const t = window.setTimeout(() => setShippingUnlock(false), 700);
      return () => window.clearTimeout(t);
    }
  }, [qualifiesForFreeShipping, shippingConfig.freeShippingEnabled]);

  async function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    await applyCoupon({ couponCode: couponInput.trim() });
  }

  if (itemCount === 0) return null;

  return (
    <div className={`space-y-4 ${compact ? "" : "rounded-2xl border border-[#E8D5C4] bg-white p-5"}`}>
      {/* Frete grátis */}
      {shippingConfig.freeShippingEnabled && (
        <div className={`space-y-2 ${shippingUnlock ? "shipping-unlock-pop" : ""}`}>
          <div className="flex items-center gap-2 text-sm">
            {qualifiesForFreeShipping ? (
              <Check size={16} className="text-[#2D6A4F]" strokeWidth={2.75} />
            ) : (
              <Truck size={16} className="text-[#8B6F5E]" />
            )}
            {qualifiesForFreeShipping ? (
              <span className="font-semibold text-[#2D6A4F]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                Frete grátis desbloqueado!
              </span>
            ) : (
              <span className="text-[#3D2B1F]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                Faltam{" "}
                <strong className="text-[#C4522A]">{formatPrice(freeShippingRemaining)}</strong>{" "}
                para frete grátis
              </span>
            )}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#E8D5C4]/60">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progressPercent}%`,
                background: qualifiesForFreeShipping
                  ? "linear-gradient(90deg, #2D6A4F, #1B7A8C)"
                  : "linear-gradient(90deg, #C4522A, #E8821A)",
              }}
            />
          </div>
        </div>
      )}

      {/* Cupom */}
      {showCoupon && (
        <form onSubmit={handleApplyCoupon} className="space-y-2">
          <label
            htmlFor="cart-coupon"
            className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#8B6F5E]"
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            <Tag size={12} />
            Cupom de desconto
          </label>
          <div className="flex gap-2">
            <Input
              id="cart-coupon"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              placeholder="Ex: NATIVA15"
              className="h-10 border-[#E8D5C4] bg-[#FAF7F2] uppercase"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            />
            <button
              type="submit"
              disabled={isUpdating}
              className="shrink-0 rounded-xl border border-[#C4522A]/30 px-4 text-sm font-semibold text-[#C4522A] hover:bg-[#C4522A]/10 transition-colors disabled:opacity-50"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              Aplicar
            </button>
          </div>
          <p className="text-[10px] text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
            Será validado no checkout
          </p>
        </form>
      )}

      {/* Subtotal */}
      <div className="flex items-center justify-between border-t border-[#E8D5C4] pt-4">
        <span className="text-sm text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
          Subtotal ({summary.itemCount} {summary.itemCount === 1 ? "item" : "itens"})
        </span>
        <span
          className="text-xl font-bold text-[#3D2B1F]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {formatPrice(summary.subtotal)}
        </span>
      </div>

      <p className="text-[11px] text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
        Frete e impostos calculados no checkout
      </p>

      {showCheckoutButton && (
        <Link
          href="/checkout"
          onClick={onCheckout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white transition-all hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, #C4522A, #E8821A)",
            fontFamily: "'Nunito', sans-serif",
          }}
        >
          Finalizar compra
          <ArrowRight size={18} />
        </Link>
      )}
    </div>
  );
}
