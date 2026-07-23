import type { Product } from "@shared/types/product";
import { describe, expect, it } from "vitest";
import {
  buildFeedFromProducts,
  classifyProductForFeed,
  formatFeedPrice,
  mapProductToFeedItem,
} from "../services/feedService";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 42,
    slug: "bolsa-aruanda",
    name: "Bolsa Aruanda",
    category: "Bolsas",
    price: 129.9,
    originalPrice: null,
    image: "https://cdn.example.com/bolsa.jpg",
    images: ["https://cdn.example.com/bolsa-2.jpg"],
    badge: "",
    badgeColor: "#C4522A",
    rating: 5,
    reviews: 0,
    featured: false,
    shortDescription: "Bolsa artesanal",
    description: "<p>Feita à <strong>mão</strong></p>",
    materials: [],
    careInstructions: [],
    artisan: { name: "", region: "", story: "" },
    sizes: [],
    colors: [],
    sku: "SKU-ARU-01",
    inStock: true,
    stockCount: 3,
    faq: [],
    highlights: [],
    styleTags: [],
    regionId: null,
    ...overrides,
  };
}

describe("feedService", () => {
  it("exclui produto sem imagem", () => {
    expect(classifyProductForFeed(makeProduct({ image: "  " }))).toEqual({
      ok: false,
      reason: "sem imagem",
    });
  });

  it("exclui produto sem preço", () => {
    expect(classifyProductForFeed(makeProduct({ price: 0 }))).toEqual({
      ok: false,
      reason: "sem preço",
    });
  });

  it("formata preço no padrão Meta", () => {
    expect(formatFeedPrice(129.9)).toBe("129.90 BRL");
    expect(formatFeedPrice(10)).toBe("10.00 BRL");
  });

  it("mantém produto sem estoque como out of stock", () => {
    const item = mapProductToFeedItem(
      makeProduct({ inStock: false, stockCount: 0 }),
      {
        baseUrl: "https://nativa.store",
        brand: "Nativa",
        googleProductCategory: "Bolsas e acessórios",
      }
    );

    expect(item.availability).toBe("out of stock");
    expect(item.id).toBe("SKU-ARU-01");
    expect(item.price).toBe("129.90 BRL");
    expect(item.description).toBe("Feita à mão");
    expect(item.link).toBe("https://nativa.store/produto/bolsa-aruanda");
  });

  it("adiciona https:// quando a URL base vem sem esquema", () => {
    const item = mapProductToFeedItem(makeProduct(), {
      baseUrl: "nativa-store.vercel.app",
      brand: "Nativa",
    });
    const { xml } = buildFeedFromProducts([makeProduct()], {
      baseUrl: "nativa-store.vercel.app/",
      brand: "Nativa",
    });

    expect(item.link).toBe(
      "https://nativa-store.vercel.app/produto/bolsa-aruanda"
    );
    expect(xml).toContain("<link>https://nativa-store.vercel.app</link>");
    expect(xml).toContain(
      "<g:link>https://nativa-store.vercel.app/produto/bolsa-aruanda</g:link>"
    );
  });

  it("gera XML RSS parseável com namespace g:", () => {
    const { xml, items, exclusions } = buildFeedFromProducts(
      [
        makeProduct(),
        makeProduct({ id: 2, sku: "X2", image: "", name: "Sem foto" }),
        makeProduct({ id: 3, sku: "X3", price: 0, name: "Sem preço" }),
      ],
      {
        baseUrl: "https://nativa.store",
        brand: "Nativa",
        googleProductCategory: "Bolsas e acessórios",
      }
    );

    expect(items).toHaveLength(1);
    expect(exclusions).toEqual([
      { id: "X2", name: "Sem foto", reason: "sem imagem" },
      { id: "X3", name: "Sem preço", reason: "sem preço" },
    ]);

    expect(xml).toContain('xmlns:g="http://base.google.com/ns/1.0"');
    expect(xml).toContain("<g:id>SKU-ARU-01</g:id>");
    expect(xml).toContain("<g:price>129.90 BRL</g:price>");
    expect(xml).toContain("<g:availability>in stock</g:availability>");
    expect(xml).toContain("<g:condition>new</g:condition>");
    expect(xml).toContain("<g:brand>Nativa</g:brand>");
    expect(xml).toContain(
      "<g:google_product_category>Bolsas e acessórios</g:google_product_category>"
    );
    expect(xml).toContain("<g:product_type>Bolsas</g:product_type>");
    expect(xml).toContain(
      "<g:additional_image_link>https://cdn.example.com/bolsa-2.jpg</g:additional_image_link>"
    );
    expect(xml.trimStart().startsWith("<?xml")).toBe(true);
    expect(xml.includes('<rss version="2.0"')).toBe(true);
    expect(xml.trimEnd().endsWith("</rss>")).toBe(true);
    expect(xml.match(/<item>/g)?.length).toBe(1);
    expect(xml.match(/<\/item>/g)?.length).toBe(1);
  });
});
