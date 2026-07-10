import { mapBannerInputToRow, mapBannerRowToBanner, type BannerRow } from "@shared/lib/bannerMapper";
import type { Banner, BannerInput } from "@shared/types/banner";
import { supabase } from "../lib/supabase";

const BANNER_SELECT =
  "id, title, alt_text, image_url, image_url_mobile, link_url, object_position, object_position_mobile, sort_order, is_active, created_at, updated_at";

export async function listActiveBanners(): Promise<Banner[]> {
  const { data, error } = await supabase
    .from("banners")
    .select(BANNER_SELECT)
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Erro ao listar banners: ${error.message}`);
  }

  return ((data ?? []) as BannerRow[]).map(mapBannerRowToBanner);
}

export async function listAllBanners(): Promise<Banner[]> {
  const { data, error } = await supabase
    .from("banners")
    .select(BANNER_SELECT)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(`Erro ao listar banners: ${error.message}`);
  }

  return ((data ?? []) as BannerRow[]).map(mapBannerRowToBanner);
}

export async function getBannerById(id: string): Promise<Banner> {
  const { data, error } = await supabase
    .from("banners")
    .select(BANNER_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(error.code === "PGRST116" ? "Banner não encontrado" : error.message);
  }

  return mapBannerRowToBanner(data as BannerRow);
}

export async function createBanner(input: BannerInput): Promise<Banner> {
  const sortOrder =
    input.sortOrder ??
    (await (async () => {
      const { data } = await supabase
        .from("banners")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data?.sort_order ?? -1) + 1;
    })());

  const row = mapBannerInputToRow({ ...input, sortOrder });

  const { data, error } = await supabase
    .from("banners")
    .insert(row)
    .select(BANNER_SELECT)
    .single();

  if (error) {
    throw new Error(`Erro ao criar banner: ${error.message}`);
  }

  return mapBannerRowToBanner(data as BannerRow);
}

export async function updateBanner(id: string, input: BannerInput): Promise<Banner> {
  const row = mapBannerInputToRow(input);

  const { data, error } = await supabase
    .from("banners")
    .update(row)
    .eq("id", id)
    .select(BANNER_SELECT)
    .single();

  if (error) {
    throw new Error(
      error.code === "PGRST116" ? "Banner não encontrado" : `Erro ao atualizar banner: ${error.message}`,
    );
  }

  return mapBannerRowToBanner(data as BannerRow);
}

export async function deleteBanner(id: string): Promise<void> {
  const { error, count } = await supabase
    .from("banners")
    .delete({ count: "exact" })
    .eq("id", id);

  if (error) {
    throw new Error(`Erro ao excluir banner: ${error.message}`);
  }

  if (count === 0) {
    throw new Error("Banner não encontrado");
  }
}

export async function reorderBanners(orderedIds: string[]): Promise<Banner[]> {
  const updates = orderedIds.map((id, index) =>
    supabase
      .from("banners")
      .update({ sort_order: index, updated_at: new Date().toISOString() })
      .eq("id", id),
  );

  const results = await Promise.all(updates);
  const failed = results.find((result) => result.error);

  if (failed?.error) {
    throw new Error(`Erro ao reordenar banners: ${failed.error.message}`);
  }

  return listAllBanners();
}
