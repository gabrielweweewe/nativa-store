import { nanoid } from "nanoid";
import sharp from "sharp";
import { ALLOWED_IMAGE_MIME_TYPES } from "../lib/upload";
import { supabase } from "../lib/supabase";

export const PRODUCT_IMAGES_BUCKET = "product-images";

/** Limite do arquivo no Storage (GIFs animados costumam ser maiores). */
export const MAX_STORAGE_FILE_BYTES = 15 * 1024 * 1024;

/** Qualidade WebP (0–100). Bom equilíbrio tamanho × nitidez para e-commerce. */
const WEBP_QUALITY = 82;

/** Lado maior máximo em px — evita uploads gigantes na loja. */
const MAX_DIMENSION_BY_FOLDER: Record<"products" | "banners", number> = {
  products: 1600,
  banners: 2400,
};

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

/**
 * Converte JPG/PNG/WEBP para WebP otimizado.
 * Mantém transparência (PNG → WebP com alpha).
 * GIFs animados não passam por aqui — a animação seria perdida.
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

function isGif(mimetype: string): boolean {
  return mimetype === "image/gif";
}

export async function uploadProductImage(
  file: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
  },
  folder: "products" | "banners" = "products",
): Promise<string> {
  // GIF: envia o arquivo original para preservar animação (sharp → WebP perde frames).
  if (isGif(file.mimetype)) {
    const path = `${folder}/${Date.now()}-${nanoid(8)}.gif`;

    const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, file.buffer, {
      contentType: "image/gif",
      cacheControl: "31536000",
      upsert: false,
    });

    if (error) {
      throw new Error(`Falha ao enviar imagem para o Supabase Storage: ${error.message}`);
    }

    const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  let webpBuffer: Buffer;
  try {
    webpBuffer = await toOptimizedWebp(file.buffer, folder);
  } catch {
    throw new Error(
      "Não foi possível processar a imagem. Tente outro arquivo JPG, PNG, WEBP ou GIF.",
    );
  }

  const path = `${folder}/${Date.now()}-${nanoid(8)}.webp`;

  const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).upload(path, webpBuffer, {
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

/**
 * Gera URL assinada para o browser enviar o arquivo direto ao Supabase,
 * contornando o limite de payload da function na Vercel (~4,5MB).
 */
export async function createSignedImageUpload(input: {
  folder: "products" | "banners";
  contentType: string;
}): Promise<{ path: string; token: string; signedUrl: string; publicUrl: string }> {
  const contentType = input.contentType.toLowerCase().trim();

  if (!ALLOWED_IMAGE_MIME_TYPES.has(contentType)) {
    throw new Error("Formato de imagem não suportado. Use JPG, PNG, WEBP ou GIF.");
  }

  const ext = EXT_BY_MIME[contentType] ?? "bin";
  const path = `${input.folder}/${Date.now()}-${nanoid(8)}.${ext}`;

  const { data, error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .createSignedUploadUrl(path);

  if (error || !data) {
    throw new Error(
      `Não foi possível preparar o upload: ${error?.message ?? "resposta vazia do Storage"}`,
    );
  }

  const { data: publicData } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(data.path);

  return {
    path: data.path,
    token: data.token,
    signedUrl: data.signedUrl,
    publicUrl: publicData.publicUrl,
  };
}
