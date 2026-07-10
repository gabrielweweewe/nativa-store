import type { Banner, BannerInput } from "@shared/types/banner";

export interface BannerRow {
  id: string;
  title: string;
  alt_text: string;
  image_url: string;
  image_url_mobile: string | null;
  link_url: string | null;
  object_position: string;
  object_position_mobile: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function mapBannerRowToBanner(row: BannerRow): Banner {
  return {
    id: row.id,
    title: row.title ?? "",
    altText: row.alt_text ?? "Banner Nativa",
    imageUrl: row.image_url,
    imageUrlMobile: row.image_url_mobile,
    linkUrl: row.link_url,
    objectPosition: row.object_position || "center center",
    objectPositionMobile: row.object_position_mobile || "center 22%",
    sortOrder: row.sort_order ?? 0,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapBannerInputToRow(input: BannerInput): Record<string, unknown> {
  return {
    title: input.title ?? "",
    alt_text: input.altText,
    image_url: input.imageUrl,
    image_url_mobile: input.imageUrlMobile ?? null,
    link_url: input.linkUrl ?? null,
    object_position: input.objectPosition ?? "center center",
    object_position_mobile: input.objectPositionMobile ?? "center 22%",
    sort_order: input.sortOrder ?? 0,
    is_active: input.isActive ?? true,
    updated_at: new Date().toISOString(),
  };
}
