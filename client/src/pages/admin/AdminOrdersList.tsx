import AdminLayout from "@/components/admin/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAdminOrders } from "@/lib/adminApi";
import { formatPrice } from "@/lib/products";
import {
  formatOrderShortId,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  PAYMENT_METHOD_LABELS,
} from "@shared/lib/orderLabels";
import type { AdminOrderSummary, OrderStatus } from "@shared/types/order";
import { CheckCircle2, Clock, Package, Search, ShoppingCart, Wallet } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

type PeriodFilter = "all" | "7d" | "30d";

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Card className="border-[#E8D5C4] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[#8B6F5E]">{label}</p>
          <p
            className="mt-1 text-2xl font-bold text-[#3D2B1F]"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {value}
          </p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-xl bg-[#C4522A]/10">
          <Icon className="size-5 text-[#C4522A]" />
        </div>
      </div>
    </Card>
  );
}

export default function AdminOrdersList() {
  const [orders, setOrders] = useState<AdminOrderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [period, setPeriod] = useState<PeriodFilter>("all");

  async function loadOrders() {
    setIsLoading(true);
    try {
      const data = await fetchAdminOrders();
      setOrders(data);
    } catch {
      toast.error("Não foi possível carregar os pedidos");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const now = Date.now();
    const periodMs =
      period === "7d" ? 7 * 24 * 60 * 60 * 1000 : period === "30d" ? 30 * 24 * 60 * 60 * 1000 : 0;

    return orders.filter((order) => {
      const matchesStatus = status === "all" || order.status === status;
      const matchesPeriod =
        period === "all" || now - new Date(order.createdAt).getTime() <= periodMs;
      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        order.id.toLowerCase().includes(query) ||
        formatOrderShortId(order.id).toLowerCase().includes(query) ||
        (order.customerName?.toLowerCase().includes(query) ?? false) ||
        (order.customerEmail?.toLowerCase().includes(query) ?? false);

      return matchesStatus && matchesPeriod && matchesSearch;
    });
  }, [orders, search, status, period]);

  const stats = useMemo(() => {
    const paidOrders = orders.filter((o) => o.status === "paid");
    const pendingOrders = orders.filter((o) => o.status === "pending");
    const revenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    return {
      total: orders.length,
      paid: paidOrders.length,
      pending: pendingOrders.length,
      revenue,
    };
  }, [orders]);

  return (
    <AdminLayout title="Pedidos">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total de pedidos" value={String(stats.total)} icon={ShoppingCart} />
        <StatCard label="Confirmados" value={String(stats.paid)} icon={CheckCircle2} />
        <StatCard label="Pendentes" value={String(stats.pending)} icon={Clock} />
        <StatCard label="Faturamento" value={formatPrice(stats.revenue)} icon={Wallet} />
      </div>

      <Card className="mt-4 border-[#E8D5C4] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B6F5E]" />
            <Input
              placeholder="Buscar por ID, cliente ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full lg:w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((value) => (
                <SelectItem key={value} value={value}>
                  {ORDER_STATUS_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={(value) => setPeriod(value as PeriodFilter)}>
            <SelectTrigger className="w-full lg:w-44">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o período</SelectItem>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="mt-4 border-[#E8D5C4]">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-[#8B6F5E]">
            <Spinner className="size-5" />
            Carregando pedidos...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-[#8B6F5E]">
            <Package className="size-8 opacity-50" />
            <p className="font-medium text-[#3D2B1F]">Nenhum pedido encontrado</p>
            <p className="text-sm">Ajuste os filtros ou aguarde novas compras na loja.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id} className="cursor-pointer hover:bg-[#FAF7F2]/80">
                  <TableCell>
                    <Link
                      href={`/admin/pedidos/${order.id}`}
                      className="font-semibold text-[#C4522A] hover:underline"
                    >
                      #{formatOrderShortId(order.id)}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-[#3D2B1F]">
                      {order.customerName || "Cliente removido"}
                    </div>
                    <div className="text-xs text-[#8B6F5E]">{order.customerEmail || "—"}</div>
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
        )}
      </Card>
    </AdminLayout>
  );
}
