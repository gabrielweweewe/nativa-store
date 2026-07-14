import { z } from "zod";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const regionSchema = z.object({
  id: z
    .string()
    .min(1, "Informe o identificador da região")
    .regex(SLUG_PATTERN, "Use apenas letras minúsculas, números e hífens (ex: nordeste)"),
  name: z.string().min(2, "Informe o nome da região"),
  title: z.string().min(2, "Informe o título da história"),
  story: z.string().min(10, "Conte um pouco mais sobre a origem cultural"),
  coverImage: z.string().min(1, "Adicione a imagem da região"),
  productIds: z.array(z.number().int().nonnegative()).default([]),
});

export type RegionSchemaInput = z.infer<typeof regionSchema>;

export const regionDefaults: RegionSchemaInput = {
  id: "",
  name: "",
  title: "",
  story: "",
  coverImage: "",
  productIds: [],
};
