import { PRODUCT_IMAGES_BUCKET } from "../services/uploads";
import { supabase } from "../lib/supabase";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

async function main() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    throw new Error(`Não foi possível listar os buckets: ${listError.message}`);
  }

  const exists = buckets?.some((bucket) => bucket.name === PRODUCT_IMAGES_BUCKET);

  if (exists) {
    const { error: updateError } = await supabase.storage.updateBucket(PRODUCT_IMAGES_BUCKET, {
      public: true,
      fileSizeLimit: "4MB",
      allowedMimeTypes: ALLOWED_MIME_TYPES,
    });

    if (updateError) {
      throw new Error(`Não foi possível atualizar o bucket: ${updateError.message}`);
    }

    console.log(
      `Bucket "${PRODUCT_IMAGES_BUCKET}" atualizado (JPG, PNG, WEBP, GIF — leitura pública).`,
    );
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(PRODUCT_IMAGES_BUCKET, {
    public: true,
    fileSizeLimit: "4MB",
    allowedMimeTypes: ALLOWED_MIME_TYPES,
  });

  if (createError) {
    throw new Error(`Não foi possível criar o bucket: ${createError.message}`);
  }

  console.log(`Bucket "${PRODUCT_IMAGES_BUCKET}" criado com sucesso (leitura pública).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
