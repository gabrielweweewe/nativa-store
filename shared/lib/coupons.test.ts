import { describe, expect, it } from "vitest";
import type { Coupon } from "@shared/types/coupon";
import type { ShippingQuoteOption } from "@shared/types/melhorEnvio";
import {
  applyCouponToSubtotal,
  applyFreeShippingCoupon,
  computeItemDiscount,
  CouponEvalError,
  evaluateCoupon,
  normalizeCouponCode,
} from "./coupons";
import { applyFreeShipping } from "./shipping";

function baseCoupon(overrides: Partial<Coupon> = {}): Coupon {
  return {
    id: "c1",
    code: "NATIVA15",
    type: "percentage",
    value: 15,
    isActive: true,
    startsAt: null,
    endsAt: null,
    minSubtotal: null,
    maxUses: null,
    maxUsesPerCustomer: null,
    usageCount: 0,
    description: "15% off",
    isMapReward: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function option(price: number, id = "1"): ShippingQuoteOption {
  return {
    id,
    name: "PAC",
    company: "Correios",
    price,
    customPrice: price,
    deliveryTime: 5,
    customDeliveryTime: 5,
    currency: "R$",
    companyId: 1,
    packages: [],
    error: null,
  };
}

describe("normalizeCouponCode", () => {
  it("trim e uppercase", () => {
    expect(normalizeCouponCode("  nativa15 ")).toBe("NATIVA15");
  });
});

describe("computeItemDiscount", () => {
  it("calcula percentual", () => {
    expect(computeItemDiscount("percentage", 15, 200)).toBe(30);
  });

  it("calcula valor fixo", () => {
    expect(computeItemDiscount("fixed", 40, 200)).toBe(40);
  });

  it("não deixa subtotal negativo no fixed", () => {
    expect(computeItemDiscount("fixed", 500, 80)).toBe(80);
  });

  it("free_shipping não desconta itens", () => {
    expect(computeItemDiscount("free_shipping", 0, 200)).toBe(0);
  });
});

describe("evaluateCoupon", () => {
  it("rejeita inativo", () => {
    expect(() => evaluateCoupon(baseCoupon({ isActive: false }), { subtotal: 100 })).toThrow(
      CouponEvalError,
    );
  });

  it("rejeita abaixo do mínimo", () => {
    try {
      evaluateCoupon(baseCoupon({ minSubtotal: 150 }), { subtotal: 100 });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(CouponEvalError);
      expect((error as CouponEvalError).code).toBe("min_subtotal");
    }
  });

  it("rejeita esgotado", () => {
    expect(() =>
      evaluateCoupon(baseCoupon({ maxUses: 10, usageCount: 10 }), { subtotal: 100 }),
    ).toThrow(CouponEvalError);
  });

  it("rejeita limite por cliente", () => {
    expect(() =>
      evaluateCoupon(baseCoupon({ maxUsesPerCustomer: 1 }), {
        subtotal: 100,
        customerUsageCount: 1,
      }),
    ).toThrow(CouponEvalError);
  });

  it("rejeita expirado", () => {
    expect(() =>
      evaluateCoupon(baseCoupon({ endsAt: "2020-01-01T00:00:00.000Z" }), {
        subtotal: 100,
        now: new Date("2026-01-01"),
      }),
    ).toThrow(CouponEvalError);
  });
});

describe("applyCouponToSubtotal", () => {
  it("aplica NATIVA15", () => {
    const result = applyCouponToSubtotal(baseCoupon(), { subtotal: 200 });
    expect(result.discountAmount).toBe(30);
    expect(result.grantsFreeShipping).toBe(false);
  });

  it("marca frete grátis", () => {
    const result = applyCouponToSubtotal(
      baseCoupon({ code: "BORDADO5", type: "free_shipping", value: 0 }),
      { subtotal: 50 },
    );
    expect(result.discountAmount).toBe(0);
    expect(result.grantsFreeShipping).toBe(true);
  });
});

describe("frete grátis: threshold + cupom", () => {
  it("cupom zera a opção mais barata", () => {
    const options = [option(25), option(40)];
    const result = applyFreeShippingCoupon(options);
    expect(result.applied).toBe(true);
    expect(result.options[0].customPrice).toBe(0);
    expect(result.options[1].customPrice).toBe(40);
  });

  it("threshold + cupom permanece idempotente em 0", () => {
    const options = [option(25), option(40)];
    const viaThreshold = applyFreeShipping(options, 300, true, 299);
    expect(viaThreshold.options[0].customPrice).toBe(0);
    const viaCoupon = applyFreeShippingCoupon(viaThreshold.options);
    expect(viaCoupon.options[0].customPrice).toBe(0);
    expect(viaCoupon.options[1].customPrice).toBe(40);
  });
});
