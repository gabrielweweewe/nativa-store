import AdminLayout from "@/components/admin/AdminLayout";
import AdminEmptyState from "@/components/admin/AdminEmptyState";
import AdminMobileCard, { AdminDesktopTable, AdminMobileList } from "@/components/admin/AdminMobileCard";
import AdminStatGrid from "@/components/admin/AdminStatGrid";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchAdminCustomers } from "@/lib/adminApi";
import { formatPrice } from "@/lib/products";
import type { AdminCustomerSummary } from "@shared/types/customer";
import { Search, ShoppingBag, UserPlus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function AdminCustomersList() {
  const [customers, setCustomers] = useState<AdminCustomerSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadCustomers() {
    setIsLoading(true);
    try {
      const data = await fetchAdminCustomers();
      setCustomers(data);
    } catch {
      toast.error("Não foi possível carregar os clientes");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return customers;

    return customers.filter(
      (customer) =>
        customer.fullName.toLowerCase().includes(query) ||
        customer.email.toLowerCase().includes(query) ||
        (customer.phone?.includes(query) ?? false),
    );
  }, [customers, search]);

  const stats = useMemo(() => {
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const newCustomers = customers.filter(
      (customer) => new Date(customer.createdAt).getTime() >= sevenDaysAgo,
    ).length;
    const withOrders = customers.filter((customer) => customer.orderCount > 0).length;

    return {
      total: customers.length,
      newCustomers,
      withOrders,
    };
  }, [customers]);

  return (
    <AdminLayout title="Clientes">
      <AdminStatGrid
        items={[
          { label: "Total", value: String(stats.total), icon: Users, accent: "green" },
          { label: "Novos (7d)", value: String(stats.newCustomers), icon: UserPlus, accent: "green" },
          { label: "Com pedidos", value: String(stats.withOrders), icon: ShoppingBag, accent: "green" },
        ]}
      />

      <Card className="mt-4 border-[#E8D5C4] p-3 sm:p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#8B6F5E]" />
          <Input
            placeholder="Buscar nome, e-mail ou telefone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 rounded-xl pl-9"
          />
        </div>
      </Card>

      <Card className="mt-4 overflow-hidden border-[#E8D5C4]">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-[#8B6F5E]">
            <Spinner className="size-5" />
            Carregando clientes...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <AdminEmptyState
            icon={<Users className="size-8" />}
            title="Nenhum cliente encontrado"
            description="Ajuste a busca ou aguarde novos cadastros na loja."
          />
        ) : (
          <>
            <AdminMobileList>
              {filteredCustomers.map((customer) => (
                <AdminMobileCard key={customer.id} href={`/admin/clientes/${customer.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#3D2B1F]">
                        {customer.fullName || "Sem nome"}
                      </p>
                      <p className="truncate text-xs text-[#8B6F5E]">{customer.email || "—"}</p>
                      <p className="mt-1 text-xs text-[#8B6F5E]">
                        {customer.orderCount} {customer.orderCount === 1 ? "pedido" : "pedidos"} ·{" "}
                        Cadastro{" "}
                        {new Date(customer.createdAt).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <p className="text-sm font-bold text-[#C4522A]">
                        {formatPrice(customer.totalSpent)}
                      </p>
                      <Badge
                        variant="outline"
                        className={
                          customer.emailVerified
                            ? "border-0 bg-[#2D6A4F]/10 text-[#2D6A4F]"
                            : "border-0 bg-[#E8821A]/10 text-[#B86A12]"
                        }
                      >
                        {customer.emailVerified ? "Verificado" : "Pendente"}
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
                    <TableHead>Cliente</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Pedidos</TableHead>
                    <TableHead>Total gasto</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => (
                    <TableRow key={customer.id} className="cursor-pointer hover:bg-[#FAF7F2]/80">
                      <TableCell>
                        <Link
                          href={`/admin/clientes/${customer.id}`}
                          className="font-medium text-[#3D2B1F] hover:text-[#C4522A]"
                        >
                          {customer.fullName || "Sem nome"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-[#8B6F5E]">{customer.email || "—"}</TableCell>
                      <TableCell className="text-[#8B6F5E]">{customer.phone || "—"}</TableCell>
                      <TableCell>{customer.orderCount}</TableCell>
                      <TableCell className="font-medium text-[#3D2B1F]">
                        {formatPrice(customer.totalSpent)}
                      </TableCell>
                      <TableCell className="text-[#8B6F5E]">
                        {new Date(customer.createdAt).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            customer.emailVerified
                              ? "border-0 bg-[#2D6A4F]/10 text-[#2D6A4F]"
                              : "border-0 bg-[#E8821A]/10 text-[#B86A12]"
                          }
                        >
                          {customer.emailVerified ? "Verificado" : "Pendente"}
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
