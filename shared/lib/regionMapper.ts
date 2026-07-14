import type { Region, RegionInput } from "@shared/types/region";

export interface RegionRow {
  id: string;
  name: string;
  title: string;
  story: string;
  cover_image: string;
  product_ids: number[] | null;
  created_at: string;
  updated_at: string;
}

function asProductIds(value: unknown): number[] {
  return Array.isArray(value) ? value.filter((item): item is number => typeof item === "number") : [];
}

export function mapRegionRowToRegion(row: RegionRow): Region {
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    story: row.story,
    coverImage: row.cover_image,
    productIds: asProductIds(row.product_ids),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapRegionInputToRow(input: RegionInput): Record<string, unknown> {
  return {
    id: input.id,
    name: input.name,
    title: input.title,
    story: input.story,
    cover_image: input.coverImage,
    product_ids: input.productIds,
    updated_at: new Date().toISOString(),
  };
}
