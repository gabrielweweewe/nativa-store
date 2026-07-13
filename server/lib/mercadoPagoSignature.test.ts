import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { validateMercadoPagoSignature } from "./mercadoPagoSignature";

describe("validateMercadoPagoSignature", () => {
  it("valida HMAC e normaliza o ID para minúsculas", () => {
    const ts = 1_750_000_000_000;
    const secret = "webhook-secret";
    const manifest = `id:ord123;request-id:req-1;ts:${ts};`;
    const hash = createHmac("sha256", secret).update(manifest).digest("hex");
    expect(
      validateMercadoPagoSignature({
        dataId: "ORD123",
        requestId: "req-1",
        signature: `ts=${ts},v1=${hash}`,
        secret,
        now: ts,
      })
    ).toBe(true);
  });

  it("rejeita assinatura expirada ou adulterada", () => {
    expect(
      validateMercadoPagoSignature({
        dataId: "ORD123",
        signature: "ts=1,v1=invalid",
        secret: "secret",
        now: 500_000,
      })
    ).toBe(false);
  });
});
