import { buildGalleryUrls } from "@shared/lib/tiendanubeImages";

const DEFAULT_STORE_URLS = [
  "https://www.nativa.art.br",
  "https://quintiluz.lojavirtualnuvem.com.br",
];

function resolveStoreBases(): string[] {
  const fromEnv = process.env.NUVEMSHOP_STORE_URL?.trim().replace(/\/+$/, "");
  return Array.from(new Set([fromEnv, ...DEFAULT_STORE_URLS].filter(Boolean) as string[]));
}

export async function fetchTiendanubeProductImages(slug: string): Promise<string[]> {
  const bases = resolveStoreBases();

  for (const base of bases) {
    const productUrl = `${base}/produtos/${slug}/`;

    try {
      const response = await fetch(productUrl, {
        headers: {
          "User-Agent": "NativaStoreImport/1.0 (contato@nativa.com.br)",
        },
      });

      if (!response.ok) continue;

      const gallery = buildGalleryUrls(await response.text());
      if (gallery.length > 0) return gallery;
    } catch {
      continue;
    }
  }

  return [];
}

export async function fetchTiendanubeImagesBySlugs(
  slugs: string[],
): Promise<Record<string, string[]>> {
  const unique = Array.from(new Set(slugs.map((s) => s.trim()).filter(Boolean)));
  const entries = await Promise.all(
    unique.map(async (slug) => [slug, await fetchTiendanubeProductImages(slug)] as const),
  );
  return Object.fromEntries(entries);
}
