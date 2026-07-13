import { describe, expect, it } from "vitest";
import { checkoutSchema } from "./order";

const base = {
  shippingAddress: {
    cep: "01310100",
    rua: "Avenida Paulista",
    numero: "100",
    bairro: "Bela Vista",
    cidade: "São Paulo",
    estado: "SP",
  },
  idempotencyKey: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
  payer: { identificationNumber: "123.456.789-09" },
};

describe("checkoutSchema Mercado Pago", () => {
  it("normaliza CPF e aceita Pix", () => {
    const result = checkoutSchema.parse({ ...base, paymentMethod: "pix" });
    expect(result.payer.identificationNumber).toBe("12345678909");
  });

  it("exige tokenização para cartão", () => {
    const result = checkoutSchema.safeParse({
      ...base,
      paymentMethod: "credit_card",
    });
    expect(result.success).toBe(false);
  });

  it("aceita cartão tokenizado e parcelas", () => {
    const result = checkoutSchema.safeParse({
      ...base,
      paymentMethod: "credit_card",
      card: {
        token: "card-token",
        paymentMethodId: "master",
        installments: 3,
      },
    });
    expect(result.success).toBe(true);
  });
});
