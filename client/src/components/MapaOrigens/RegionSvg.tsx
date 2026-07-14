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
    path: "M60 75 C50 45, 90 20, 130 22 C170 15, 210 20, 235 45 C250 65, 240 90, 210 95 C175 100, 130 98, 95 95 C70 92, 55 90, 60 75 Z",
    labelX: 150,
    labelY: 60,
  },
  {
    id: "nordeste",
    shortLabel: "Nordeste",
    color: "#C4522A",
    path: "M280 130 C300 122, 318 140, 315 165 C312 190, 298 208, 278 210 C262 212, 250 195, 252 172 C254 150, 262 136, 280 130 Z",
    labelX: 286,
    labelY: 168,
  },
  {
    id: "centro-oeste",
    shortLabel: "Centro-Oeste",
    color: "#C9922A",
    path: "M110 160 C100 140, 130 122, 160 128 C195 132, 215 150, 218 178 C220 205, 200 225, 172 228 C145 231, 115 218, 105 195 C98 180, 100 168, 110 160 Z",
    labelX: 158,
    labelY: 178,
  },
  {
    id: "sudeste",
    shortLabel: "Sudeste",
    color: "#1B7A8C",
    path: "M228 270 C222 255, 252 248, 275 255 C298 262, 308 280, 301 300 C294 320, 268 330, 246 325 C226 320, 213 305, 216 285 C217 278, 220 272, 228 270 Z",
    labelX: 259,
    labelY: 291,
  },
  {
    id: "sul",
    shortLabel: "Sul",
    color: "#52A87A",
    path: "M100 295 C95 280, 125 272, 150 278 C172 283, 182 300, 175 320 C168 338, 145 348, 122 343 C102 338, 88 322, 92 302 C93 298, 96 297, 100 295 Z",
    labelX: 132,
    labelY: 311,
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
      viewBox="0 0 320 360"
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
              opacity={isDimmed ? 0.65 : 1}
              className="cursor-pointer outline-none transition-all duration-300 ease-out hover:opacity-90"
              style={{ transformOrigin: "center" }}
            />
            <text
              x={shape.labelX}
              y={shape.labelY}
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
