import { Input } from "@/components/ui/input";
import { FREE_SHIPPING_THRESHOLD } from "@shared/const/cart";
import { formatPrice } from "@/lib/products";
import { Loader2, MapPin, Package, Truck } from "lucide-react";
import { useState } from "react";

export interface ShippingOption {
  id: string;
  name: string;
  price: number;
  daysMin: number;
  daysMax: number;
  isFree?: boolean;
}

function formatCepInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

function normalizeCep(value: string): string {
  return value.replace(/\D/g, "").slice(0, 8);
}

/** Estimativa mock — substituir por Melhor Envio na próxima integração. */
function estimateShipping(cep: string, orderSubtotal: number): ShippingOption[] {
  const region = parseInt(cep[0] ?? "0", 10);
  const basePac = region <= 1 ? 18.9 : region <= 3 ? 24.9 : region <= 5 ? 32.9 : 42.9;
  const baseSedex = basePac + 14;

  const qualifiesFree = orderSubtotal >= FREE_SHIPPING_THRESHOLD;

  return [
    {
      id: "pac",
      name: "PAC",
      price: qualifiesFree ? 0 : basePac,
      daysMin: region <= 1 ? 3 : region <= 3 ? 5 : 8,
      daysMax: region <= 1 ? 6 : region <= 3 ? 10 : 15,
      isFree: qualifiesFree,
    },
    {
      id: "sedex",
      name: "SEDEX",
      price: baseSedex,
      daysMin: region <= 1 ? 1 : region <= 3 ? 2 : 4,
      daysMax: region <= 1 ? 3 : region <= 3 ? 5 : 8,
    },
  ];
}

interface ProductShippingQuoteProps {
  productPrice: number;
  quantity: number;
}

export default function ProductShippingQuote({ productPrice, quantity }: ProductShippingQuoteProps) {
  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ShippingOption[] | null>(null);
  const [error, setError] = useState("");

  const subtotal = productPrice * quantity;
  const cepDigits = normalizeCep(cep);

  async function handleQuote(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOptions(null);

    if (cepDigits.length !== 8) {
      setError("Informe um CEP válido com 8 dígitos.");
      return;
    }

    setLoading(true);
    await new Promise((r) => setTimeout(r, 700));
    setOptions(estimateShipping(cepDigits, subtotal));
    setLoading(false);
  }

  return (
    <div className="rounded-2xl border border-[#E8D5C4] bg-[#FAF7F2]/80 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Truck size={18} className="text-[#2D6A4F]" />
        <h3
          className="text-sm font-bold text-[#3D2B1F]"
          style={{ fontFamily: "'Nunito', sans-serif" }}
        >
          Calcular frete
        </h3>
      </div>

      <form onSubmit={handleQuote} className="flex gap-2">
        <div className="relative flex-1">
          <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8B6F5E]" />
          <Input
            value={cep}
            onChange={(e) => setCep(formatCepInput(e.target.value))}
            placeholder="00000-000"
            inputMode="numeric"
            maxLength={9}
            className="h-10 pl-9 border-[#E8D5C4] bg-white"
            style={{ fontFamily: "'Nunito', sans-serif" }}
            aria-label="CEP para cálculo de frete"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="shrink-0 h-10 px-4 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, #2D6A4F, #1B7A8C)",
            fontFamily: "'Nunito', sans-serif",
          }}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : "Calcular"}
        </button>
      </form>

      {error && (
        <p className="text-xs text-[#C4522A]" style={{ fontFamily: "'Nunito', sans-serif" }}>
          {error}
        </p>
      )}

      {subtotal < FREE_SHIPPING_THRESHOLD && !options && (
        <p className="text-[11px] text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
          Frete grátis em compras acima de {formatPrice(FREE_SHIPPING_THRESHOLD)}
        </p>
      )}

      {options && (
        <ul className="space-y-2 pt-1">
          {options.map((opt) => (
            <li
              key={opt.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-[#E8D5C4] bg-white px-3 py-2.5"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Package size={14} className="text-[#2D6A4F] shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-[#3D2B1F]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    {opt.name}
                    {opt.isFree && (
                      <span className="ml-2 text-[10px] font-bold uppercase text-[#2D6A4F]">
                        Grátis
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                    {opt.daysMin} a {opt.daysMax} dias úteis
                  </p>
                </div>
              </div>
              <span
                className={`text-sm font-bold shrink-0 ${opt.isFree ? "text-[#2D6A4F]" : "text-[#3D2B1F]"}`}
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {opt.isFree ? "R$ 0,00" : formatPrice(opt.price)}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="text-[10px] text-[#8B6F5E]/80" style={{ fontFamily: "'Nunito', sans-serif" }}>
        Valores estimados. Integração Melhor Envio em breve.
      </p>
    </div>
  );
}
