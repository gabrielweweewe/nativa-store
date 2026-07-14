/**
 * Nativa Store — Mapa Vivo das Origens
 * Mapa ilustrativo do Brasil em 5 blobs orgânicos (não geograficamente exato),
 * um por região, clicáveis e navegáveis por teclado.
 */

import { useState, type KeyboardEvent } from "react";

export type RegionId = "norte" | "nordeste" | "centro-oeste" | "sudeste" | "sul";

interface RegionShape {
  id: RegionId;
  shortLabel: string;
  color: string;
  path: string;
  labelX: number;
  labelY: number;
}

const REGION_SHAPES: RegionShape[] = [
  {
    id: "norte",
    shortLabel: "Norte",
    color: "#2D6A4F",
    path: "M40 70 C30 40, 70 15, 110 20 C150 10, 190 5, 225 25 C260 40, 255 75, 230 95 C200 115, 160 110, 120 105 C85 100, 50 100, 40 70 Z",
    labelX: 132,
    labelY: 62,
  },
  {
    id: "nordeste",
    shortLabel: "Nordeste",
    color: "#C4522A",
    path: "M235 95 C245 75, 275 70, 295 90 C310 105, 305 130, 290 150 C275 168, 250 175, 230 160 C215 148, 210 120, 220 105 C225 98, 230 96, 235 95 Z",
    labelX: 258,
    labelY: 122,
  },
  {
    id: "centro-oeste",
    shortLabel: "Centro-Oeste",
    color: "#C9922A",
    path: "M110 130 C100 115, 130 100, 160 105 C190 108, 210 120, 215 145 C220 168, 205 190, 180 195 C155 200, 125 190, 112 168 C102 150, 105 138, 110 130 Z",
    labelX: 160,
    labelY: 152,
  },
  {
    id: "sudeste",
    shortLabel: "Sudeste",
    color: "#1B7A8C",
    path: "M175 205 C170 195, 195 188, 215 195 C235 200, 245 215, 240 232 C235 248, 215 255, 198 250 C182 245, 170 232, 170 218 C170 213, 172 208, 175 205 Z",
    labelX: 205,
    labelY: 224,
  },
  {
    id: "sul",
    shortLabel: "Sul",
    color: "#52A87A",
    path: "M140 255 C135 248, 155 242, 172 248 C188 253, 195 268, 188 285 C182 300, 165 310, 150 305 C137 300, 128 288, 128 272 C128 265, 132 258, 140 255 Z",
    labelX: 160,
    labelY: 278,
  },
];

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
      viewBox="0 0 320 320"
      className="h-auto w-full max-w-md mx-auto"
      role="group"
      aria-label="Mapa do Brasil dividido em cinco regiões"
    >
      {REGION_SHAPES.map((shape) => {
        const isSelected = selectedId === shape.id;
        const isDimmed = selectedId !== null && !isSelected;
        const isFocused = focusedId === shape.id;

        return (
          <g key={shape.id}>
            <path
              d={shape.path}
              role="button"
              tabIndex={0}
              aria-label={`Ver origem: ${getRegionName(shape.id)}`}
              aria-pressed={isSelected}
              onClick={() => onSelect(shape.id)}
              onKeyDown={(event) => handleKeyDown(event, shape.id)}
              onFocus={() => setFocusedId(shape.id)}
              onBlur={() => setFocusedId((current) => (current === shape.id ? null : current))}
              fill={shape.color}
              stroke={isSelected || isFocused ? "#3D2B1F" : "#F5F0E8"}
              strokeWidth={isSelected || isFocused ? 3 : 2}
              opacity={isDimmed ? 0.35 : 1}
              className="cursor-pointer outline-none transition-all duration-300 ease-out hover:opacity-90"
              style={{ transformOrigin: "center" }}
            />
            <text
              x={shape.labelX}
              y={shape.labelY}
              textAnchor="middle"
              pointerEvents="none"
              opacity={isDimmed ? 0.45 : 1}
              className="select-none transition-opacity duration-300"
              style={{
                fontFamily: "'Nunito', sans-serif",
                fontWeight: 700,
                fontSize: 12,
                fill: "#FDF9F2",
                letterSpacing: "0.02em",
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
