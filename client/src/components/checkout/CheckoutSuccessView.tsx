import type { Order } from "@shared/types/order";
import { Link } from "wouter";
import {
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  Home,
  Package,
} from "lucide-react";
import { formatPrice } from "@/lib/products";
import { toast } from "sonner";

interface CheckoutSuccessViewProps {
  order: Order;
}

export default function CheckoutSuccessView({
  order,
}: CheckoutSuccessViewProps) {
  const approved = order.paymentStatus === "approved";
  const instructions = order.paymentInstructions;

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado`);
    } catch {
      toast.error("Não foi possível copiar");
    }
  }

  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="relative mb-8">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#2D6A4F]/15 to-[#1B7A8C]/10 ring-1 ring-[#2D6A4F]/20">
          {approved ? (
            <CheckCircle2
              size={48}
              className="text-[#2D6A4F]"
              strokeWidth={1.5}
            />
          ) : (
            <Clock3 size={48} className="text-[#C4522A]" strokeWidth={1.5} />
          )}
        </div>
        <div
          className="pointer-events-none absolute -right-2 top-0 text-3xl opacity-40"
          aria-hidden
        >
          🪶
        </div>
        <div
          className="pointer-events-none absolute -left-4 bottom-0 text-2xl opacity-30"
          aria-hidden
        >
          🌿
        </div>
      </div>

      <h1
        className="mb-2 text-3xl font-bold text-[#3D2B1F] md:text-4xl"
        style={{ fontFamily: "'Playfair Display', serif" }}
      >
        {approved ? "Pagamento aprovado!" : "Pedido aguardando pagamento"}
      </h1>

      <p
        className="mb-1 text-sm uppercase tracking-[0.18em] text-[#C4522A]"
        style={{ fontFamily: "'Nunito', sans-serif" }}
      >
        Liberdade em cada detalhe
      </p>

      <p
        className="mb-6 leading-relaxed text-[#8B6F5E]"
        style={{ fontFamily: "'Lora', serif" }}
      >
        Obrigada por escolher a Nativa! Seu pedido{" "}
        <strong className="text-[#3D2B1F]">
          #{order.id.slice(0, 8).toUpperCase()}
        </strong>{" "}
        foi registrado com sucesso.{" "}
        {approved
          ? "Em breve você receberá mais detalhes sobre a entrega."
          : "Conclua o pagamento abaixo; esta página será atualizada quando ele for confirmado."}
      </p>

      {!approved && order.paymentMethod === "pix" && instructions && (
        <div className="mb-8 rounded-2xl border border-[#2D6A4F]/30 bg-white p-5">
          <h2 className="mb-3 font-bold text-[#3D2B1F]">Pague com Pix</h2>
          {instructions.qrCodeBase64 && (
            <img
              src={`data:image/png;base64,${instructions.qrCodeBase64}`}
              alt="QR Code Pix"
              className="mx-auto mb-4 size-56"
            />
          )}
          {instructions.qrCode && (
            <>
              <p className="mb-2 text-sm text-[#8B6F5E]">
                Ou use o Pix copia e cola:
              </p>
              <div className="mb-3 break-all rounded-xl bg-[#FAF7F2] p-3 text-left font-mono text-xs">
                {instructions.qrCode}
              </div>
              <button
                type="button"
                onClick={() => void copy(instructions.qrCode!, "Código Pix")}
                className="inline-flex items-center gap-2 rounded-xl bg-[#2D6A4F] px-4 py-2 text-sm font-semibold text-white"
              >
                <Copy className="size-4" /> Copiar código Pix
              </button>
            </>
          )}
        </div>
      )}

      {!approved && order.paymentMethod === "boleto" && instructions && (
        <div className="mb-8 rounded-2xl border border-[#E8D5C4] bg-white p-5">
          <h2 className="mb-3 font-bold text-[#3D2B1F]">Boleto gerado</h2>
          {instructions.barcode && (
            <button
              type="button"
              onClick={() =>
                void copy(instructions.barcode!, "Código do boleto")
              }
              className="mb-3 inline-flex items-center gap-2 rounded-xl border border-[#E8D5C4] px-4 py-2 text-sm font-semibold"
            >
              <Copy className="size-4" /> Copiar código
            </button>
          )}
          {instructions.ticketUrl && (
            <a
              href={instructions.ticketUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#C4522A] px-4 py-2 text-sm font-semibold text-white"
            >
              <ExternalLink className="size-4" /> Abrir ou imprimir boleto
            </a>
          )}
        </div>
      )}

      <div className="mb-8 rounded-2xl border border-[#E8D5C4] bg-white p-5 text-left">
        <div className="mb-3 flex items-center gap-2 text-[#3D2B1F]">
          <Package size={18} className="text-[#C4522A]" />
          <span
            className="font-semibold"
            style={{ fontFamily: "'Nunito', sans-serif" }}
          >
            Resumo
          </span>
        </div>
        <p
          className="text-sm text-[#8B6F5E]"
          style={{ fontFamily: "'Nunito', sans-serif" }}
        >
          {order.items.length} {order.items.length === 1 ? "item" : "itens"} ·
          Total{" "}
          <strong className="text-[#3D2B1F]">
            {formatPrice(order.totalAmount)}
          </strong>
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white"
          style={{
            background: "linear-gradient(135deg, #C4522A, #E8821A)",
            fontFamily: "'Nunito', sans-serif",
          }}
        >
          <Home size={16} />
          Voltar à loja
        </Link>
        <Link
          href="/conta"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E8D5C4] px-6 py-3 text-sm font-semibold text-[#3D2B1F] transition-colors hover:bg-[#F5F0E8]"
          style={{ fontFamily: "'Nunito', sans-serif" }}
        >
          Ver minha conta
        </Link>
      </div>
    </div>
  );
}
