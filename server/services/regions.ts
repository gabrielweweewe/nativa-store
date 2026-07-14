import { mapProductRowToProduct, type ProductRow } from "@shared/lib/productMapper";
import { mapRegionInputToRow, mapRegionRowToRegion, type RegionRow } from "@shared/lib/regionMapper";
import type { Product } from "@shared/types/product";
import type { Region, RegionInput, RegionWithProducts } from "@shared/types/region";
import { supabase } from "../lib/supabase";

const REGION_SELECT = "id, name, title, story, cover_image, product_ids, created_at, updated_at";

async function populateRegions(rows: RegionRow[]): Promise<RegionWithProducts[]> {
  const allProductIds = Array.from(new Set(rows.flatMap((row) => row.product_ids ?? [])));

  const productsById = new Map<number, Product>();

  if (allProductIds.length > 0) {
    const { data, error } = await supabase.from("products").select("*").in("id", allProductIds);

    if (error) {
      throw new Error(`Erro ao carregar produtos das regiões: ${error.message}`);
    }

    for (const row of (data ?? []) as ProductRow[]) {
      productsById.set(row.id, mapProductRowToProduct(row));
    }
  }

  return rows.map((row) => {
    const { productIds, ...region } = mapRegionRowToRegion(row);
    return {
      ...region,
      products: productIds.map((id) => productsById.get(id)).filter((product): product is Product => Boolean(product)),
    };
  });
}

export async function listRegions(): Promise<RegionWithProducts[]> {
  const { data, error } = await supabase.from("regions").select(REGION_SELECT).order("id", { ascending: true });

  if (error) {
    throw new Error(`Erro ao listar regiões: ${error.message}`);
  }

  return populateRegions((data ?? []) as RegionRow[]);
}

export async function getRegionById(id: string): Promise<RegionWithProducts | null> {
  const { data, error } = await supabase.from("regions").select(REGION_SELECT).eq("id", id).maybeSingle();

  if (error) {
    throw new Error(`Erro ao carregar região: ${error.message}`);
  }

  if (!data) return null;

  const [region] = await populateRegions([data as RegionRow]);
  return region;
}

export async function listAllRegionsRaw(): Promise<Region[]> {
  const { data, error } = await supabase.from("regions").select(REGION_SELECT).order("id", { ascending: true });

  if (error) {
    throw new Error(`Erro ao listar regiões: ${error.message}`);
  }

  return ((data ?? []) as RegionRow[]).map(mapRegionRowToRegion);
}

export async function getRegionByIdRaw(id: string): Promise<Region> {
  const { data, error } = await supabase.from("regions").select(REGION_SELECT).eq("id", id).single();

  if (error) {
    throw new Error(error.code === "PGRST116" ? "Região não encontrada" : error.message);
  }

  return mapRegionRowToRegion(data as RegionRow);
}

export async function createRegion(input: RegionInput): Promise<Region> {
  const row = mapRegionInputToRow(input);

  const { data, error } = await supabase.from("regions").insert(row).select(REGION_SELECT).single();

  if (error) {
    throw new Error(
      error.code === "23505" ? "Já existe uma região com esse identificador" : `Erro ao criar região: ${error.message}`,
    );
  }

  return mapRegionRowToRegion(data as RegionRow);
}

export async function updateRegion(id: string, input: RegionInput): Promise<Region | null> {
  const row = mapRegionInputToRow(input);

  const { data, error } = await supabase.from("regions").update(row).eq("id", id).select(REGION_SELECT).maybeSingle();

  if (error) {
    throw new Error(`Erro ao atualizar região: ${error.message}`);
  }

  if (!data) return null;

  return mapRegionRowToRegion(data as RegionRow);
}

export async function deleteRegion(id: string): Promise<boolean> {
  const { data, error } = await supabase.from("regions").delete().eq("id", id).select("id");

  if (error) {
    throw new Error(`Erro ao excluir região: ${error.message}`);
  }

  return (data?.length ?? 0) > 0;
}
