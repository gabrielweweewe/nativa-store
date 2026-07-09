import OrdersEmptyState from "@/components/auth/OrdersEmptyState";
import OrderDetailContent from "@/components/orders/OrderDetailContent";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatPrice } from "@/lib/products";
import { fetchCustomerOrder, fetchCustomerOrders } from "@/lib/orderApi";
import {
  formatOrderShortId,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  PAYMENT_METHOD_LABELS,
} from "@shared/lib/orderLabels";
import type { Order, OrderSummary } from "@shared/types/order";
import { ChevronDown, Package } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
        className="flex w-full items-start gap-3 p-4 text-left sm:gap-4 sm:p-5"
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
              Pedido #{formatOrderShortId(summary.id)}
            </h3>
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ${ORDER_STATUS_STYLES[summary.status]}`}
            >
              {ORDER_STATUS_LABELS[summary.status]}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#8B6F5E]" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {orderDate} · {summary.itemCount} {summary.itemCount === 1 ? "item" : "itens"} ·{" "}
            {PAYMENT_METHOD_LABELS[summary.paymentMethod]}
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
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          {loadingDetail ? (
            <div className="flex justify-center py-8">
              <Spinner className="size-6 text-[#C4522A]" />
            </div>
          ) : order ? (
            <div className="mt-4 border-t border-[#E8D5C4]/80 pt-5">
              <OrderDetailContent order={order} />
            </div>
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
