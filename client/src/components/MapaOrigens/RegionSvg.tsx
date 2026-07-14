/**
 * Nativa Store — Mapa Vivo das Origens
 * Contorno real (e simplificado) do Brasil por macrorregião, baseado na
 * malha territorial oficial do IBGE — ver server/scripts/generate-brazil-map.ts.
 * As 5 regiões se tocam exatamente nas bordas reais (mesma fonte geográfica).
 */

import { useState, type KeyboardEvent } from "react";
import { BRAZIL_MAP_VIEWBOX, BRAZIL_REGION_PATHS } from "./brazilRegionsPaths";

export type RegionId = "norte" | "nordeste" | "centro-oeste" | "sudeste" | "sul";

interface RegionShape {
  id: RegionId;
  shortLabel: string;
  color: string;
}

const REGION_SHAPES: RegionShape[] = [
  { id: "norte", shortLabel: "Norte", color: "#2D6A4F" },
  { id: "nordeste", shortLabel: "Nordeste", color: "#C4522A" },
  { id: "centro-oeste", shortLabel: "Centro-Oeste", color: "#C9922A" },
  { id: "sudeste", shortLabel: "Sudeste", color: "#1B7A8C" },
  { id: "sul", shortLabel: "Sul", color: "#52A87A" },
];

const BORDER_COLOR = "#3D2B1F";

interface RegionSvgProps {
  selectedId: RegionId | null;
  onSelect: (id: RegionId) => void;
  getRegionName: (id: RegionId) => string;
}

export default function RegionSvg({ selectedId, onSelect, getRegionName }: RegionSvgProps) {
  const [focusedId, setFocusedId] = useState<RegionId | null>(null);

  function handleKeyDown(event: KeyboardEvent<SVGPathElement>, id: RegionId) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(id);
    }
  }

  return (
    <svg
      viewBox={BRAZIL_MAP_VIEWBOX}
      className="h-auto w-full max-w-md mx-auto"
      role="group"
      aria-label="Mapa do Brasil dividido em cinco regiões"
    >
      {REGION_SHAPES.map((shape) => {
        const isSelected = selectedId === shape.id;
        const isDimmed = selectedId !== null && !isSelected;
        const isFocused = focusedId === shape.id;
        const { path, labelX, labelY } = BRAZIL_REGION_PATHS[shape.id];

        return (
          <g key={shape.id}>
            <path
              d={path}
              role="button"
              tabIndex={0}
              aria-label={`Ver origem: ${getRegionName(shape.id)}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(shape.id)}
              onKeyDown={(event) => handleKeyDown(event, shape.id)}
              onFocus={() => setFocusedId(shape.id)}
              onBlur={() => setFocusedId((current) => (current === shape.id ? null : current))}
              fill={shape.color}
              stroke={BORDER_COLOR}
              strokeWidth={isSelected || isFocused ? 3.5 : 2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={isDimmed ? 0.65 : 1}
              className="cursor-pointer outline-none transition-all duration-300 ease-out hover:opacity-90"
              style={{ transformOrigin: "center" }}
            />
            <text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              pointerEvents="none"
              opacity={isDimmed ? 0.65 : 1}
              className="select-none transition-opacity duration-300"
              style={{
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 700,
                fontSize: 12,
                fill: "#FDF9F2",
                letterSpacing: "0.02em",
                paintOrder: "stroke",
                stroke: "#3D2B1F",
                strokeWidth: 2.5,
                strokeLinejoin: "round",
              }}
            >
              {shape.shortLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
