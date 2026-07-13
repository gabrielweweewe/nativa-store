import { afterEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./secretCrypto";

describe("secretCrypto", () => {
  const previous = process.env.MERCADO_PAGO_ENCRYPTION_KEY;

  afterEach(() => {
    process.env.MERCADO_PAGO_ENCRYPTION_KEY = previous;
  });

  it("criptografa com nonce e recupera o segredo", () => {
    process.env.MERCADO_PAGO_ENCRYPTION_KEY =
      "chave-de-teste-com-mais-de-32-caracteres";
    const first = encryptSecret("APP_USR-token");
    const second = encryptSecret("APP_USR-token");
    expect(first).not.toBe(second);
    expect(decryptSecret(first)).toBe("APP_USR-token");
  });

  it("rejeita chave curta", () => {
    process.env.MERCADO_PAGO_ENCRYPTION_KEY = "curta";
    expect(() => encryptSecret("segredo")).toThrow(/32 caracteres/);
  });
});
