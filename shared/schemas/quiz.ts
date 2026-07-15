import { z } from "zod";

const imageUrlSchema = z
  .string()
  .min(1, "Informe a URL da imagem")
  .refine(
    (value) => value.startsWith("/") || /^https?:\/\//i.test(value),
    "Use uma URL http(s) ou um path absoluto (ex: /images/foto.jpg)",
  );

export const quizTagWeightSchema = z.object({
  tag: z.string().trim().min(1, "Informe a tag"),
  weight: z.number().positive("O peso deve ser maior que zero"),
});

export const quizOptionSchema = z.object({
  id: z.string().trim().min(1, "Informe o id da opção"),
  label: z.string().trim().min(1, "Informe o rótulo da opção"),
  imageUrl: imageUrlSchema,
  tags: z.array(quizTagWeightSchema).min(1, "Cada opção precisa de ao menos uma tag"),
});

export const quizQuestionSchema = z
  .object({
    id: z.string().trim().min(1, "Informe o id da pergunta"),
    order: z.number().int().min(1, "A ordem deve ser um inteiro ≥ 1"),
    text: z.string().trim().min(1, "Informe o texto da pergunta"),
    options: z.array(quizOptionSchema).min(2, "Cada pergunta precisa de ao menos 2 opções"),
  })
  .superRefine((question, ctx) => {
    const seen = new Set<string>();
    question.options.forEach((option, index) => {
      if (seen.has(option.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Id de opção duplicado: ${option.id}`,
          path: ["options", index, "id"],
        });
      }
      seen.add(option.id);
    });
  });

export const quizResultSchema = z.object({
  id: z.string().trim().min(1, "Informe o id do resultado"),
  name: z.string().trim().min(1, "Informe o nome do perfil"),
  description: z.string().trim().min(1, "Informe a descrição do perfil"),
  tags: z.array(z.string().trim().min(1)).min(1, "Informe ao menos uma tag do perfil"),
  recommendedProductIds: z.array(z.number().int().positive()).default([]),
});

export const quizImportBodySchema = z.object({
  questions: z.array(z.unknown()).default([]),
  results: z.array(z.unknown()).default([]),
});

export const quizResultRequestSchema = z.object({
  selectedOptionIds: z
    .array(z.string().trim().min(1))
    .min(1, "Envie ao menos uma opção selecionada"),
});

export type QuizQuestionInput = z.infer<typeof quizQuestionSchema>;
export type QuizResultInput = z.infer<typeof quizResultSchema>;
