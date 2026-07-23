import { z } from "zod";

export const metaCatalogSettingsSchema = z.object({
  enabled: z.boolean(),
  feedToken: z
    .string()
    .trim()
    .max(120)
    .nullable()
    .optional()
    .transform(value => (value === "" ? null : value)),
  regenerateFeedToken: z.boolean().optional(),
  defaultBrand: z.string().trim().min(1).max(80),
  googleProductCategory: z.string().trim().max(200),
});

export type MetaCatalogSettingsSchemaInput = z.infer<
  typeof metaCatalogSettingsSchema
>;
