import { z } from "zod";

const optionalUrl = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => {
    if (value == null || value === "") return null;
    return value;
  });

export const bannerSchema = z.object({
  title: z.string().trim().max(120, "Título muito longo").default(""),
  altText: z
    .string()
    .trim()
    .min(1, "Informe um texto alternativo")
    .max(200, "Texto alternativo muito longo"),
  imageUrl: z.string().trim().min(1, "Adicione a imagem do banner"),
  imageUrlMobile: optionalUrl,
  linkUrl: optionalUrl,
  objectPosition: z.string().trim().min(1).max(60).default("center center"),
  objectPositionMobile: z.string().trim().min(1).max(60).default("center 22%"),
  sortOrder: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional().default(true),
});

export const bannerReorderSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1, "Informe a nova ordem"),
});

export type BannerSchemaInput = z.infer<typeof bannerSchema>;
