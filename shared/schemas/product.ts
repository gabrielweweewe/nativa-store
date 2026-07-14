import { z } from "zod";

export const productCategorySchema = z.enum(["Roupas", "Bolsas", "Acessórios"]);

export const productColorSchema = z.object({
  name: z.string().min(1, "Informe o nome da cor"),
  hex: z
    .string()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Cor inválida (use o formato #RRGGBB)"),
});

export const productSizeSchema = z.object({
  label: z.string().min(1, "Informe o tamanho"),
  available: z.boolean(),
});

export const productFaqSchema = z.object({
  question: z.string().min(1, "Informe a pergunta"),
  answer: z.string().min(1, "Informe a resposta"),
});

export const productArtisanSchema = z.object({
  name: z.string(),
  region: z.string(),
  story: z.string(),
});

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const productSchema = z.object({
  slug: z
    .string()
    .min(1, "Slug é obrigatório")
    .regex(SLUG_PATTERN, "Use apenas letras minúsculas, números e hífens (ex: bolsa-de-praia)"),
  name: z.string().min(2, "Informe o nome do produto"),
  category: productCategorySchema,
  price: z.number({ error: "Informe um preço válido" }).nonnegative("O preço não pode ser negativo"),
  originalPrice: z.number().nonnegative("O preço original não pode ser negativo").nullable(),
  image: z.string().min(1, "Adicione ao menos uma imagem"),
  images: z.array(z.string().min(1)).min(1, "Adicione ao menos uma imagem"),
  badge: z.string(),
  badgeColor: z.string().min(1),
  rating: z.number().min(0).max(5),
  reviews: z.number().int().min(0),
  featured: z.boolean(),
  shortDescription: z.string(),
  description: z.string(),
  materials: z.array(z.string()),
  careInstructions: z.array(z.string()),
  artisan: productArtisanSchema,
  sizes: z.array(productSizeSchema),
  colors: z.array(productColorSchema),
  sku: z.string(),
  inStock: z.boolean(),
  stockCount: z.number().int().min(0),
  widthCm: z.number().positive().max(200).nullable(),
  heightCm: z.number().positive().max(200).nullable(),
  lengthCm: z.number().positive().max(200).nullable(),
  weightKg: z.number().positive().max(100).nullable(),
  faq: z.array(productFaqSchema),
  highlights: z.array(z.string()),
  regionId: z
    .string()
    .trim()
    .min(1)
    .nullable()
    .transform((value) => (value == null || value === "" ? null : value)),
});

export type ProductInput = z.infer<typeof productSchema>;

export const productDefaults: ProductInput = {
  slug: "",
  name: "",
  category: "Bolsas",
  price: 0,
  originalPrice: null,
  image: "",
  images: [],
  badge: "",
  badgeColor: "#C4522A",
  rating: 0,
  reviews: 0,
  featured: false,
  shortDescription: "",
  description: "",
  materials: [],
  careInstructions: [],
  artisan: { name: "", region: "", story: "" },
  sizes: [{ label: "Único", available: true }],
  colors: [],
  sku: "",
  inStock: true,
  stockCount: 0,
  widthCm: null,
  heightCm: null,
  lengthCm: null,
  weightKg: null,
  faq: [],
  highlights: [],
  regionId: null,
};
