import { fetchRegions } from "@/lib/regions";
import type { RegionWithProducts } from "@shared/types/region";
import { useEffect, useState } from "react";

interface UseRegionsResult {
  regions: RegionWithProducts[];
  loading: boolean;
  error: string | null;
}

/** Busca as regiões do Mapa Vivo das Origens (com produtos já populados). */
export function useRegions(): UseRegionsResult {
  const [regions, setRegions] = useState<RegionWithProducts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);

    fetchRegions()
      .then((data) => {
        if (active) setRegions(data);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Erro ao carregar regiões");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { regions, loading, error };
}
