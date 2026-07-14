import { z } from "zod";

const nullablePositiveInteger = z.number().int().positive().nullable();
const recipientSchema = z.object({
  email: z.email().max(320),
  name: z.string().trim().min(1).max(150).optional(),
});

export const brevoSettingsSchema = z.object({
  enabled: z.boolean(),
  apiKey: z.string().trim().max(500).optional(),
  webhookToken: z.string().trim().min(32).max(500).optional(),
  defaultSenderId: nullablePositiveInteger.optional(),
  defaultSenderEmail: z.union([z.literal(""), z.email().max(320)]).optional(),
  defaultSenderName: z.string().trim().max(150).optional(),
  replyTo: z.union([z.literal(""), z.email().max(320)]).optional(),
  merchantNotifyEmail: z.union([z.literal(""), z.email().max(320)]).optional(),
  defaultListId: nullablePositiveInteger.optional(),
  templateOrderReceived: nullablePositiveInteger.optional(),
  templateOrderReceivedMerchant: nullablePositiveInteger.optional(),
  templatePaymentApproved: nullablePositiveInteger.optional(),
  templatePaymentFailed: nullablePositiveInteger.optional(),
  templatePaymentRefunded: nullablePositiveInteger.optional(),
  templateOrderProcessing: nullablePositiveInteger.optional(),
  templateOrderShipped: nullablePositiveInteger.optional(),
  templateOrderDelivered: nullablePositiveInteger.optional(),
});

export const brevoTemplateTestSchema = z.object({
  event: z.enum([
    "order_received",
    "order_received_merchant",
    "payment_approved",
  ]),
  email: z.email().max(320),
});

export const brevoStoreTemplateUpdateSchema = z.object({
  event: z.enum([
    "order_received",
    "order_received_merchant",
    "payment_approved",
  ]),
  name: z.string().trim().min(1).max(150).optional(),
  subject: z.string().trim().min(1).max(998),
  htmlContent: z.string().trim().min(1).max(1_000_000),
  enabled: z.boolean().optional(),
});

export const brevoContactSchema = z.object({
  email: z.email().max(320),
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  attributes: z
    .record(
      z.string(),
      z.union([z.string(), z.number(), z.boolean(), z.null()])
    )
    .optional(),
  listIds: z.array(z.number().int().positive()).max(100).optional(),
  unlinkListIds: z.array(z.number().int().positive()).max(100).optional(),
  updateEnabled: z.boolean().optional(),
});

export const brevoTransactionalEmailSchema = z
  .object({
    to: z.array(recipientSchema).min(1).max(50),
    sender: recipientSchema.optional(),
    replyTo: recipientSchema.optional(),
    subject: z.string().trim().min(1).max(998).optional(),
    htmlContent: z.string().min(1).max(1_000_000).optional(),
    textContent: z.string().min(1).max(1_000_000).optional(),
    templateId: z.number().int().positive().optional(),
    params: z.record(z.string(), z.unknown()).optional(),
    tags: z.array(z.string().trim().min(1).max(128)).max(10).optional(),
    sandbox: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    const contentCount = [
      value.htmlContent,
      value.textContent,
      value.templateId,
    ].filter(item => item !== undefined).length;
    if (contentCount !== 1) {
      ctx.addIssue({
        code: "custom",
        message:
          "Informe exatamente um conteúdo: htmlContent, textContent ou templateId",
      });
    }
    if (!value.templateId && !value.subject) {
      ctx.addIssue({
        code: "custom",
        path: ["subject"],
        message: "O assunto é obrigatório quando não há template",
      });
    }
  });

export const brevoCampaignSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    subject: z.string().trim().min(1).max(998),
    sender: recipientSchema.optional(),
    recipients: z
      .object({
        listIds: z.array(z.number().int().positive()).min(1).max(100),
        exclusionListIds: z
          .array(z.number().int().positive())
          .max(100)
          .optional(),
      })
      .optional(),
    senderId: z.number().int().positive().optional(),
    listIds: z.array(z.number().int().positive()).min(1).max(100).optional(),
    htmlContent: z.string().min(1).max(1_000_000).optional(),
    templateId: z.number().int().positive().optional(),
    replyTo: z.email().max(320).optional(),
    tag: z.string().trim().min(1).max(128).optional(),
  })
  .superRefine((value, ctx) => {
    if (Boolean(value.htmlContent) === Boolean(value.templateId)) {
      ctx.addIssue({
        code: "custom",
        message: "Informe htmlContent ou templateId, mas não ambos",
      });
    }
    if (!(value.recipients?.listIds.length || value.listIds?.length)) {
      ctx.addIssue({
        code: "custom",
        path: ["listIds"],
        message: "Informe pelo menos uma lista",
      });
    }
  });

export const brevoCampaignScheduleSchema = z.object({
  scheduledAt: z.iso
    .datetime({ offset: true })
    .refine(
      value => Date.parse(value) > Date.now(),
      "O agendamento deve estar no futuro"
    ),
});

export const brevoCampaignTestSchema = z.object({
  emails: z.array(z.email().max(320)).min(1).max(50),
});

export const brevoNewsletterSchema = z.object({
  email: z.email().max(320),
  consent: z.literal(true),
  name: z.string().trim().min(1).max(150).optional(),
  source: z.string().trim().min(1).max(100).optional(),
  website: z.string().max(200).optional(),
});

export const brevoListCreateSchema = z.object({
  name: z.string().trim().min(1).max(150),
  folderId: z.number().int().positive().optional(),
});

export const brevoQuickTestSchema = z.object({
  email: z.email().max(320),
  subject: z.string().trim().min(1).max(998),
  htmlContent: z.string().min(1).max(1_000_000),
  senderId: z.number().int().positive(),
});

export type BrevoSettingsSchemaInput = z.infer<typeof brevoSettingsSchema>;
