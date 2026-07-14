import { mapRegionInputToRow } from "@shared/lib/regionMapper";
import type { RegionInput } from "@shared/types/region";
import { supabase } from "../lib/supabase";

const PLACEHOLDER_COVER = "/images/bannerNativa.jpg";

const REGIONS: Omit<RegionInput, "productIds">[] = [
  {
    id: "norte",
    name: "Norte — Amazônia",
    title: "Grafismos da floresta",
    story:
      "Na Amazônia, os padrões nascem da grafia indígena e dos rios que cortam a mata. Cada traço remete às cestarias e pinturas corporais dos povos originários, símbolos de conexão entre o homem e a floresta.",
    coverImage: PLACEHOLDER_COVER,
  },
  {
    id: "nordeste",
    name: "Nordeste — Sertão e litoral",
    title: "Flores e olhos místicos",
    story:
      "Do sertão ao litoral, o Nordeste inspira bordados de flores vivas e olhos místicos que remetem à proteção contra o mau-olhado. É a herança das rendeiras e dos festejos populares costurada em cada peça.",
    coverImage: PLACEHOLDER_COVER,
  },
  {
    id: "centro-oeste",
    name: "Centro-Oeste — Cerrado e Pantanal",
    title: "Cores da terra vermelha",
    story:
      "O Cerrado e o Pantanal emprestam sua paleta de terra vermelha e ipês amarelos aos bordados desta região. As estampas homenageiam a fauna e a vastidão das chapadas do coração do Brasil.",
    coverImage: PLACEHOLDER_COVER,
  },
  {
    id: "sudeste",
    name: "Sudeste — Serra e café",
    title: "Bordados das fazendas de café",
    story:
      "Entre serras e cafezais, o Sudeste traz motivos florais delicados herdados das rendas e bordados das antigas fazendas. Um traço mais urbano se mistura à tradição rural das Minas e do interior paulista.",
    coverImage: PLACEHOLDER_COVER,
  },
  {
    id: "sul",
    name: "Sul — Pampas e mata de araucárias",
    title: "Tramas dos pampas",
    story:
      "No Sul, as araucárias e os pampas inspiram tramas geométricas influenciadas pela colonização europeia e pela cultura gaúcha. Os bordados lembram os teares e os tecidos de lã das colônias do interior.",
    coverImage: PLACEHOLDER_COVER,
  },
];

async function pickProductIdsForRegions(regionCount: number): Promise<number[][]> {
  const { data, error } = await supabase
    .from("products")
    .select("id")
    .eq("category", "Bolsas")
    .order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const ids = (data ?? []).map((row) => row.id as number);

  if (ids.length === 0) {
    return Array.from({ length: regionCount }, () => []);
  }

  return Array.from({ length: regionCount }, (_, index) => {
    const id = ids[index % ids.length];
    return [id];
  });
}

async function seedRegions() {
  const productIdsByRegion = await pickProductIdsForRegions(REGIONS.length);

  const rows = REGIONS.map((region, index) =>
    mapRegionInputToRow({ ...region, productIds: productIdsByRegion[index] }),
  );

  const { error } = await supabase.from("regions").upsert(rows, { onConflict: "id" });

  if (error) {
    throw new Error(error.message);
  }

  console.log(`✓ ${rows.length} regiões enviadas para o Supabase`);
}

seedRegions().catch((error) => {
  const message = error instanceof Error ? error.message : "Erro desconhecido";
  console.error("Erro ao popular as regiões:", message);
  process.exit(1);
});
