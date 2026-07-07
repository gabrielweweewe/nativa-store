import { PRODUCT_IMAGES_BUCKET } from "../services/uploads";
import { supabase } from "../lib/supabase";

async function main() {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    throw new Error(`Não foi possível listar os buckets: ${listError.message}`);
  }

  const exists = buckets?.some((bucket) => bucket.name === PRODUCT_IMAGES_BUCKET);

  if (exists) {
    console.log(`Bucket "${PRODUCT_IMAGES_BUCKET}" já existe. Nada a fazer.`);
    return;
  }

  const { error: createError } = await supabase.storage.createBucket(PRODUCT_IMAGES_BUCKET, {
    public: true,
    fileSizeLimit: "4MB",
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
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
