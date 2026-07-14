export type CouponType = "percentage" | "fixed" | "free_shipping";

export interface Coupon {
  id: string;
  code: string;
  type: CouponType;
  value: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  minSubtotal: number | null;
  maxUses: number | null;
  maxUsesPerCustomer: number | null;
  usageCount: number;
  description: string | null;
  isMapReward: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CouponInput {
  code: string;
  type: CouponType;
  value: number;
  isActive?: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  minSubtotal?: number | null;
  maxUses?: number | null;
  maxUsesPerCustomer?: number | null;
  description?: string | null;
  isMapReward?: boolean;
}

/** Cupom público da recompensa do Mapa das Origens. */
export interface MapRewardCoupon {
  code: string;
  description: string | null;
}

/** Resultado da aplicação de um cupom sobre o subtotal dos itens. */
export interface CouponApplication {
  code: string;
  type: CouponType;
  discountAmount: number;
  description: string | null;
  grantsFreeShipping: boolean;
}
