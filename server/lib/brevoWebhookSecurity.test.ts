import { describe, expect, it } from "vitest";
import {
  bearerToken,
  brevoEventKey,
  tokensMatch,
} from "./brevoWebhookSecurity";

describe("segurança do webhook Brevo", () => {
  it("aceita somente Bearer bem formado", () => {
    expect(bearerToken("Bearer segredo")).toBe("segredo");
    expect(bearerToken("bearer segredo")).toBe("segredo");
    expect(bearerToken("Basic segredo")).toBeNull();
    expect(bearerToken("Bearer")).toBeNull();
  });

  it("compara tokens sem depender do comprimento", () => {
    expect(tokensMatch("token-correto", "token-correto")).toBe(true);
    expect(tokensMatch("curto", "token-correto-muito-maior")).toBe(false);
  });

  it("gera chave idempotente estável e sensível ao evento", () => {
    const event = {
      event: "delivered",
      email: "cliente@example.com",
      id: 42,
      ts_event: 1_720_000_000,
      "message-id": "<message@example.com>",
    };
    expect(brevoEventKey(event)).toBe(brevoEventKey({ ...event }));
    expect(brevoEventKey({ ...event, event: "opened" })).not.toBe(
      brevoEventKey(event)
    );
  });
});
