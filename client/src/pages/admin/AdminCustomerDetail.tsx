import AdminLayout from "@/components/admin/AdminLayout";
import AdminMobileCard, { AdminDesktopTable, AdminMobileList } from "@/components/admin/AdminMobileCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAdminCustomer } from "@/lib/adminApi";
import { formatPrice } from "@/lib/products";
import { formatAddressLine, formatCepDisplay } from "@shared/types/address";
import {
  formatOrderShortId,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  PAYMENT_METHOD_LABELS,
} from "@shared/lib/orderLabels";
import type { AdminCustomerDetail } from "@shared/types/customer";
import { ArrowLeft, Mail, MapPin, Phone, ShoppingCart, User } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link, useParams } from "wouter";

export default function AdminCustomerDetail() {
  const params = useParams<{ id: string }>();
  const customerId = params.id;
  const [customer, setCustomer] = useState<AdminCustomerDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!customerId) return;

    let cancelled = false;
    setIsLoading(true);

    fetchAdminCustomer(customerId)
      .then((data) => {
        if (!cancelled) setCustomer(data);
      })
      .catch(() => {
        if (!cancelled) toast.error("Não foi possível carregar o cliente");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [customerId]);

  if (isLoading) {
    return (
      <AdminLayout title="Cliente" backHref="/admin/clientes">
        <div className="flex justify-center py-16">
          <Spinner className="size-7 text-[#C4522A]" />
        </div>
      </AdminLayout>
    );
  }

  if (!customer) {
    return (
      <AdminLayout title="Cliente" backHref="/admin/clientes">
        <Card className="border-[#E8D5C4] p-8 text-center">
          <p className="font-medium text-[#3D2B1F]">Cliente não encontrado</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/admin/clientes">
              <ArrowLeft className="size-4" />
              Voltar para clientes
            </Link>
          </Button>
        </Card>
      </AdminLayout>
    );
  }

  const displayName = customer.fullName || "Cliente";

  return (
    <AdminLayout
      title={displayName}
      backHref="/admin/clientes"
      actions={
        <Button variant="outline" asChild>
          <Link href="/admin/clientes">
            <ArrowLeft className="size-4" />
            Voltar
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-[#E8D5C4] p-4 sm:p-5 lg:col-span-2">
          <h2
            className="mb-4 text-base font-bold text-[#3D2B1F] sm:text-lg"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Perfil
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2 text-[#3D2B1F]">
              <User className="size-4 shrink-0 text-[#C4522A]" />
              <span className="truncate">{customer.fullName || "Sem nome"}</span>
            </div>
            <div className="flex items-center gap-2 text-[#8B6F5E]">
              <Mail className="size-4 shrink-0" />
              <span className="truncate">{customer.email || "—"}</span>
            </div>
            <div className="flex items-center gap-2 text-[#8B6F5E]">
              <Phone className="size-4 shrink-0" />
              <span>{customer.phone || "—"}</span>
            </div>
            <Badge
              variant="outline"
              className={
                customer.emailVerified
                  ? "border-0 bg-[#2D6A4F]/10 text-[#2D6A4F]"
                  : "border-0 bg-[#E8821A]/10 text-[#B86A12]"
              }
            >
              {customer.emailVerified ? "E-mail verificado" : "E-mail pendente"}
            </Badge>
          </div>
          <div className="mt-4 space-y-1 text-xs text-[#8B6F5E] sm:text-sm">
            <p>Cadastro: {new Date(customer.createdAt).toLocaleString("pt-BR")}</p>
            <p>Atualizado: {new Date(customer.updatedAt).toLocaleString("pt-BR")}</p>
          </div>
        </Card>

        <Card className="border-[#E8D5C4] p-4 sm:p-5">
          <h2
            className="mb-4 text-base font-bold text-[#3D2B1F] sm:text-lg"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Resumo
          </h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <div className="rounded-xl bg-[#FAF7F2] p-3">
              <p className="text-xs text-[#8B6F5E]">Pedidos</p>
              <p className="mt-1 text-xl font-bold text-[#3D2B1F]">{customer.orderCount}</p>
            </div>
            <div className="rounded-xl bg-[#FAF7F2] p-3">
              <p className="text-xs text-[#8B6F5E]">Total gasto</p>
              <p className="mt-1 text-xl font-bold text-[#C4522A]">
                {formatPrice(customer.totalSpent)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="mt-4 border-[#E8D5C4] p-4 sm:p-5">
        <h2
          className="mb-4 flex items-center gap-2 text-base font-bold text-[#3D2B1F] sm:text-lg"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          <MapPin className="size-5 text-[#C4522A]" />
          Endereços salvos
        </h2>
        {customer.addresses.length === 0 ? (
          <p className="text-sm text-[#8B6F5E]">Nenhum endereço cadastrado.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {customer.addresses.map((address) => (
              <div
                key={address.id}
                className="rounded-2xl border border-[#E8D5C4] bg-[#FAF7F2] p-4 text-sm"
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-[#3D2B1F]">{address.label}</span>
                  {address.isDefault && (
                    <Badge variant="outline" className="border-0 bg-[#C4522A]/10 text-[#C4522A]">
                      Padrão
                    </Badge>
                  )}
                </div>
                <p className="leading-relaxed text-[#8B6F5E]">{formatAddressLine(address)}</p>
                <p className="mt-1 text-xs text-[#8B6F5E]">CEP {formatCepDisplay(address.cep)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-4 overflow-hidden border-[#E8D5C4]">
        <div className="border-b border-[#E8D5C4] p-4 sm:p-5">
          <h2
            className="flex items-center gap-2 text-base font-bold text-[#3D2B1F] sm:text-lg"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            <ShoppingCart className="size-5 text-[#C4522A]" />
            Pedidos do cliente
          </h2>
        </div>
        {customer.orders.length === 0 ? (
          <p className="p-4 text-sm text-[#8B6F5E] sm:p-5">Este cliente ainda não fez pedidos.</p>
        ) : (
          <>
            <AdminMobileList>
              {customer.orders.map((order) => (
                <AdminMobileCard key={order.id} href={`/admin/pedidos/${order.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-[#C4522A]">
                        #{formatOrderShortId(order.id)}
                      </p>
                      <p className="mt-0.5 text-xs text-[#8B6F5E]">
                        {new Date(order.createdAt).toLocaleDateString("pt-BR")} ·{" "}
                        {PAYMENT_METHOD_LABELS[order.paymentMethod]}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-sm font-bold text-[#3D2B1F]">
                        {formatPrice(order.totalAmount)}
                      </p>
                      <Badge
                        variant="outline"
                        className={`border-0 ring-1 ${ORDER_STATUS_STYLES[order.status]}`}
                      >
                        {ORDER_STATUS_LABELS[order.status]}
                      </Badge>
                    </div>
                  </div>
                </AdminMobileCard>
              ))}
            </AdminMobileList>

            <AdminDesktopTable>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customer.orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell>
                        <Link
                          href={`/admin/pedidos/${order.id}`}
                          className="font-semibold text-[#C4522A] hover:underline"
                        >
                          #{formatOrderShortId(order.id)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-[#8B6F5E]">
                        {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>{order.itemCount}</TableCell>
                      <TableCell className="font-medium text-[#3D2B1F]">
                        {formatPrice(order.totalAmount)}
                      </TableCell>
                      <TableCell className="text-[#8B6F5E]">
                        {PAYMENT_METHOD_LABELS[order.paymentMethod]}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`border-0 ring-1 ${ORDER_STATUS_STYLES[order.status]}`}
                        >
                          {ORDER_STATUS_LABELS[order.status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </AdminDesktopTable>
          </>
        )}
      </Card>
    </AdminLayout>
  );
}
