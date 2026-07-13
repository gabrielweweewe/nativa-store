import AdminLayout from "@/components/admin/AdminLayout";
import OrderDetailContent from "@/components/orders/OrderDetailContent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { fetchAdminOrder, updateAdminOrderStatus } from "@/lib/adminApi";
import { formatPrice } from "@/lib/products";
import {
  formatOrderShortId,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@shared/lib/orderLabels";
import type { AdminOrderDetail, OrderStatus } from "@shared/types/order";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  Mail,
  Package,
  Phone,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useParams } from "wouter";

function customerInitials(name: string | null) {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function AdminOrderDetail() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadOrder() {
    if (!orderId) return;
    setIsLoading(true);
    try {
      const data = await fetchAdminOrder(orderId);
      setOrder(data);
    } catch {
      toast.error("Não foi possível carregar o pedido");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  async function handleStatusChange(status: OrderStatus) {
    if (!order || !orderId) return;
    setIsSaving(true);
    try {
      const updated = await updateAdminOrderStatus(orderId, status);
      setOrder(updated);
      toast.success("Status do pedido atualizado");
    } catch {
      toast.error("Não foi possível atualizar o status");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <AdminLayout title="Pedido" backHref="/admin/pedidos">
        <div className="flex justify-center py-16">
          <Spinner className="size-7 text-[var(--admin-accent)]" />
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout title="Pedido" backHref="/admin/pedidos">
        <div className="admin-card p-8 text-center">
          <p className="font-medium text-[var(--admin-text)]">
            Pedido não encontrado
          </p>
          <Button asChild variant="outline" className="mt-4 rounded-xl">
            <Link href="/admin/pedidos">
              <ArrowLeft className="size-4" />
              Voltar para pedidos
            </Link>
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const orderDate = new Date(order.createdAt).toLocaleString("pt-BR");
  const shortId = formatOrderShortId(order.id);

  return (
    <AdminLayout
      title={`#${shortId}`}
      backHref="/admin/pedidos"
      actions={
        <Button variant="outline" asChild>
          <Link href="/admin/pedidos">
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </Button>
      }
    >
      <div className="space-y-3 pb-[calc(7.5rem+env(safe-area-inset-bottom))] sm:space-y-4 lg:pb-0">
        {/* Hero */}
        <div className="admin-card overflow-hidden">
          <div className="relative p-4 sm:p-5">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700" />
            <div className="absolute inset-0 opacity-30">
              <div className="absolute -right-6 -top-6 size-28 rounded-full bg-white/10 blur-2xl" />
              <div className="absolute -bottom-8 left-1/4 size-24 rounded-full bg-[var(--admin-accent)]/25 blur-2xl" />
            </div>
            <div className="relative space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/60">
                    Pedido
                  </p>
                  <h2 className="mt-0.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                    #{shortId}
                  </h2>
                </div>
                <Badge
                  variant="outline"
                  className={`shrink-0 border-0 ring-1 ${ORDER_STATUS_STYLES[order.status]}`}
                >
                  {ORDER_STATUS_LABELS[order.status]}
                </Badge>
              </div>

              <div>
                <p className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {formatPrice(order.totalAmount)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/70">
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    {orderDate}
                  </span>
                  <span className="text-white/40">·</span>
                  <span className="inline-flex items-center gap-1.5">
                    <Package className="size-3.5" />
                    {PAYMENT_METHOD_LABELS[order.paymentMethod]} ·{" "}
                    {order.items.length}{" "}
                    {order.items.length === 1 ? "item" : "itens"}
                  </span>
                  <span className="text-white/40">·</span>
                  <span>{PAYMENT_STATUS_LABELS[order.paymentStatus]}</span>
                </div>
              </div>

              {/* Status no desktop / tablet */}
              <div className="hidden items-center gap-2 border-t border-white/10 pt-4 lg:flex">
                <p className="text-xs font-medium text-white/60">
                  Alterar status
                </p>
                <Select
                  value={order.status}
                  onValueChange={value =>
                    handleStatusChange(value as OrderStatus)
                  }
                  disabled={isSaving}
                >
                  <SelectTrigger className="h-10 w-48 rounded-xl border-white/20 bg-white/10 text-white">
                    <SelectValue placeholder="Alterar status" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map(
                      value => (
                        <SelectItem key={value} value={value}>
                          {ORDER_STATUS_LABELS[value]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Cliente */}
        <div className="admin-card overflow-hidden">
          <div className="border-b border-[var(--admin-border)] px-4 py-3 sm:px-5">
            <h3 className="text-sm font-bold text-[var(--admin-text)]">
              Cliente
            </h3>
          </div>
          {order.customerId ? (
            <div className="p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-sm font-bold text-slate-600">
                  {customerInitials(order.customerName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-[var(--admin-text)]">
                    {order.customerName || "Sem nome"}
                  </p>
                  <p className="text-xs text-[var(--admin-text-muted)]">
                    Cliente da loja
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-1">
                {order.customerEmail && (
                  <a
                    href={`mailto:${order.customerEmail}`}
                    className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm text-[var(--admin-text-secondary)] transition-colors active:bg-[var(--admin-surface-hover)]"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <Mail className="size-4" />
                    </span>
                    <span className="min-w-0 truncate">
                      {order.customerEmail}
                    </span>
                  </a>
                )}
                {order.customerPhone && (
                  <a
                    href={`tel:${order.customerPhone}`}
                    className="flex items-center gap-3 rounded-xl px-2 py-2.5 text-sm text-[var(--admin-text-secondary)] transition-colors active:bg-[var(--admin-surface-hover)]"
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                      <Phone className="size-4" />
                    </span>
                    <span>{order.customerPhone}</span>
                  </a>
                )}
              </div>

              <Link
                href={`/admin/clientes/${order.customerId}`}
                className="mt-3 flex h-11 items-center justify-between rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-hover)] px-4 text-sm font-semibold text-[var(--admin-text)] transition-colors active:bg-slate-100"
              >
                <span className="inline-flex items-center gap-2">
                  <User className="size-4 text-[var(--admin-accent)]" />
                  Ver perfil do cliente
                </span>
                <ChevronRight className="size-4 text-[var(--admin-text-muted)]" />
              </Link>
            </div>
          ) : (
            <p className="p-4 text-sm text-[var(--admin-text-muted)] sm:p-5">
              Cliente não vinculado a este pedido.
            </p>
          )}
        </div>

        {/* Detalhes / itens */}
        <div className="admin-card p-4 sm:p-5">
          <h3 className="mb-4 text-sm font-bold text-[var(--admin-text)]">
            Detalhes do pedido
          </h3>
          <OrderDetailContent order={order} variant="admin" />
        </div>
      </div>

      {/* Barra de status — mobile */}
      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-30 border-t border-[var(--admin-border)] bg-white/95 p-3 shadow-[0_-8px_24px_rgba(15,23,42,0.06)] backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <Badge
            variant="outline"
            className={`shrink-0 border-0 ring-1 ${ORDER_STATUS_STYLES[order.status]}`}
          >
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>
          <Select
            value={order.status}
            onValueChange={value => handleStatusChange(value as OrderStatus)}
            disabled={isSaving}
          >
            <SelectTrigger className="h-11 flex-1 rounded-xl">
              <SelectValue placeholder="Alterar status" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map(
                value => (
                  <SelectItem key={value} value={value}>
                    {ORDER_STATUS_LABELS[value]}
                  </SelectItem>
                )
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
    </AdminLayout>
  );
}
