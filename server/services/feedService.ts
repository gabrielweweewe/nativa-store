import { absoluteUrl, stripHtml } from "@shared/lib/seo";
import type { Product } from "@shared/types/product";
import type {
  FeedExclusionReason,
  FeedProductItem,
  MetaCatalogExclusion,
} from "@shared/types/metaCatalog";
import { buildProductFeedXml } from "../lib/xmlBuilder";

const CACHE_TTL_MS = 20 * 60 * 1000;

export type FeedBuildOptions = {
  baseUrl: string;
  brand: string;
  googleProductCategory?: string;
};

export type FeedBuildResult = {
  items: FeedProductItem[];
  exclusions: MetaCatalogExclusion[];
  xml: string;
};

type CacheEntry = {
  expiresAt: number;
  xml: string;
  productCount: number;
  excludedCount: number;
  generatedAt: string;
};

let feedCache: CacheEntry | null = null;

export function invalidateFeedCache(): void {
  feedCache = null;
}

export function formatFeedPrice(price: number): string {
  return `${price.toFixed(2)} BRL`;
}

export function resolveFeedProductId(
  product: Pick<Product, "id" | "sku">
): string {
  const sku = product.sku?.trim();
  return sku || String(product.id);
}

export function isProductInStock(
  product: Pick<Product, "inStock" | "stockCount">
): boolean {
  return Boolean(product.inStock && product.stockCount > 0);
}

export function classifyProductForFeed(
  product: Product
): { ok: true } | { ok: false; reason: FeedExclusionReason } {
  if (!product.image?.trim()) {
    return { ok: false, reason: "sem imagem" };
  }
  if (!(typeof product.price === "number") || !(product.price > 0)) {
    return { ok: false, reason: "sem preço" };
  }
  return { ok: true };
}

function uniqueAbsoluteImages(
  baseUrl: string,
  primary: string,
  extras: string[]
): { imageLink: string; additionalImageLinks: string[] } {
  const imageLink = absoluteUrl(baseUrl, primary.trim());
  const seen = new Set([imageLink]);
  const additionalImageLinks: string[] = [];

  for (const raw of extras) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    const url = absoluteUrl(baseUrl, trimmed);
    if (seen.has(url)) continue;
    seen.add(url);
    additionalImageLinks.push(url);
  }

  return { imageLink, additionalImageLinks };
}

export function mapProductToFeedItem(
  product: Product,
  options: FeedBuildOptions
): FeedProductItem {
  const { imageLink, additionalImageLinks } = uniqueAbsoluteImages(
    options.baseUrl,
    product.image,
    product.images ?? []
  );

  const descriptionSource =
    product.description?.trim() ||
    product.shortDescription?.trim() ||
    product.name;

  return {
    id: resolveFeedProductId(product),
    title: product.name.trim(),
    description: stripHtml(descriptionSource),
    link: absoluteUrl(options.baseUrl, `/produto/${product.slug}`),
    imageLink,
    additionalImageLinks,
    price: formatFeedPrice(product.price),
    availability: isProductInStock(product) ? "in stock" : "out of stock",
    condition: "new",
    brand: options.brand,
    googleProductCategory: options.googleProductCategory?.trim() || undefined,
    productType: product.category || undefined,
  };
}

export function buildFeedFromProducts(
  products: Product[],
  options: FeedBuildOptions
): FeedBuildResult {
  const items: FeedProductItem[] = [];
  const exclusions: MetaCatalogExclusion[] = [];

  for (const product of products) {
    const classification = classifyProductForFeed(product);
    if (!classification.ok) {
      exclusions.push({
        id: resolveFeedProductId(product),
        name: product.name,
        reason: classification.reason,
      });
      continue;
    }
    items.push(mapProductToFeedItem(product, options));
  }

  const xml = buildProductFeedXml({
    title: `${options.brand} — Catálogo de produtos`,
    link: options.baseUrl.replace(/\/$/, ""),
    description: `Feed de produtos da ${options.brand} para Instagram e Facebook Shopping`,
    items,
  });

  return { items, exclusions, xml };
}

export function getCachedFeed(): CacheEntry | null {
  if (!feedCache) return null;
  if (Date.now() > feedCache.expiresAt) {
    feedCache = null;
    return null;
  }
  return feedCache;
}

export function setCachedFeed(
  entry: Omit<CacheEntry, "expiresAt">
): CacheEntry {
  feedCache = {
    ...entry,
    expiresAt: Date.now() + CACHE_TTL_MS,
  };
  return feedCache;
}
