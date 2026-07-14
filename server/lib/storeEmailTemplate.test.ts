import { describe, expect, it } from "vitest";
import {
  buildItemsHtml,
  renderStoreEmailTemplate,
} from "../../server/lib/storeEmailTemplate";

describe("storeEmailTemplate", () => {
  it("substitui variáveis simples", () => {
    expect(
      renderStoreEmailTemplate("Olá, {{CUSTOMER_NAME}}!", {
        CUSTOMER_NAME: "Maria",
      })
    ).toBe("Olá, Maria!");
  });

  it("monta lista de itens", () => {
    const html = buildItemsHtml([
      { name: "Anel", quantity: 2, price: "R$ 10,00", size: "M" },
    ]);
    expect(html).toContain("2x Anel");
    expect(html).toContain("R$ 10,00");
  });

  it("injeta ITEMS_HTML no template", () => {
    const html = renderStoreEmailTemplate("<ul>{{ITEMS_HTML}}</ul>", {
      ITEMS: [{ name: "Colar", quantity: 1, price: "R$ 50,00" }],
    });
    expect(html).toContain("<li>1x Colar — R$ 50,00</li>");
  });
});
