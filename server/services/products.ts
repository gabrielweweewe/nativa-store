import { mapProductRowToProduct, mapProductToRow, type ProductRow } from "@shared/lib/productMapper";
import { slugify } from "@shared/lib/slugify";
import type { ProductInput } from "@shared/schemas/product";
import type { Product } from "@shared/types/product";
import { nanoid } from "nanoid";
import { supabase } from "../lib/supabase";

export async function listProducts(category?: string): Promise<Product[]> {
  let query = supabase.from("products").select("*").order("id", { ascending: true });

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data as ProductRow[]).map(mapProductRowToProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  return mapProductRowToProduct(data as ProductRow);
}

export async function slugExists(slug: string, excludeSlug?: string): Promise<boolean> {
  let query = supabase.from("products").select("slug", { count: "exact", head: true }).eq("slug", slug);

  if (excludeSlug) {
    query = query.neq("slug", excludeSlug);
  }

  const { count, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (count ?? 0) > 0;
}

export async function generateUniqueSlug(name: string, excludeSlug?: string): Promise<string> {
  const base = slugify(name) || "produto";
  let candidate = base;

  while (await slugExists(candidate, excludeSlug)) {
    candidate = `${base}-${nanoid(5).toLowerCase()}`;
  }

  return candidate;
}

export async function createProduct(input: ProductInput): Promise<Product> {
  const { data, error } = await supabase
    .from("products")
    .insert(mapProductToRow(input))
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapProductRowToProduct(data as ProductRow);
}

export async function updateProduct(
  currentSlug: string,
  input: ProductInput,
): Promise<Product | null> {
  const { data, error } = await supabase
    .from("products")
    .update(mapProductToRow(input))
    .eq("slug", currentSlug)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  return mapProductRowToProduct(data as ProductRow);
}

export async function deleteProduct(slug: string): Promise<boolean> {
  const { data, error } = await supabase.from("products").delete().eq("slug", slug).select("slug");

  if (error) {
    throw new Error(error.message);
  }

  return (data?.length ?? 0) > 0;
}

export interface BulkUpsertResult {
  created: number;
  updated: number;
  total: number;
}

export async function bulkUpsertProducts(inputs: ProductInput[]): Promise<BulkUpsertResult> {
  if (inputs.length === 0) {
    return { created: 0, updated: 0, total: 0 };
  }

  const slugs = inputs.map((input) => input.slug);

  const { data: existingRows, error: existingError } = await supabase
    .from("products")
    .select("slug")
    .in("slug", slugs);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingSlugs = new Set((existingRows ?? []).map((row) => row.slug as string));
  const rows = inputs.map(mapProductToRow);

  const { error } = await supabase.from("products").upsert(rows, { onConflict: "slug" });

  if (error) {
    throw new Error(error.message);
  }

  const updated = slugs.filter((slug) => existingSlugs.has(slug)).length;
  const created = slugs.length - updated;

  return { created, updated, total: slugs.length };
}
