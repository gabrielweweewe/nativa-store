import type { Coupon, CouponInput, CouponType } from "@shared/types/coupon";
import { normalizeCouponCode } from "./coupons";

export interface CouponRow {
  id: string;
  code: string;
  type: string;
  value: number | string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  min_subtotal: number | string | null;
  max_uses: number | null;
  max_uses_per_customer: number | null;
  usage_count: number;
  description: string | null;
  is_map_reward?: boolean;
  created_at: string;
  updated_at: string;
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") return parseFloat(value);
  return 0;
}

function toNullableNumber(value: unknown): number | null {
  if (value == null || value === "") return null;
  const n = toNumber(value);
  return Number.isFinite(n) ? n : null;
}

export function mapCouponRowToCoupon(row: CouponRow): Coupon {
  return {
    id: row.id,
    code: row.code,
    type: row.type as CouponType,
    value: toNumber(row.value),
    isActive: row.is_active,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    minSubtotal: toNullableNumber(row.min_subtotal),
    maxUses: row.max_uses,
    maxUsesPerCustomer: row.max_uses_per_customer,
    usageCount: row.usage_count,
    description: row.description,
    isMapReward: Boolean(row.is_map_reward),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCouponInputToRow(input: CouponInput): Record<string, unknown> {
  const type = input.type;
  const value = type === "free_shipping" ? 0 : input.value;

  return {
    code: normalizeCouponCode(input.code),
    type,
    value,
    is_active: input.isActive ?? true,
    starts_at: input.startsAt ?? null,
    ends_at: input.endsAt ?? null,
    min_subtotal: input.minSubtotal ?? null,
    max_uses: input.maxUses ?? null,
    max_uses_per_customer: input.maxUsesPerCustomer ?? null,
    description: input.description ?? null,
    is_map_reward: type === "free_shipping" ? Boolean(input.isMapReward) : false,
    updated_at: new Date().toISOString(),
  };
}
