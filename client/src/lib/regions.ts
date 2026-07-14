import type { RegionWithProducts } from "@shared/types/region";

export async function fetchRegions(): Promise<RegionWithProducts[]> {
  const response = await fetch("/api/regions");

  if (!response.ok) {
    throw new Error("Não foi possível carregar as regiões");
  }

  return response.json();
}

export async function fetchRegionById(id: string): Promise<RegionWithProducts | null> {
  const response = await fetch(`/api/regions/${encodeURIComponent(id)}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Não foi possível carregar a região");
  }

  return response.json();
}
