import type { CustomerAddress } from "@shared/types/address";
import type { OrderSummary } from "@shared/types/order";

export interface CustomerProfile {
  id: string;
  fullName: string;
  phone: string | null;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerProfileUpdateInput {
  fullName: string;
  phone?: string;
}

export interface AdminCustomerSummary {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  emailVerified: boolean;
  orderCount: number;
  totalSpent: number;
  createdAt: string;
}

export interface AdminCustomerDetail extends CustomerProfile {
  orderCount: number;
  totalSpent: number;
  addresses: CustomerAddress[];
  orders: OrderSummary[];
}
