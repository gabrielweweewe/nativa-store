import { z } from "zod";

const optionalNullableNumber = z
  .union([z.number(), z.null(), z.literal("")])
  .optional()
  .transform((value) => {
    if (value == null || value === "") return null;
    return value;
  });

const optionalNullableDatetime = z
  .union([z.string(), z.null(), z.literal("")])
  .optional()
  .transform((value) => {
    if (value == null || value === "") return null;
    return value;
  });

export const couponSchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, "Informe o código do cupom")
      .max(50, "Código muito longo")
      .regex(/^[A-Za-z0-9_-]+$/, "Use apenas letras, números, _ ou -"),
    type: z.enum(["percentage", "fixed", "free_shipping"]),
    value: z.number().finite("Informe um valor válido"),
    isActive: z.boolean().optional().default(true),
    startsAt: optionalNullableDatetime,
    endsAt: optionalNullableDatetime,
    minSubtotal: optionalNullableNumber,
    maxUses: optionalNullableNumber,
    maxUsesPerCustomer: optionalNullableNumber,
    isMapReward: z.boolean().optional().default(false),
    description: z
      .union([z.string(), z.null()])
      .optional()
      .transform((value) => {
        if (value == null) return null;
        const trimmed = value.trim();
        return trimmed === "" ? null : trimmed.slice(0, 200);
      }),
  })
  .superRefine((data, ctx) => {
    if (data.type === "percentage") {
      if (data.value <= 0 || data.value > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["value"],
          message: "Percentual deve ser entre 0,01 e 100",
        });
      }
    } else if (data.type === "fixed") {
      if (data.value < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["value"],
          message: "Valor fixo não pode ser negativo",
        });
      }
    } else if (data.type === "free_shipping" && data.value < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["value"],
        message: "Valor inválido para frete grátis",
      });
    }

    if (data.minSubtotal != null && data.minSubtotal < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minSubtotal"],
        message: "Subtotal mínimo não pode ser negativo",
      });
    }

    if (data.maxUses != null && (!Number.isInteger(data.maxUses) || data.maxUses <= 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxUses"],
        message: "Limite total deve ser um inteiro positivo",
      });
    }

    if (
      data.maxUsesPerCustomer != null &&
      (!Number.isInteger(data.maxUsesPerCustomer) || data.maxUsesPerCustomer <= 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxUsesPerCustomer"],
        message: "Limite por cliente deve ser um inteiro positivo",
      });
    }

    if (data.startsAt && data.endsAt && new Date(data.startsAt) > new Date(data.endsAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endsAt"],
        message: "Data final deve ser após a data inicial",
      });
    }
  });

export type CouponSchemaInput = z.infer<typeof couponSchema>;
