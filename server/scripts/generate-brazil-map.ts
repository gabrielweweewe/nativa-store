/**
 * Gera os paths SVG estáticos do Mapa Vivo das Origens a partir da malha
 * territorial real das 5 macrorregiões do IBGE (API pública, sem chave).
 *
 * Roda uma única vez em tempo de build/dev — o resultado é salvo em
 * client/src/components/MapaOrigens/brazilRegionsPaths.ts e é isso que
 * o app carrega em runtime (sem nenhuma lib de mapas no bundle do cliente).
 *
 * Uso: pnpm generate:brazil-map
 */
import { writeFileSync } from "node:fs";
import path from "node:path";

const IBGE_REGION_CODES: Record<string, number> = {
  norte: 1,
  nordeste: 2,
  sudeste: 3,
  sul: 4,
  "centro-oeste": 5,
};

type LonLat = [number, number];

interface GeoJsonGeometry {
  type: "Polygon" | "MultiPolygon";
  coordinates: LonLat[][] | LonLat[][][];
}

interface GeoJsonResponse {
  features: { geometry: GeoJsonGeometry }[];
}

/** Extrai só o anel principal (o "continente" da região, sem ilhas/buracos). */
function extractMainRing(geometry: GeoJsonGeometry): LonLat[] {
  if (geometry.type === "Polygon") {
    return (geometry.coordinates as LonLat[][])[0];
  }

  const polygons = geometry.coordinates as LonLat[][][];
  return polygons.reduce((largest, polygon) => {
    const ring = polygon[0];
    return ring.length > largest.length ? ring : largest;
  }, polygons[0][0]);
}

async function fetchRegionRing(code: number): Promise<LonLat[]> {
  const url = `https://servicodados.ibge.gov.br/api/v3/malhas/regioes/${code}?formato=application/vnd.geo+json&qualidade=minima`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Falha ao buscar malha do IBGE (região ${code}): ${response.status}`);
  }

  const data = (await response.json()) as GeoJsonResponse;
  return extractMainRing(data.features[0].geometry);
}

/** Centroide real do polígono (fórmula da área com sinal), mais robusto que o centro do bounding box em formas côncavas. */
function polygonCentroid(ring: LonLat[]): LonLat {
  let area = 0;
  let cx = 0;
  let cy = 0;

  for (let i = 0; i < ring.length - 1; i++) {
    const [x0, y0] = ring[i];
    const [x1, y1] = ring[i + 1];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }

  area /= 2;
  if (area === 0) {
    const avg = ring.reduce((acc, [x, y]) => [acc[0] + x, acc[1] + y], [0, 0]);
    return [avg[0] / ring.length, avg[1] / ring.length];
  }

  return [cx / (6 * area), cy / (6 * area)];
}

async function main() {
  const regionIds = Object.keys(IBGE_REGION_CODES);
  const rings = new Map<string, LonLat[]>();

  for (const id of regionIds) {
    console.log(`Buscando malha do IBGE: ${id}...`);
    rings.set(id, await fetchRegionRing(IBGE_REGION_CODES[id]));
  }

  const allPoints = Array.from(rings.values()).flat();
  const lons = allPoints.map(([lon]) => lon);
  const lats = allPoints.map(([, lat]) => lat);
  const meanLat = (Math.min(...lats) + Math.max(...lats)) / 2;
  const cosMeanLat = Math.cos((meanLat * Math.PI) / 180);

  // Projeção equirretangular com correção de latitude (aproximação simples,
  // suficiente para um mapa ilustrativo — sem dependência de d3-geo em runtime).
  function project([lon, lat]: LonLat): [number, number] {
    return [lon * cosMeanLat, -lat];
  }

  const projected = new Map(regionIds.map((id) => [id, rings.get(id)!.map(project)]));
  const allProjected = Array.from(projected.values()).flat();
  const xs = allProjected.map(([x]) => x);
  const ys = allProjected.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const PADDING = 10;
  const TARGET_WIDTH = 380;
  const scale = TARGET_WIDTH / (maxX - minX);
  const width = Math.round((maxX - minX) * scale + PADDING * 2);
  const height = Math.round((maxY - minY) * scale + PADDING * 2);

  function toSvg([x, y]: [number, number]): [number, number] {
    return [(x - minX) * scale + PADDING, (y - minY) * scale + PADDING];
  }

  const regions = regionIds.map((id) => {
    const svgPoints = projected.get(id)!.map(toSvg);
    const d =
      svgPoints
        .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
        .join(" ") + " Z";

    const centroidLonLat = polygonCentroid(rings.get(id)!);
    const [labelX, labelY] = toSvg(project(centroidLonLat));

    return { id, path: d, labelX: Number(labelX.toFixed(1)), labelY: Number(labelY.toFixed(1)) };
  });

  const output = `/**
 * Paths SVG das 5 macrorregiões do Brasil, gerados a partir da malha
 * territorial oficial do IBGE (servicodados.ibge.gov.br), projeção
 * equirretangular simplificada. Gerado por server/scripts/generate-brazil-map.ts
 * — não edite manualmente, rode "pnpm generate:brazil-map" para atualizar.
 */

export const BRAZIL_MAP_VIEWBOX = "0 0 ${width} ${height}";

export const BRAZIL_REGION_PATHS: Record<string, { path: string; labelX: number; labelY: number }> = {
${regions
  .map(
    (r) =>
      `  "${r.id}": { path: "${r.path}", labelX: ${r.labelX}, labelY: ${r.labelY} },`,
  )
  .join("\n")}
};
`;

  const outPath = path.resolve(
    import.meta.dirname,
    "../../client/src/components/MapaOrigens/brazilRegionsPaths.ts",
  );
  writeFileSync(outPath, output, "utf-8");
  console.log(`✓ Paths gerados em ${outPath}`);
}

main().catch((error) => {
  console.error("Erro ao gerar o mapa do Brasil:", error);
  process.exit(1);
});
