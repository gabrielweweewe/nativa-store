import { describe, expect, it } from "vitest";
import { checkoutSchema, fulfillmentUpdateSchema } from "./order";

const base = {
  shippingAddress: {
    cep: "01310100",
    rua: "Avenida Paulista",
    numero: "100",
    bairro: "Bela Vista",
    cidade: "São Paulo",
    estado: "SP",
  },
  shipping: {
    quoteId: "7f2b3574-1f1c-4df7-8c91-1fcb7d3f4ca9",
    serviceId: "1",
  },
  recipient: {
    name: "Maria da Silva",
    email: "maria@example.com",
    phone: "(11) 99999-9999",
    document: "123.456.789-09",
  },
  idempotencyKey: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
  payer: { identificationNumber: "123.456.789-09" },
};

describe("checkoutSchema Mercado Pago", () => {
  it("normaliza CPF e aceita Pix", () => {
    const result = checkoutSchema.parse({ ...base, paymentMethod: "pix" });
    expect(result.payer.identificationNumber).toBe("12345678909");
    expect(result.recipient.phone).toBe("11999999999");
    expect(result.recipient.document).toBe("12345678909");
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

  it("exige uma cotação persistida e um serviço", () => {
    const result = checkoutSchema.safeParse({
      ...base,
      shipping: { quoteId: "invalido", serviceId: "" },
      paymentMethod: "pix",
    });
    expect(result.success).toBe(false);
  });
});

describe("fulfillmentUpdateSchema", () => {
  it("exige rastreio ao marcar o pedido como enviado", () => {
    expect(
      fulfillmentUpdateSchema.safeParse({ status: "shipped" }).success
    ).toBe(false);
    expect(
      fulfillmentUpdateSchema.safeParse({
        status: "shipped",
        trackingCode: "BR123456789",
        trackingUrl: "https://rastreamento.example/BR123456789",
      }).success
    ).toBe(true);
  });

  it("aceita preparação e entrega sem alterar rastreio", () => {
    expect(
      fulfillmentUpdateSchema.safeParse({ status: "processing" }).success
    ).toBe(true);
    expect(
      fulfillmentUpdateSchema.safeParse({ status: "delivered" }).success
    ).toBe(true);
  });
});
