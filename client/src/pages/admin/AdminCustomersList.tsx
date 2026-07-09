import AdminLayout from "@/components/admin/AdminLayout";
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
import { ShoppingBag, UserPlus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

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
        <div className="flex size-10 items-center justify-center rounded-xl bg-[#2D6A4F]/10">
          <Icon className="size-5 text-[#2D6A4F]" />
        </div>
      </div>
    </Card>
  );
}

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
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total de clientes" value={String(stats.total)} icon={Users} />
        <StatCard label="Novos (7 dias)" value={String(stats.newCustomers)} icon={UserPlus} />
        <StatCard label="Com pedidos" value={String(stats.withOrders)} icon={ShoppingBag} />
      </div>

      <Card className="mt-4 border-[#E8D5C4] p-4">
        <Input
          placeholder="Buscar por nome, e-mail ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      <Card className="mt-4 border-[#E8D5C4]">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-[#8B6F5E]">
            <Spinner className="size-5" />
            Carregando clientes...
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-[#8B6F5E]">
            <Users className="size-8 opacity-50" />
            <p className="font-medium text-[#3D2B1F]">Nenhum cliente encontrado</p>
            <p className="text-sm">Ajuste a busca ou aguarde novos cadastros na loja.</p>
          </div>
        ) : (
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
        )}
      </Card>
    </AdminLayout>
  );
}
