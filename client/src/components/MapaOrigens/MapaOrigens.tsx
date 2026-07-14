/**
 * Nativa Store — Mapa Vivo das Origens
 * Mapa interativo do Brasil por região, com a história cultural de cada
 * estampa e os produtos que carregam essa origem.
 */

import { useRegions } from "@/hooks/useRegions";
import { useMemo, useState } from "react";
import { FeatherBlue, FeatherGreen, FeatherOrange } from "../NativaDecorations";
import RegionPanel from "./RegionPanel";
import RegionSvg, { type RegionId } from "./RegionSvg";

const REGION_ID_FALLBACK_LABEL: Record<RegionId, string> = {
  norte: "Norte",
  nordeste: "Nordeste",
  "centro-oeste": "Centro-Oeste",
  sudeste: "Sudeste",
  sul: "Sul",
};

export default function MapaOrigens() {
  const { regions, loading, error } = useRegions();
  const [selectedId, setSelectedId] = useState<RegionId | null>(null);

  const regionsById = useMemo(() => {
    const map = new Map(regions.map((region) => [region.id, region]));
    return map;
  }, [regions]);

  const selectedRegion = selectedId ? regionsById.get(selectedId) ?? null : null;

  function getRegionName(id: RegionId): string {
    return regionsById.get(id)?.name ?? REGION_ID_FALLBACK_LABEL[id];
  }

  function handleSelect(id: RegionId) {
    setSelectedId((current) => (current === id ? current : id));
  }

  return (
    <section className="relative overflow-hidden py-12 md:py-20" style={{ background: "#FAF7F2" }}>
      <div className="pointer-events-none absolute left-[5%] top-8 opacity-25 feather-float hidden sm:block">
        <FeatherGreen className="h-12 w-5 rotate-[-16deg]" />
      </div>
      <div className="pointer-events-none absolute right-[6%] top-16 opacity-25 feather-float-delay hidden sm:block">
        <FeatherOrange className="h-11 w-5 rotate-[12deg]" />
      </div>
      <div className="pointer-events-none absolute bottom-10 left-[16%] opacity-20 feather-float-delay2 hidden md:block">
        <FeatherBlue className="h-10 w-4 rotate-[-8deg]" />
      </div>

      <div className="container relative">
        <div className="mx-auto mb-12 max-w-xl text-center md:mb-16">
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="h-px w-10 bg-[#C4522A]/35 sm:w-14" />
            <span
              className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#2D6A4F]"
              style={{ fontFamily: "'Nunito', sans-serif" }}
            >
              Origens
            </span>
            <span className="h-px w-10 bg-[#C4522A]/35 sm:w-14" />
          </div>
          <h2
            className="mb-3 text-3xl font-bold md:text-5xl"
            style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              background: "linear-gradient(135deg, #C4522A, #E8821A, #C9922A)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Cada bordado tem uma história
          </h2>
          <p
            className="text-base text-[#8B6F5E] md:text-lg"
            style={{ fontFamily: "'Lora', serif", fontStyle: "italic" }}
          >
            Um mapa vivo das tradições que inspiram nossas estampas
          </p>
        </div>

        {loading && (
          <p className="text-center text-[#8B6F5E] py-16" style={{ fontFamily: "'Lora', serif" }}>
            Carregando o mapa das origens...
          </p>
        )}

        {error && !loading && (
          <p className="text-center text-[#C4522A] py-16" style={{ fontFamily: "'Nunito', sans-serif" }}>
            {error}
          </p>
        )}

        {!loading && !error && (
          <div className="flex flex-col gap-8 md:flex-row md:items-start md:gap-10">
            <div className="w-full md:w-1/2">
              <RegionSvg selectedId={selectedId} onSelect={handleSelect} getRegionName={getRegionName} />
            </div>

            <div className="w-full md:w-1/2">
              <RegionPanel region={selectedRegion} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
