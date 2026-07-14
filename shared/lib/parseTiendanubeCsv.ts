import type { Product, ProductCategory } from "@shared/types/product";

export interface TiendanubeCsvRow {
  slug: string;
  name: string;
  categories: string;
  price: number;
  promotionalPrice: number | null;
  stock: number;
  sku: string;
  published: boolean;
  freeShipping: boolean;
  description: string;
  tags: string;
  seoTitle: string;
  seoDescription: string;
  brand: string;
}

export interface MappedTiendanubeProduct extends Omit<Product, "id"> {}

const CSV_COLUMNS = {
  slug: 0,
  name: 1,
  categories: 2,
  price: 3,
  promotionalPrice: 4,
  stock: 9,
  sku: 10,
  published: 12,
  freeShipping: 13,
  description: 14,
  tags: 15,
  seoTitle: 16,
  seoDescription: 17,
  brand: 18,
} as const;

function parseNumber(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseBooleanSimNao(value: string): boolean {
  return value.trim().toUpperCase() === "SIM";
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&aacute;/g, "á")
    .replace(/&eacute;/g, "é")
    .replace(/&iacute;/g, "í")
    .replace(/&oacute;/g, "ó")
    .replace(/&uacute;/g, "ú")
    .replace(/&atilde;/g, "ã")
    .replace(/&ccedil;/g, "ç")
    .replace(/&Aacute;/g, "Á")
    .replace(/&Eacute;/g, "É")
    .replace(/&Iacute;/g, "Í")
    .replace(/&Oacute;/g, "Ó")
    .replace(/&Uacute;/g, "Ú")
    .replace(/&Atilde;/g, "Ã")
    .replace(/&Ccedil;/g, "Ç")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&bull;/g, "•")
    .replace(/\s+/g, " ")
    .trim();
}

function extractListItems(html: string, sectionPattern: RegExp): string[] {
  const sectionMatch = html.match(sectionPattern);
  if (!sectionMatch) return [];

  const sectionHtml = sectionMatch[1] ?? sectionMatch[0];
  const items = Array.from(sectionHtml.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)).map((match) =>
    stripHtml(match[1]),
  );

  return items.filter(Boolean);
}

function inferCategory(name: string, tags: string, categories: string): ProductCategory {
  void name;
  void tags;
  void categories;
  return "Bolsas";
}

function resolvePrices(regular: number | null, promotional: number | null) {
  if (regular === null && promotional === null) {
    return { price: 0, original_price: null as number | null };
  }

  if (
    regular !== null &&
    promotional !== null &&
    promotional > 0 &&
    promotional < regular
  ) {
    return { price: promotional, original_price: regular };
  }

  return { price: regular ?? promotional ?? 0, original_price: null as number | null };
}

export function parseSemicolonCsv(content: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const next = content[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ";") {
      row.push(field);
      field = "";
    } else if (char === "\n" || (char === "\r" && next === "\n")) {
      row.push(field);
      field = "";
      if (row.some((cell) => cell.trim())) {
        rows.push(row);
      }
      row = [];
      if (char === "\r") i += 1;
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim())) {
      rows.push(row);
    }
  }

  return rows;
}

export function parseTiendanubeCsv(content: string): TiendanubeCsvRow[] {
  const rows = parseSemicolonCsv(content);
  if (rows.length <= 1) return [];

  return rows.slice(1).map((cells) => ({
    slug: cells[CSV_COLUMNS.slug]?.trim() ?? "",
    name: cells[CSV_COLUMNS.name]?.trim() ?? "",
    categories: cells[CSV_COLUMNS.categories]?.trim() ?? "",
    price: parseNumber(cells[CSV_COLUMNS.price] ?? "") ?? 0,
    promotionalPrice: parseNumber(cells[CSV_COLUMNS.promotionalPrice] ?? ""),
    stock: parseNumber(cells[CSV_COLUMNS.stock] ?? "") ?? 0,
    sku: cells[CSV_COLUMNS.sku]?.trim() ?? "",
    published: parseBooleanSimNao(cells[CSV_COLUMNS.published] ?? ""),
    freeShipping: parseBooleanSimNao(cells[CSV_COLUMNS.freeShipping] ?? ""),
    description: cells[CSV_COLUMNS.description]?.trim() ?? "",
    tags: cells[CSV_COLUMNS.tags]?.trim() ?? "",
    seoTitle: cells[CSV_COLUMNS.seoTitle]?.trim() ?? "",
    seoDescription: cells[CSV_COLUMNS.seoDescription]?.trim() ?? "",
    brand: cells[CSV_COLUMNS.brand]?.trim() ?? "",
  }));
}

export function mapTiendanubeRowToProduct(
  row: TiendanubeCsvRow,
  imageUrl = "",
  extraImages: string[] = [],
): MappedTiendanubeProduct {
  const { price, original_price } = resolvePrices(row.price, row.promotionalPrice);
  const highlights = row.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (row.freeShipping && !highlights.some((h) => /frete/i.test(h))) {
    highlights.push("Frete grátis");
  }

  const materials = extractListItems(
    row.description,
    /(?:Materiais|Material)(?:[\s\S]*?<\/h3>)?([\s\S]*?)(?:<h3|$)/i,
  );

  const characteristics = extractListItems(
    row.description,
    /Características(?:[\s\S]*?<\/p>)?([\s\S]*?)(?:<h3|<p data-start|$)/i,
  );

  const badge =
    original_price !== null ? "Promoção" : highlights.find((h) => /mais vendid/i.test(h)) ?? "";

  const placeholderImage =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='1000' viewBox='0 0 800 1000'%3E%3Crect fill='%23F5F0E8' width='800' height='1000'/%3E%3Ctext x='400' y='500' text-anchor='middle' fill='%23C4522A' font-family='serif' font-size='28'%3ESem imagem%3C/text%3E%3C/svg%3E";

  const image = imageUrl || placeholderImage;
  const images = Array.from(new Set([imageUrl, ...extraImages].filter(Boolean)));
  const gallery = images.length > 0 ? images : [placeholderImage];

  return {
    slug: row.slug,
    name: row.name,
    category: inferCategory(row.name, row.tags, row.categories),
    price,
    originalPrice: original_price,
    image: gallery[0],
    images: gallery,
    badge,
    badgeColor: "#C4522A",
    rating: 0,
    reviews: 0,
    featured: false,
    shortDescription: row.seoDescription || stripHtml(row.description).slice(0, 180),
    description: row.description,
    materials: materials.length > 0 ? materials : characteristics.slice(0, 4),
    careInstructions: [],
    artisan: {
      name: row.brand || "Nativa",
      region: "",
      story: row.brand
        ? `Peça da marca ${row.brand}, produzida com cuidado artesanal.`
        : "",
    },
    sizes: [{ label: "Único", available: row.stock > 0 }],
    colors: [],
    sku: row.sku || row.slug,
    inStock: row.published && row.stock > 0,
    stockCount: Math.max(0, Math.floor(row.stock)),
    faq: [],
    highlights,
    regionId: null,
  };
}
