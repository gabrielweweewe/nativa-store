/**
 * Nativa Store — Mapa Vivo das Origens
 * Passaporte de regiões: indicador discreto de progresso (quantas regiões
 * o visitante já explorou) + celebração sutil e recompensa real — um cupom
 * de frete grátis — ao completar as 5 regiões.
 */

import { useCart } from "@/contexts/CartContext";
import { Gift, X } from "lucide-react";
import { useEffect, useState } from "react";
import { REGION_COLORS, type RegionId } from "./RegionSvg";

interface RegionsPassportProps {
  regionIds: readonly RegionId[];
  visitedSet: Set<RegionId>;
  visitedCount: number;
  totalCount: number;
  isComplete: boolean;
  rewardClaimed: boolean;
  onClaimReward: () => void;
  getRegionName: (id: RegionId) => string;
}

export default function RegionsPassport({
  regionIds,
  visitedSet,
  visitedCount,
  totalCount,
  isComplete,
  rewardClaimed,
  onClaimReward,
  getRegionName,
}: RegionsPassportProps) {
  const { applyCoupon, isUpdating } = useCart();
  const [copied, setCopied] = useState(false);
  const [rewardCode, setRewardCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/coupons/map-reward")
      .then(async response => {
        if (!response.ok) return null;
        return (await response.json()) as { code?: string } | null;
      })
      .then(data => {
        if (cancelled) return;
        setRewardCode(data?.code?.trim() ? data.code.trim().toUpperCase() : null);
      })
      .catch(() => {
        if (!cancelled) setRewardCode(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCopyCode() {
    if (!rewardCode) return;
    try {
      await navigator.clipboard.writeText(rewardCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard indisponível — o código já está visível na tela.
    }
  }

  async function handleApplyToCart() {
    if (!rewardCode) return;
    await applyCoupon({ couponCode: rewardCode });
    onClaimReward();
  }

  const showReward = isComplete && rewardCode;

  return (
    <div className="mx-auto mb-8 flex max-w-xl flex-col items-center gap-3 md:mb-10">
      <div className="flex flex-wrap items-center justify-center gap-2.5">
        <p
          className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B6F5E]"
          style={{ fontFamily: "'Nunito', sans-serif" }}
        >
          {visitedCount} de {totalCount} regiões exploradas
        </p>
        <div className="flex items-center gap-1.5" role="list" aria-label="Progresso do passaporte de regiões">
          {regionIds.map((id) => {
            const visited = visitedSet.has(id);
            return (
              <span
                key={id}
                role="listitem"
                title={visited ? `${getRegionName(id)} — explorada` : getRegionName(id)}
                className="h-2.5 w-2.5 rounded-full border transition-colors duration-300"
                style={{
                  backgroundColor: visited ? REGION_COLORS[id] : "transparent",
                  borderColor: visited ? REGION_COLORS[id] : "#D8C6B4",
                }}
              />
            );
          })}
        </div>
      </div>

      {showReward && !rewardClaimed && (
        <div className="relative flex w-full flex-col items-center gap-3 rounded-2xl border border-[#2D6A4F]/25 bg-[#2D6A4F]/[0.06] px-5 py-4 text-center animate-in fade-in slide-in-from-top-2 duration-500 sm:flex-row sm:justify-between sm:text-left">
          <button
            type="button"
            onClick={onClaimReward}
            aria-label="Fechar aviso"
            className="absolute right-2 top-2 text-[#8B6F5E] transition-colors hover:text-[#3D2B1F] sm:static sm:order-3 sm:self-start"
          >
            <X size={16} />
          </button>

          <div className="flex items-center gap-3">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={{ background: "#2D6A4F1A", color: "#2D6A4F" }}
              aria-hidden
            >
              <Gift size={18} strokeWidth={1.75} />
            </span>
            <p className="text-sm leading-relaxed text-[#3D2B1F]" style={{ fontFamily: "'Lora', serif" }}>
              Você percorreu as 5 origens! Ganhe <strong className="font-semibold">frete grátis</strong> com o
              cupom{" "}
              <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs font-bold text-[#2D6A4F]">
                {rewardCode}
              </code>
              .
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:order-2">
            <button
              type="button"
              onClick={() => void handleCopyCode()}
              className="rounded-full border border-[#2D6A4F]/30 px-3 py-1.5 text-xs font-semibold text-[#2D6A4F] transition-colors hover:bg-[#2D6A4F]/10"
            >
              {copied ? "Copiado!" : "Copiar código"}
            </button>
            <button
              type="button"
              onClick={() => void handleApplyToCart()}
              disabled={isUpdating}
              className="rounded-full px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ background: "#2D6A4F" }}
            >
              Aplicar no carrinho
            </button>
          </div>
        </div>
      )}

      {showReward && rewardClaimed && (
        <p className="text-xs text-[#2D6A4F]" style={{ fontFamily: "'Nunito', sans-serif" }}>
          Cupom <strong className="font-bold">{rewardCode}</strong> de frete grátis garantido ✓
        </p>
      )}
    </div>
  );
}
