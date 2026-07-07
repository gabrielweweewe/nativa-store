import multer from "multer";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB (limite seguro para função serverless do Vercel)

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(new Error("Formato de imagem não suportado. Use JPG, PNG ou WEBP."));
      return;
    }
    callback(null, true);
  },
});
