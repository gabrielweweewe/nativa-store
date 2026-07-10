import { nanoid } from "nanoid";
import { supabase } from "../lib/supabase";

export const PRODUCT_IMAGES_BUCKET = "product-images";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function uploadProductImage(
  file: {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
  },
  folder: "products" | "banners" = "products",
): Promise<string> {
  const extension = EXTENSION_BY_MIME[file.mimetype] ?? "jpg";
  const path = `${folder}/${Date.now()}-${nanoid(8)}.${extension}`;

  const { error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(path, file.buffer, {
      contentType: file.mimetype,
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) {
    throw new Error(`Falha ao enviar imagem para o Supabase Storage: ${error.message}`);
  }

  const { data } = supabase.storage.from(PRODUCT_IMAGES_BUCKET).getPublicUrl(path);

  return data.publicUrl;
}
