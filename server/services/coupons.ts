import {
  mapCouponInputToRow,
  mapCouponRowToCoupon,
  type CouponRow,
} from "@shared/lib/couponMapper";
import {
  applyCouponToSubtotal,
  CouponEvalError,
  couponErrorMessage,
  normalizeCouponCode,
} from "@shared/lib/coupons";
import type { Coupon, CouponApplication, CouponInput } from "@shared/types/coupon";
import { supabase } from "../lib/supabase";

const COUPON_SELECT =
  "id, code, type, value, is_active, starts_at, ends_at, min_subtotal, max_uses, max_uses_per_customer, usage_count, description, is_map_reward, created_at, updated_at";

async function clearOtherMapRewards(exceptId?: string): Promise<void> {
  let query = supabase
    .from("coupons")
    .update({ is_map_reward: false, updated_at: new Date().toISOString() })
    .eq("is_map_reward", true);
  if (exceptId) {
    query = query.neq("id", exceptId);
  }
  const { error } = await query;
  if (error) {
    throw new Error(`Erro ao atualizar recompensa do mapa: ${error.message}`);
  }
}

/** Cupom ativo marcado para o passaporte do Mapa das Origens. */
export async function getMapRewardCoupon(): Promise<{
  code: string;
  description: string | null;
} | null> {
  const { data: marked, error: markedError } = await supabase
    .from("coupons")
    .select("code, description")
    .eq("is_map_reward", true)
    .eq("is_active", true)
    .maybeSingle();

  if (markedError) {
    throw new Error(`Erro ao buscar cupom do mapa: ${markedError.message}`);
  }
  if (marked) {
    return { code: marked.code, description: marked.description };
  }

  // Fallback: único frete grátis ativo (ex.: código renomeado sem flag)
  const { data: freeShipping, error: freeError } = await supabase
    .from("coupons")
    .select("code, description")
    .eq("type", "free_shipping")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(2);

  if (freeError) {
    throw new Error(`Erro ao buscar cupom do mapa: ${freeError.message}`);
  }
  if ((freeShipping ?? []).length === 1) {
    const only = freeShipping![0];
    return { code: only.code, description: only.description };
  }

  return null;
}

export async function listAllCoupons(): Promise<Coupon[]> {
  const { data, error } = await supabase
    .from("coupons")
    .select(COUPON_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Erro ao listar cupons: ${error.message}`);
  }

  return ((data ?? []) as CouponRow[]).map(mapCouponRowToCoupon);
}

export async function getCouponById(id: string): Promise<Coupon> {
  const { data, error } = await supabase
    .from("coupons")
    .select(COUPON_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(error.code === "PGRST116" ? "Cupom não encontrado" : error.message);
  }

  return mapCouponRowToCoupon(data as CouponRow);
}

export async function findCouponByCode(code: string): Promise<Coupon | null> {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;

  const { data, error } = await supabase
    .from("coupons")
    .select(COUPON_SELECT)
    .ilike("code", normalized)
    .maybeSingle();

  if (error) {
    throw new Error(`Erro ao buscar cupom: ${error.message}`);
  }

  return data ? mapCouponRowToCoupon(data as CouponRow) : null;
}

async function countCustomerCouponUses(
  customerId: string,
  code: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("customer_id", customerId)
    .ilike("coupon_code", normalizeCouponCode(code))
    .neq("status", "canceled");

  if (error) {
    throw new Error(`Erro ao contar usos do cupom: ${error.message}`);
  }

  return count ?? 0;
}

export async function assertCouponApplicable(params: {
  code: string;
  subtotal: number;
  customerId?: string | null;
}): Promise<CouponApplication> {
  const coupon = await findCouponByCode(params.code);
  if (!coupon) {
    throw new CouponEvalError("invalid", "Cupom inválido");
  }

  let customerUsageCount: number | undefined;
  if (params.customerId && coupon.maxUsesPerCustomer != null) {
    customerUsageCount = await countCustomerCouponUses(params.customerId, coupon.code);
  }

  try {
    return applyCouponToSubtotal(coupon, {
      subtotal: params.subtotal,
      customerUsageCount,
    });
  } catch (error) {
    if (error instanceof CouponEvalError) {
      throw new CouponEvalError(error.code, couponErrorMessage(error), error.minSubtotal);
    }
    throw error;
  }
}

export async function createCoupon(input: CouponInput): Promise<Coupon> {
  const row = mapCouponInputToRow(input);
  if (row.is_map_reward) {
    await clearOtherMapRewards();
  }

  const { data, error } = await supabase
    .from("coupons")
    .insert(row)
    .select(COUPON_SELECT)
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("Já existe um cupom com este código");
    }
    throw new Error(`Erro ao criar cupom: ${error.message}`);
  }

  return mapCouponRowToCoupon(data as CouponRow);
}

export async function updateCoupon(id: string, input: CouponInput): Promise<Coupon> {
  const row = mapCouponInputToRow(input);
  if (row.is_map_reward) {
    await clearOtherMapRewards(id);
  }

  const { data, error } = await supabase
    .from("coupons")
    .update(row)
    .eq("id", id)
    .select(COUPON_SELECT)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      throw new Error("Cupom não encontrado");
    }
    if (error.code === "23505") {
      throw new Error("Já existe um cupom com este código");
    }
    throw new Error(`Erro ao atualizar cupom: ${error.message}`);
  }

  return mapCouponRowToCoupon(data as CouponRow);
}

export async function deleteCoupon(id: string): Promise<void> {
  const { error, count } = await supabase
    .from("coupons")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    throw new Error(`Erro ao excluir cupom: ${error.message}`);
  }

  if (count === 0) {
    throw new Error("Cupom não encontrado");
  }
}

export async function incrementCouponUsage(code: string): Promise<void> {
  const coupon = await findCouponByCode(code);
  if (!coupon) return;

  const { error } = await supabase
    .from("coupons")
    .update({
      usage_count: coupon.usageCount + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", coupon.id);

  if (error) {
    throw new Error(`Erro ao registrar uso do cupom: ${error.message}`);
  }
}
