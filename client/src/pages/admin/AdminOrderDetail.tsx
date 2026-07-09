import AdminLayout from "@/components/admin/AdminLayout";
import OrderDetailContent from "@/components/orders/OrderDetailContent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
} from "@shared/lib/orderLabels";
import type { AdminOrderDetail, OrderStatus } from "@shared/types/order";
import { ArrowLeft, Mail, Phone, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useParams } from "wouter";

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
          <Spinner className="size-7 text-[#C4522A]" />
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout title="Pedido" backHref="/admin/pedidos">
        <Card className="border-[#E8D5C4] p-8 text-center">
          <p className="font-medium text-[#3D2B1F]">Pedido não encontrado</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/admin/pedidos">
              <ArrowLeft className="size-4" />
              Voltar para pedidos
            </Link>
          </Button>
        </Card>
      </AdminLayout>
    );
  }

  const orderDate = new Date(order.createdAt).toLocaleString("pt-BR");

  return (
    <AdminLayout
      title={`#${formatOrderShortId(order.id)}`}
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
      <div className="space-y-4 pb-24 lg:pb-0">
        <Card className="border-[#E8D5C4] p-4 sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs text-[#8B6F5E] sm:text-sm">{orderDate}</p>
              <p
                className="mt-1 text-2xl font-bold text-[#3D2B1F] sm:text-3xl"
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {formatPrice(order.totalAmount)}
              </p>
              <p className="mt-1 text-sm text-[#8B6F5E]">
                {PAYMENT_METHOD_LABELS[order.paymentMethod]} · {order.items.length}{" "}
                {order.items.length === 1 ? "item" : "itens"}
              </p>
            </div>
            <div className="hidden flex-col gap-2 sm:flex-row sm:items-center lg:flex">
              <Badge
                variant="outline"
                className={`w-fit border-0 ring-1 ${ORDER_STATUS_STYLES[order.status]}`}
              >
                {ORDER_STATUS_LABELS[order.status]}
              </Badge>
              <Select
                value={order.status}
                onValueChange={(value) => handleStatusChange(value as OrderStatus)}
                disabled={isSaving}
              >
                <SelectTrigger className="h-11 w-full rounded-xl sm:w-44">
                  <SelectValue placeholder="Alterar status" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((value) => (
                    <SelectItem key={value} value={value}>
                      {ORDER_STATUS_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Card className="border-[#E8D5C4] p-4 sm:p-5">
          <h2
            className="mb-4 text-base font-bold text-[#3D2B1F] sm:text-lg"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Cliente
          </h2>
          {order.customerId ? (
            <div className="space-y-3 text-sm" style={{ fontFamily: "'Nunito', sans-serif" }}>
              <div className="flex items-center gap-2 text-[#3D2B1F]">
                <User className="size-4 shrink-0 text-[#C4522A]" />
                <span className="truncate">{order.customerName || "Sem nome"}</span>
              </div>
              {order.customerEmail && (
                <div className="flex items-center gap-2 text-[#8B6F5E]">
                  <Mail className="size-4 shrink-0" />
                  <span className="truncate">{order.customerEmail}</span>
                </div>
              )}
              {order.customerPhone && (
                <div className="flex items-center gap-2 text-[#8B6F5E]">
                  <Phone className="size-4 shrink-0" />
                  <span>{order.customerPhone}</span>
                </div>
              )}
              <Button asChild variant="outline" className="mt-2 h-11 w-full rounded-xl">
                <Link href={`/admin/clientes/${order.customerId}`}>Ver perfil do cliente</Link>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-[#8B6F5E]">Cliente não vinculado a este pedido.</p>
          )}
        </Card>

        <Card className="border-[#E8D5C4] p-4 sm:p-5">
          <OrderDetailContent order={order} />
        </Card>
      </div>

      <div
        className="fixed inset-x-0 bottom-[calc(3.25rem+env(safe-area-inset-bottom))] z-30 border-t border-[#E8D5C4] bg-white/95 p-3 backdrop-blur-md lg:hidden"
      >
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <Badge
            variant="outline"
            className={`shrink-0 border-0 ring-1 ${ORDER_STATUS_STYLES[order.status]}`}
          >
            {ORDER_STATUS_LABELS[order.status]}
          </Badge>
          <Select
            value={order.status}
            onValueChange={(value) => handleStatusChange(value as OrderStatus)}
            disabled={isSaving}
          >
            <SelectTrigger className="h-11 flex-1 rounded-xl">
              <SelectValue placeholder="Alterar status" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((value) => (
                <SelectItem key={value} value={value}>
                  {ORDER_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </AdminLayout>
  );
}
