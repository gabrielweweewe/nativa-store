import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mapProductToRow } from "@shared/lib/productMapper";
import { mapTiendanubeRowToProduct, parseTiendanubeCsv } from "@shared/lib/parseTiendanubeCsv";
import { buildGalleryUrls } from "@shared/lib/tiendanubeImages";
import { supabase } from "../lib/supabase";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "../..");

const DEFAULT_CSV = path.join(
  PROJECT_ROOT,
  "tiendanube-6418246-17834446675007348008384088291.csv",
);

function resolveCsvPath(): string {
  const fromEnv = process.env.TIENDANUBE_CSV_PATH;
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.join(PROJECT_ROOT, fromEnv);
  }
  return DEFAULT_CSV;
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
          "User-Agent": "NativaStoreMigration/1.0 (contato@nativa.com.br)",
        },
      });

      if (!response.ok) continue;

      const html = await response.text();
      const gallery = buildGalleryUrls(html);

      if (gallery.length > 0) {
        return gallery;
      }
    } catch {
      continue;
    }
  }

  return [];
}

async function migrate() {
  const csvPath = resolveCsvPath();

  if (!fs.existsSync(csvPath)) {
    throw new Error(`Arquivo CSV não encontrado: ${csvPath}`);
  }

  const content = fs.readFileSync(csvPath, "latin1");
  const rows = parseTiendanubeCsv(content);

  if (rows.length === 0) {
    throw new Error("Nenhum produto encontrado no CSV.");
  }

  const storeUrl = process.env.NUVEMSHOP_STORE_URL?.trim() ?? "https://www.nativa.art.br";
  const products = [];

  for (const row of rows) {
    if (!row.slug || !row.name) continue;

    const images = await fetchProductImages(storeUrl, row.slug);
    const imageUrl = images[0] ?? "";

    if (imageUrl) {
      console.log(`  ${row.name}: ${images.length} imagem(ns)`);
    } else {
      console.log(`  ${row.name}: sem imagens`);
    }

    products.push(mapTiendanubeRowToProduct(row, imageUrl, images.slice(1)));
  }

  console.log(`\nEncontrados ${products.length} produtos no CSV`);

  const { error: deleteError } = await supabase.from("products").delete().neq("id", 0);

  if (deleteError) {
    throw new Error(`Erro ao limpar produtos: ${deleteError.message}`);
  }

  console.log("✓ Produtos anteriores removidos");

  const dbRows = products.map((product) => mapProductToRow(product));
  const { error: insertError } = await supabase.from("products").insert(dbRows);

  if (insertError) {
    throw new Error(`Erro ao inserir produtos: ${insertError.message}`);
  }

  const totalImages = products.reduce((sum, p) => sum + p.images.length, 0);
  console.log(`✓ ${products.length} produtos importados`);
  console.log(`✓ ${totalImages} imagens no total (média ${(totalImages / products.length).toFixed(1)} por produto)`);
}

migrate().catch((error) => {
  console.error("Erro na migração:", error instanceof Error ? error.message : error);
  process.exit(1);
});
