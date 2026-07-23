import { describe, expect, it } from "vitest";
import { absoluteUrl, normalizeBaseUrl } from "./seo";

describe("normalizeBaseUrl", () => {
  it("prefixa https quando o esquema está ausente", () => {
    expect(normalizeBaseUrl("nativa-store.vercel.app")).toBe(
      "https://nativa-store.vercel.app"
    );
    expect(normalizeBaseUrl("nativa-store.vercel.app/")).toBe(
      "https://nativa-store.vercel.app"
    );
  });

  it("preserva http e https existentes", () => {
    expect(normalizeBaseUrl("http://localhost:5000")).toBe(
      "http://localhost:5000"
    );
    expect(normalizeBaseUrl("https://nativa.store/")).toBe(
      "https://nativa.store"
    );
  });
});

describe("absoluteUrl", () => {
  it("monta path absoluto mesmo com base sem esquema", () => {
    expect(absoluteUrl("nativa-store.vercel.app", "/produto/bolsa")).toBe(
      "https://nativa-store.vercel.app/produto/bolsa"
    );
  });
});
