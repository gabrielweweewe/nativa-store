export interface TiendanubeGalleryImage {
  id: number;
  image: string;
  alt?: string;
  position?: number;
}

function parseJsonArray(source: string, startIndex: number): unknown[] | null {
  if (source[startIndex] !== "[") return null;

  let depth = 0;
  for (let i = startIndex; i < source.length; i += 1) {
    const char = source[i];
    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        try {
          const parsed = JSON.parse(source.slice(startIndex, i + 1));
          return Array.isArray(parsed) ? parsed : null;
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

export function extractProductGalleryFromHtml(html: string): TiendanubeGalleryImage[] {
  const marker = /"images"\s*:\s*\[/g;
  let match: RegExpExecArray | null;

  while ((match = marker.exec(html)) !== null) {
    const arrayStart = match.index + match[0].length - 1;
    const parsed = parseJsonArray(html, arrayStart);
    if (!parsed) continue;

    const endIndex = html.indexOf("]", arrayStart) + 1;
    const after = html.slice(endIndex, endIndex + 40);
    if (!after.includes('"images_count"')) continue;

    return parsed
      .filter(
        (item): item is TiendanubeGalleryImage =>
          typeof item === "object" &&
          item !== null &&
          "image" in item &&
          typeof (item as TiendanubeGalleryImage).image === "string",
      )
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  return [];
}

export function buildTiendanubeImageUrl(storePath: string, imageFile: string, size = 480): string {
  // Versões redimensionadas em WebP perdem a animação — usa o GIF original.
  if (/\.gif$/i.test(imageFile)) {
    return `https://dcdn-us.mitiendanube.com/stores/${storePath}/products/${imageFile}`;
  }

  const fileBase = imageFile.replace(/\.(png|jpe?g|webp)$/i, "");
  return `https://dcdn-us.mitiendanube.com/stores/${storePath}/products/${fileBase}-${size}-0.webp`;
}

export function extractStorePathFromHtml(html: string): string | null {
  const match = html.match(/https:\/\/dcdn-us\.mitiendanube\.com\/stores\/(\d+\/\d+\/\d+)\//);
  return match?.[1] ?? null;
}

export function buildGalleryUrls(html: string): string[] {
  const storePath = extractStorePathFromHtml(html);
  if (!storePath) return [];

  const gallery = extractProductGalleryFromHtml(html);
  return gallery.map((item) => buildTiendanubeImageUrl(storePath, item.image));
}
