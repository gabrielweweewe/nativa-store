import { nanoid } from "nanoid";
import sharp from "sharp";
import { supabase } from "../lib/supabase";

export const PRODUCT_IMAGES_BUCKET = "product-images";

/** Qualidade WebP (0–100). Bom equilíbrio tamanho × nitidez para e-commerce. */
const WEBP_QUALITY = 82;

/** Lado maior máximo em px — evita uploads gigantes na loja. */
const MAX_DIMENSION_BY_FOLDER: Record<"products" | "banners", number> = {
  products: 1600,
  banners: 2400,
};

/**
 * Converte qualquer JPG/PNG/WEBP para WebP otimizado.
 * Mantém transparência (PNG → WebP com alpha).
 */
async function toOptimizedWebp(
  buffer: Buffer,
  folder: "products" | "banners",
): Promise<Buffer> {
  const maxSide = MAX_DIMENSION_BY_FOLDER[folder];

  return sharp(buffer, { failOn: "none" })
    .rotate() // respeita EXIF orientation
    .resize({
      width: maxSide,
      height: maxSide,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toBuffer();
}

export async function uploadProductImage(
  file: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
  },
  folder: "products" | "banners" = "products",
): Promise<string> {
  let webpBuffer: Buffer;
  try {
    webpBuffer = await toOptimizedWebp(file.buffer, folder);
  } catch {
    throw new Error("Não foi possível processar a imagem. Tente outro arquivo JPG, PNG ou WEBP.");
  }

  const path = `${folder}/${Date.now()}-${nanoid(8)}.webp`;

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, webpBuffer, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    throw new Error(`Falha ao enviar imagem para o Supabase Storage: ${error.message}`);
  }

  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);

  return data.publicUrl;
}
