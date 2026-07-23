import type { MetaCatalogSettingsSchemaInput } from "@shared/schemas/metaCatalog";
import type {
  MetaCatalogAdminStatus,
  MetaCatalogTestResult,
} from "@shared/types/metaCatalog";
import { normalizeBaseUrl } from "@shared/lib/seo";
import { nanoid } from "nanoid";
import { supabase } from "../lib/supabase";
import {
  buildFeedFromProducts,
  getCachedFeed,
  invalidateFeedCache,
  setCachedFeed,
} from "./feedService";
import { listProducts } from "./products";

type MetaCatalogSettingsRow = {
  id: boolean;
  enabled: boolean;
  feed_token: string | null;
  last_generated_at: string | null;
  product_count: number;
  excluded_count: number;
  default_brand: string;
  google_product_category: string;
  created_at: string;
  updated_at: string;
};

const SYNC_WINDOW_MS = 36 * 60 * 60 * 1000;

function appBaseUrl(): string {
  return normalizeBaseUrl(
    process.env.APP_URL?.trim() ||
      process.env.VITE_APP_URL?.trim() ||
      "http://localhost:5000"
  );
}

function buildFeedUrl(token: string | null): string {
  const base = `${appBaseUrl()}/api/feed/products.xml`;
  if (!token) return base;
  return `${base}?token=${encodeURIComponent(token)}`;
}

function isSynced(row: MetaCatalogSettingsRow): boolean {
  if (!row.enabled || !row.last_generated_at) return false;
  const generatedAt = Date.parse(row.last_generated_at);
  if (Number.isNaN(generatedAt)) return false;
  return Date.now() - generatedAt <= SYNC_WINDOW_MS;
}

function toAdminStatus(row: MetaCatalogSettingsRow): MetaCatalogAdminStatus {
  return {
    enabled: row.enabled,
    hasFeedToken: Boolean(row.feed_token),
    feedToken: row.feed_token,
    defaultBrand: row.default_brand || "Nativa",
    googleProductCategory: row.google_product_category || "",
    lastGeneratedAt: row.last_generated_at,
    productCount: row.product_count,
    excludedCount: row.excluded_count,
    feedUrl: buildFeedUrl(row.feed_token),
    synced: isSynced(row),
  };
}

async function getSettingsRow(): Promise<MetaCatalogSettingsRow> {
  const { data, error } = await supabase
    .from("meta_catalog_settings")
    .select("*")
    .eq("id", true)
    .single();

  if (error) throw new Error(error.message);
  return data as MetaCatalogSettingsRow;
}

async function persistGenerationStats(params: {
  productCount: number;
  excludedCount: number;
  generatedAt: string;
}): Promise<MetaCatalogSettingsRow> {
  const { data, error } = await supabase
    .from("meta_catalog_settings")
    .update({
      product_count: params.productCount,
      excluded_count: params.excludedCount,
      last_generated_at: params.generatedAt,
      updated_at: params.generatedAt,
    })
    .eq("id", true)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as MetaCatalogSettingsRow;
}

export async function getMetaCatalogAdminStatus(): Promise<MetaCatalogAdminStatus> {
  return toAdminStatus(await getSettingsRow());
}

export async function updateMetaCatalogSettings(
  input: MetaCatalogSettingsSchemaInput
): Promise<MetaCatalogAdminStatus> {
  const current = await getSettingsRow();

  let feedToken = current.feed_token;
  if (input.regenerateFeedToken) {
    feedToken = nanoid(32);
  } else if (input.feedToken !== undefined) {
    feedToken = input.feedToken;
  }

  if (input.enabled && !feedToken) {
    feedToken = nanoid(32);
  }

  const { data, error } = await supabase
    .from("meta_catalog_settings")
    .update({
      enabled: input.enabled,
      feed_token: feedToken,
      default_brand: input.defaultBrand,
      google_product_category: input.googleProductCategory,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  invalidateFeedCache();
  return toAdminStatus(data as MetaCatalogSettingsRow);
}

export async function generateMetaCatalogFeed(options?: {
  force?: boolean;
}): Promise<{
  xml: string;
  productCount: number;
  excludedCount: number;
  generatedAt: string;
  exclusions: MetaCatalogTestResult["exclusions"];
}> {
  const settings = await getSettingsRow();

  if (!options?.force) {
    const cached = getCachedFeed();
    if (cached) {
      return {
        xml: cached.xml,
        productCount: cached.productCount,
        excludedCount: cached.excludedCount,
        generatedAt: cached.generatedAt,
        exclusions: [],
      };
    }
  }

  const products = await listProducts();
  const built = buildFeedFromProducts(products, {
    baseUrl: appBaseUrl(),
    brand: settings.default_brand || "Nativa",
    googleProductCategory: settings.google_product_category || undefined,
  });

  const generatedAt = new Date().toISOString();
  const productCount = built.items.length;
  const excludedCount = built.exclusions.length;

  await persistGenerationStats({
    productCount,
    excludedCount,
    generatedAt,
  });

  setCachedFeed({
    xml: built.xml,
    productCount,
    excludedCount,
    generatedAt,
  });

  return {
    xml: built.xml,
    productCount,
    excludedCount,
    generatedAt,
    exclusions: built.exclusions,
  };
}

export async function getPublicProductFeedXml(
  tokenFromQuery?: string
): Promise<string> {
  const settings = await getSettingsRow();

  if (!settings.enabled) {
    const error = new Error("Feed do catálogo Meta desativado");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  if (settings.feed_token) {
    if (!tokenFromQuery || tokenFromQuery !== settings.feed_token) {
      const error = new Error("Token do feed inválido");
      (error as Error & { status?: number }).status = 401;
      throw error;
    }
  }

  const result = await generateMetaCatalogFeed();
  return result.xml;
}

export async function testMetaCatalogFeed(): Promise<MetaCatalogTestResult> {
  const result = await generateMetaCatalogFeed({ force: true });
  return {
    included: result.productCount,
    excluded: result.excludedCount,
    exclusions: result.exclusions,
    productCount: result.productCount,
    excludedCount: result.excludedCount,
    lastGeneratedAt: result.generatedAt,
  };
}
