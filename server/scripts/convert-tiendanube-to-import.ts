/**
 * Converte um CSV exportado da Tiendanube/Nuvemshop para o modelo de
 * importação em massa da Nativa Store (Admin → Produtos → Importar).
 *
 * Uso:
 *   pnpm exec tsx --env-file=.env server/scripts/convert-tiendanube-to-import.ts [caminho-csv]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  mapTiendanubeRowToProduct,
  parseTiendanubeCsv,
} from "@shared/lib/parseTiendanubeCsv";
import { buildGalleryUrls } from "@shared/lib/tiendanubeImages";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../..");

const PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='1000' viewBox='0 0 800 1000'%3E%3Crect fill='%23F5F0E8' width='800' height='1000'/%3E%3Ctext x='400' y='500' text-anchor='middle' fill='%23C4522A' font-family='serif' font-size='28'%3ESem imagem%3C/text%3E%3C/svg%3E";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function fetchProductImages(storeUrl: string, slug: string): Promise<string[]> {
  const bases = Array.from(
    new Set([
      storeUrl.replace(/\/+$/, ""),
      "https://www.nativa.art.br",
      "https://quintiluz.lojavirtualnuvem.com.br",
    ]),
  );

  for (const base of bases) {
    const productUrl = `${base}/produtos/${slug}/`;

    try {
      const response = await fetch(productUrl, {
        headers: {
          "User-Agent": "NativaStoreConversion/1.0 (contato@nativa.com.br)",
        },
      });

      if (!response.ok) continue;

      const html = await response.text();
      const gallery = buildGalleryUrls(html);

      if (gallery.length > 0) return gallery;
    } catch {
      continue;
    }
  }

  return [];
}

async function main() {
  const inputArg = process.argv[2];
  const csvPath = inputArg
    ? path.isAbsolute(inputArg)
      ? inputArg
      : path.join(PROJECT_ROOT, inputArg)
    : path.join(
        PROJECT_ROOT,
        "tiendanube-6418246-17839901104670818600367499870.csv",
      );

  if (!fs.existsSync(csvPath)) {
    throw new Error(`Arquivo CSV não encontrado: ${csvPath}`);
  }

  const content = fs.readFileSync(csvPath, "latin1");
  const rows = parseTiendanubeCsv(content).filter((row) => row.slug && row.name);

  if (rows.length === 0) {
    throw new Error("Nenhum produto encontrado no CSV.");
  }

  const storeUrl = process.env.NUVEMSHOP_STORE_URL?.trim() ?? "https://www.nativa.art.br";
  console.log(`Convertendo ${rows.length} produtos de:\n  ${csvPath}\n`);

  const header = [
    "nome",
    "categoria",
    "preco",
    "preco_original",
    "sku",
    "estoque",
    "em_estoque",
    "destaque",
    "badge",
    "imagens",
    "tamanhos",
    "descricao_curta",
    "descricao",
    "materiais",
    "cuidados",
    "destaques",
    "artesao_nome",
    "artesao_regiao",
    "artesao_historia",
    "slug",
  ];

  const lines: string[] = [header.join(",")];
  let withImages = 0;

  for (const row of rows) {
    const images = await fetchProductImages(storeUrl, row.slug);
    const imageUrl = images[0] ?? "";
    const product = mapTiendanubeRowToProduct(row, imageUrl, images.slice(1));

    const gallery = product.images.filter((url) => url && url !== PLACEHOLDER);
    if (gallery.length > 0) {
      withImages += 1;
      console.log(`  ✓ ${product.name}: ${gallery.length} imagem(ns)`);
    } else {
      console.log(`  ✗ ${product.name}: sem imagens (será necessário adicionar depois)`);
    }

    const values = [
      product.name,
      product.category,
      String(product.price),
      product.originalPrice != null ? String(product.originalPrice) : "",
      product.sku,
      String(product.stockCount),
      product.inStock ? "SIM" : "NAO",
      product.featured ? "SIM" : "NAO",
      product.badge,
      gallery.join("|"),
      product.sizes.map((s) => s.label).join("|") || "Único",
      product.shortDescription,
      product.description,
      product.materials.join("|"),
      product.careInstructions.join("|"),
      product.highlights.join("|"),
      product.artisan.name,
      product.artisan.region,
      product.artisan.story,
      product.slug,
    ].map(csvEscape);

    lines.push(values.join(","));
  }

  const outName = path.basename(csvPath, path.extname(csvPath)).replace(/^tiendanube-/, "");
  const outPath = path.join(PROJECT_ROOT, `importacao-nativa-${outName}.csv`);
  fs.writeFileSync(outPath, "\uFEFF" + lines.join("\n"), "utf8");

  console.log(`\nArquivo gerado: ${outPath}`);
  console.log(`Produtos: ${rows.length} | Com imagens: ${withImages} | Sem imagens: ${rows.length - withImages}`);
  console.log(`\nImporte este arquivo em Admin → Produtos → Importar em massa.`);
}

main().catch((error) => {
  console.error("Erro:", error instanceof Error ? error.message : error);
  process.exit(1);
});
