import { describe, expect, it } from "vitest";
import { metaCatalogSettingsSchema } from "./metaCatalog";

describe("metaCatalogSettingsSchema", () => {
  it("aceita payload válido e normaliza token vazio para null", () => {
    const parsed = metaCatalogSettingsSchema.parse({
      enabled: true,
      feedToken: "  ",
      defaultBrand: "Nativa",
      googleProductCategory: "Bolsas e acessórios",
    });

    expect(parsed.feedToken).toBeNull();
    expect(parsed.defaultBrand).toBe("Nativa");
    expect(parsed.googleProductCategory).toBe("Bolsas e acessórios");
  });

  it("rejeita marca vazia", () => {
    const result = metaCatalogSettingsSchema.safeParse({
      enabled: false,
      defaultBrand: "   ",
      googleProductCategory: "",
    });
    expect(result.success).toBe(false);
  });
});
