import type { AdminCustomerDetail, AdminCustomerSummary } from "@shared/types/customer";
import type { OrderSummary } from "@shared/types/order";
import { mapOrderRowToSummary, type OrderRow } from "@shared/lib/orderMapper";
import { listCustomerAddresses } from "./addresses";
import { supabase } from "../lib/supabase";

async function fetchAllProfiles() {
  const { data, error } = await supabase
    .from("customer_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function fetchAuthUsersByIds(ids: string[]) {
  const users = new Map<string, { email: string; emailVerified: boolean }>();
  if (!ids.length) return users;

  await Promise.all(
    ids.map(async (id) => {
      const { data } = await supabase.auth.admin.getUserById(id);
      if (data?.user) {
        users.set(id, {
          email: data.user.email ?? "",
          emailVerified: Boolean(data.user.email_confirmed_at),
        });
      }
    }),
  );

  return users;
}

async function fetchOrderStatsByCustomer() {
  const stats = new Map<string, { orderCount: number; totalSpent: number }>();

  const { data, error } = await supabase
    .from("orders")
    .select("customer_id, total_amount, status")
    .not("customer_id", "is", null);

  if (error) throw new Error(error.message);

  for (const row of data ?? []) {
    if (!row.customer_id || row.status === "canceled") continue;

    const current = stats.get(row.customer_id) ?? { orderCount: 0, totalSpent: 0 };
    current.orderCount += 1;
    current.totalSpent += Number(row.total_amount);
    stats.set(row.customer_id, current);
  }

  return stats;
}

export async function listAllCustomers(): Promise<AdminCustomerSummary[]> {
  const [profiles, orderStats] = await Promise.all([fetchAllProfiles(), fetchOrderStatsByCustomer()]);
  const authUsers = await fetchAuthUsersByIds(profiles.map((profile) => String(profile.id)));

  return profiles.map((profile) => {
    const id = String(profile.id);
    const authUser = authUsers.get(id);
    const stats = orderStats.get(id) ?? { orderCount: 0, totalSpent: 0 };

    return {
      id,
      fullName: String(profile.full_name ?? ""),
      email: authUser?.email ?? "",
      phone: profile.phone == null ? null : String(profile.phone),
      emailVerified: authUser?.emailVerified ?? false,
      orderCount: stats.orderCount,
      totalSpent: stats.totalSpent,
      createdAt: String(profile.created_at),
    };
  });
}

export async function getCustomerById(customerId: string): Promise<AdminCustomerDetail> {
  const { data: profile, error } = await supabase
    .from("customer_profiles")
    .select("*")
    .eq("id", customerId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!profile) throw new Error("Cliente não encontrado");

  const [{ data: authData }, addresses, orders, orderStats] = await Promise.all([
    supabase.auth.admin.getUserById(customerId),
    listCustomerAddresses(customerId),
    listCustomerOrdersForAdmin(customerId),
    fetchOrderStatsByCustomer(),
  ]);

  const stats = orderStats.get(customerId) ?? { orderCount: 0, totalSpent: 0 };

  return {
    id: customerId,
    fullName: String(profile.full_name ?? ""),
    phone: profile.phone == null ? null : String(profile.phone),
    email: authData?.user?.email ?? "",
    emailVerified: Boolean(authData?.user?.email_confirmed_at),
    createdAt: String(profile.created_at),
    updatedAt: String(profile.updated_at),
    orderCount: stats.orderCount,
    totalSpent: stats.totalSpent,
    addresses,
    orders,
  };
}

export async function listCustomerOrdersForAdmin(customerId: string): Promise<OrderSummary[]> {
  const { data: orderRows, error } = await supabase
    .from("orders")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  if (!orderRows?.length) return [];

  const orderIds = orderRows.map((row) => row.id);
  const { data: itemRows, error: itemsError } = await supabase
    .from("order_items")
    .select("order_id, quantity")
    .in("order_id", orderIds);

  if (itemsError) throw new Error(itemsError.message);

  const countMap = new Map<string, number>();
  for (const item of itemRows ?? []) {
    const current = countMap.get(item.order_id) ?? 0;
    countMap.set(item.order_id, current + Number(item.quantity));
  }

  return orderRows.map((row) =>
    mapOrderRowToSummary(row as OrderRow, countMap.get(row.id) ?? 0),
  );
}
