import { describe, expect, it } from "vitest";
import { brevoNewsletterSchema, brevoTransactionalEmailSchema } from "./brevo";

describe("schemas Brevo", () => {
  it("valida opt-in e preserva o honeypot", () => {
    const result = brevoNewsletterSchema.safeParse({
      email: "cliente@example.com",
      consent: true,
      name: "Cliente",
      website: "",
    });
    expect(result.success).toBe(true);
  });

  it("exige exatamente uma fonte de conteúdo no e-mail", () => {
    const base = {
      to: [{ email: "cliente@example.com" }],
      subject: "Assunto",
    };
    expect(
      brevoTransactionalEmailSchema.safeParse({
        ...base,
        htmlContent: "<p>Olá</p>",
      }).success
    ).toBe(true);
    expect(
      brevoTransactionalEmailSchema.safeParse({
        ...base,
        htmlContent: "<p>Olá</p>",
        templateId: 10,
      }).success
    ).toBe(false);
    expect(brevoTransactionalEmailSchema.safeParse(base).success).toBe(false);
  });

  it("permite template sem assunto explícito", () => {
    expect(
      brevoTransactionalEmailSchema.safeParse({
        to: [{ email: "cliente@example.com" }],
        templateId: 10,
      }).success
    ).toBe(true);
  });
});
