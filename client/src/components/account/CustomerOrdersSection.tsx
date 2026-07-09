import OrdersEmptyState from "@/components/auth/OrdersEmptyState";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatPrice } from "@/lib/products";
import { fetchCustomerOrder, fetchCustomerOrders } from "@/lib/orderApi";
import { formatAddressLine, formatCepDisplay } from "@shared/types/address";
import type { Order, OrderSummary, OrderStatus, PaymentMethod } from "@shared/types/order";
import {
  Barcode,
  ChevronDown,
  CreditCard,
  MapPin,
  Package,
  QrCode,
  Truck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pendente",
  paid: "Confirmado",
  canceled: "Cancelado",
};

const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-[#E8821A]/15 text-[#B86A12] ring-[#E8821A]/20",
  paid: "bg-[#2D6A4F]/12 text-[#2D6A4F] ring-[#2D6A4F]/20",
  canceled: "bg-[#8B6F5E]/15 text-[#6B5344] ring-[#8B6F5E]/20",
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix",
  credit_card: "Cartão de crédito",
  boleto: "Boleto",
};

function PaymentIcon({ method }: { method: PaymentMethod }) {
  if (method === "pix") return <QrCode size={14} />;
  if (method === "credit_card") return <CreditCard size={14} />;
  return <Barcode size={14} />;
}

function OrderDetailPanel({ order }: { order: Order }) {
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="mt-4 space-y-5 border-t border-[#E8D5C4]/80 pt-5">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-[#FAF7F2] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#3D2B1F]">
            <MapPin size={15} className="text-[#C4522A]" />
            Endereço de entrega
          </div>
          <p className="text-sm leading-relaxed text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {formatAddressLine(order.shippingAddress)}
          </p>
          <p className="mt-1 text-xs text-[#8B6F5E]">CEP {formatCepDisplay(order.shippingAddress.cep)}</p>
        </div>

        <div className="rounded-xl bg-[#FAF7F2] p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#3D2B1F]">
            <PaymentIcon method={order.paymentMethod} />
            Pagamento
          </div>
          <p className="text-sm text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {PAYMENT_LABELS[order.paymentMethod]}
          </p>
          {order.couponCode && (
            <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-[#C4522A]">
              Cupom: {order.couponCode}
            </p>
          )}
        </div>
      </div>

      <div>
        <p
          className="mb-3 text-sm font-semibold text-[#3D2B1F]"
          style={{ fontFamily: "'Nunito', sans-serif" }}
        >
          Itens do pedido
        </p>
        <ul className="space-y-3">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex gap-3 rounded-xl border border-[#E8D5C4]/80 bg-white p-3"
            >
              <img
                src={item.image}
                alt={item.name}
                className="h-16 w-14 shrink-0 rounded-lg border border-[#E8D5C4] object-cover"
              />
              <div className="min-w-0 flex-1">
                <Link
                  href={`/produto/${item.productSlug}`}
                  className="block truncate font-semibold text-[#3D2B1F] hover:text-[#C4522A]"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {item.name}
                </Link>
                <p className="text-xs text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
                  {item.quantity}x · {item.size}
                  {item.color ? ` · ${item.color}` : ""}
                </p>
                <p className="mt-1 text-sm font-semibold text-[#C4522A]">
                  {formatPrice(item.price * item.quantity)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-xl border border-[#E8D5C4] bg-[#FFFCF8] p-4 text-sm" style={{ fontFamily: "'Nunito', sans-serif" }}>
        <div className="flex justify-between text-[#8B6F5E]">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="mt-2 flex justify-between text-[#8B6F5E]">
          <span className="flex items-center gap-1">
            <Truck size={14} />
            Frete
          </span>
          <span>{order.shippingAmount === 0 ? "Grátis" : formatPrice(order.shippingAmount)}</span>
        </div>
        <div className="mt-3 flex justify-between border-t border-[#E8D5C4] pt-3 font-semibold text-[#3D2B1F]">
          <span>Total pago</span>
          <span style={{ fontFamily: "'Playfair Display', serif" }}>{formatPrice(order.totalAmount)}</span>
        </div>
      </div>
    </div>
  );
}

function OrderCard({
  summary,
  token,
  isOpen,
  onToggle,
}: {
  summary: OrderSummary;
  token: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [order, setOrder] = useState<Order | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (!isOpen || order) return;

    let cancelled = false;
    setLoadingDetail(true);

    fetchCustomerOrder(token, summary.id)
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch(() => {
        if (!cancelled) toast.error("Erro ao carregar detalhes do pedido");
      })
      .finally(() => {
        if (!cancelled) setLoadingDetail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, order, summary.id, token]);

  const orderDate = new Date(summary.createdAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <article className="overflow-hidden rounded-2xl border border-[#E8D5C4] bg-white shadow-sm transition-shadow hover:shadow-md">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-4 p-5 text-left"
      >
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#C4522A]/12 to-[#E8821A]/10">
          <Package className="size-5 text-[#C4522A]" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              className="font-bold text-[#3D2B1F]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              Pedido #{summary.id.slice(0, 8).toUpperCase()}
            </h3>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ${STATUS_STYLES[summary.status]}`}
            >
              {STATUS_LABELS[summary.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {orderDate} · {summary.itemCount} {summary.itemCount === 1 ? "item" : "itens"} ·{" "}
            {PAYMENT_LABELS[summary.paymentMethod]}
          </p>
          <p
            className="mt-2 text-lg font-bold text-[#C4522A]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {formatPrice(summary.totalAmount)}
          </p>
        </div>

        <ChevronDown
          className={`mt-1 size-5 shrink-0 text-[#8B6F5E] transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="px-5 pb-5">
          {loadingDetail ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-6 text-[#C4522A]" />
            </div>
          ) : order ? (
            <OrderDetailPanel order={order} />
          ) : (
            <div className="py-4 text-center">
              <Button variant="outline" onClick={onToggle} className="rounded-xl">
                Tentar novamente
              </Button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

interface CustomerOrdersSectionProps {
  token: string;
}

export default function CustomerOrdersSection({ token }: CustomerOrdersSectionProps) {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchCustomerOrders(token)
      .then((data) => {
        if (!cancelled) setOrders(data);
      })
      .catch(() => {
        if (!cancelled) toast.error("Erro ao carregar pedidos");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-7 text-[#C4522A]" />
      </div>
    );
  }

  if (orders.length === 0) {
    return <OrdersEmptyState />;
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          summary={order}
          token={token}
          isOpen={openOrderId === order.id}
          onToggle={() => setOpenOrderId((current) => (current === order.id ? null : order.id))}
        />
      ))}
    </div>
  );
}
