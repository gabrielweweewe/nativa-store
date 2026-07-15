import type {
  Product,
  ProductColor,
  ProductFaq,
  ProductSize,
} from "@shared/types/product";

export interface ProductRow {
  id: number;
  slug: string;
  name: string;
  category: string;
  price: number;
  original_price: number | null;
  image: string;
  images: unknown;
  badge: string;
  badge_color: string;
  rating: number;
  reviews: number;
  featured: boolean;
  short_description: string;
  description: string;
  materials: unknown;
  care_instructions: unknown;
  artisan: unknown;
  sizes: unknown;
  colors: unknown;
  sku: string;
  in_stock: boolean;
  stock_count: number;
  width_cm?: number | null;
  height_cm?: number | null;
  length_cm?: number | null;
  weight_kg?: number | null;
  faq: unknown;
  highlights: unknown;
  style_tags?: unknown;
  region_id?: string | null;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asSizes(value: unknown): ProductSize[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ProductSize =>
      typeof item === "object" &&
      item !== null &&
      "label" in item &&
      "available" in item &&
      typeof item.label === "string" &&
      typeof item.available === "boolean",
  );
}

function asColors(value: unknown): ProductColor[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ProductColor =>
      typeof item === "object" &&
      item !== null &&
      "name" in item &&
      "hex" in item &&
      typeof item.name === "string" &&
      typeof item.hex === "string",
  );
}

function asFaq(value: unknown): ProductFaq[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is ProductFaq =>
      typeof item === "object" &&
      item !== null &&
      "question" in item &&
      "answer" in item &&
      typeof item.question === "string" &&
      typeof item.answer === "string",
  );
}

function asArtisan(value: unknown): Product["artisan"] {
  if (typeof value !== "object" || value === null) {
    return { name: "", region: "", story: "" };
  }

  const artisan = value as Record<string, unknown>;
  return {
    name: typeof artisan.name === "string" ? artisan.name : "",
    region: typeof artisan.region === "string" ? artisan.region : "",
    story: typeof artisan.story === "string" ? artisan.story : "",
  };
}

export function mapProductRowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category as Product["category"],
    price: Number(row.price),
    originalPrice: row.original_price === null ? null : Number(row.original_price),
    image: row.image,
    images: asStringArray(row.images),
    badge: row.badge,
    badgeColor: row.badge_color,
    rating: Number(row.rating),
    reviews: row.reviews,
    featured: row.featured,
    shortDescription: row.short_description,
    description: row.description,
    materials: asStringArray(row.materials),
    careInstructions: asStringArray(row.care_instructions),
    artisan: asArtisan(row.artisan),
    sizes: asSizes(row.sizes),
    colors: asColors(row.colors),
    sku: row.sku,
    inStock: row.in_stock,
    stockCount: row.stock_count,
    widthCm: row.width_cm == null ? null : Number(row.width_cm),
    heightCm: row.height_cm == null ? null : Number(row.height_cm),
    lengthCm: row.length_cm == null ? null : Number(row.length_cm),
    weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
    faq: asFaq(row.faq),
    highlights: asStringArray(row.highlights),
    styleTags: asStringArray(row.style_tags),
    regionId: row.region_id ?? null,
  };
}

export function mapProductToRow(product: Omit<Product, "id">) {
  return {
    slug: product.slug,
    name: product.name,
    category: product.category,
    price: product.price,
    original_price: product.originalPrice,
    image: product.image,
    images: product.images,
    badge: product.badge,
    badge_color: product.badgeColor,
    rating: product.rating,
    reviews: product.reviews,
    featured: product.featured,
    short_description: product.shortDescription,
    description: product.description,
    materials: product.materials,
    care_instructions: product.careInstructions,
    artisan: product.artisan,
    sizes: product.sizes,
    colors: product.colors,
    sku: product.sku,
    in_stock: product.inStock,
    stock_count: product.stockCount,
    width_cm: product.widthCm,
    height_cm: product.heightCm,
    length_cm: product.lengthCm,
    weight_kg: product.weightKg,
    faq: product.faq,
    highlights: product.highlights,
    style_tags: product.styleTags ?? [],
    region_id: product.regionId ?? null,
  };
}
