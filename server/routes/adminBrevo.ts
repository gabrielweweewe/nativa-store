import {
  brevoCampaignScheduleSchema,
  brevoCampaignSchema,
  brevoCampaignTestSchema,
  brevoContactSchema,
  brevoListCreateSchema,
  brevoQuickTestSchema,
  brevoSettingsSchema,
  brevoStoreTemplateUpdateSchema,
  brevoTemplateTestSchema,
  brevoTransactionalEmailSchema,
} from "@shared/schemas/brevo";
import { Router, type Response } from "express";
import { z } from "zod";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  BrevoApiError,
  configureBrevoWebhooks,
  createBrevoCampaign,
  createBrevoList,
  deleteBrevoList,
  deleteBrevoContact,
  getBrevoAdminStatus,
  getBrevoCampaign,
  getBrevoCampaignMetrics,
  listBrevoCampaigns,
  listBrevoContacts,
  listBrevoLists,
  listBrevoSenders,
  listBrevoTemplates,
  scheduleBrevoCampaign,
  sendBrevoCampaignNow,
  sendBrevoCampaignTest,
  sendBrevoQuickTest,
  sendBrevoTransactionalEmail,
  testBrevoCredentials,
  updateBrevoCampaign,
  updateBrevoSettings,
  upsertBrevoContact,
} from "../services/brevo";
import { sendOrderTemplateTest } from "../services/orderEmails";
import {
  listStoreEmailTemplates,
  updateStoreEmailTemplate,
} from "../services/storeEmailTemplates";

const router = Router();
const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
const contactsQuerySchema = paginationSchema.extend({
  search: z.string().trim().max(320).optional(),
  listId: z.coerce.number().int().positive().optional(),
});
const idSchema = z.coerce.number().int().positive();

router.use(requireAdmin);

function failure(res: Response, error: unknown, fallback: string) {
  const status =
    error instanceof BrevoApiError && error.status < 500 ? error.status : 500;
  res.status(status).json({
    error: error instanceof Error ? error.message : fallback,
  });
}

function invalid(res: Response, issues: unknown) {
  res.status(400).json({ error: "Dados inválidos", issues });
}

router.get("/status", async (_req, res) => {
  try {
    res.json(await getBrevoAdminStatus());
  } catch (error) {
    failure(res, error, "Erro ao carregar Brevo");
  }
});

router.put("/settings", async (req, res) => {
  const parsed = brevoSettingsSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    res.json(await updateBrevoSettings(parsed.data));
  } catch (error) {
    failure(res, error, "Erro ao salvar Brevo");
  }
});

router.post("/test", async (_req, res) => {
  try {
    res.json(await testBrevoCredentials());
  } catch (error) {
    failure(res, error, "Credenciais Brevo inválidas");
  }
});

router.post("/webhook/configure", async (_req, res) => {
  try {
    res.json(await configureBrevoWebhooks());
  } catch (error) {
    failure(res, error, "Erro ao configurar webhook");
  }
});

router.get("/templates", async (req, res) => {
  const parsed = paginationSchema.safeParse(req.query);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    res.json(await listBrevoTemplates(parsed.data.limit, parsed.data.offset));
  } catch (error) {
    failure(res, error, "Erro ao listar templates");
  }
});

router.get("/senders", async (_req, res) => {
  try {
    res.json(await listBrevoSenders());
  } catch (error) {
    failure(res, error, "Erro ao listar remetentes");
  }
});

router.get("/lists", async (req, res) => {
  const parsed = paginationSchema.safeParse(req.query);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    res.json(await listBrevoLists(parsed.data.limit, parsed.data.offset));
  } catch (error) {
    failure(res, error, "Erro ao listar listas");
  }
});

router.post("/lists", async (req, res) => {
  const parsed = brevoListCreateSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    res.status(201).json(await createBrevoList(parsed.data));
  } catch (error) {
    failure(res, error, "Erro ao criar lista");
  }
});

router.delete("/lists/:id", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return invalid(res, id.error.issues);
  try {
    await deleteBrevoList(id.data);
    res.status(204).send();
  } catch (error) {
    failure(res, error, "Erro ao excluir lista");
  }
});

router.get("/contacts", async (req, res) => {
  const parsed = contactsQuerySchema.safeParse(req.query);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    res.json(
      await listBrevoContacts(parsed.data.limit, parsed.data.offset, {
        search: parsed.data.search,
        listId: parsed.data.listId,
      })
    );
  } catch (error) {
    failure(res, error, "Erro ao listar contatos");
  }
});

router.post("/contacts", async (req, res) => {
  const parsed = brevoContactSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    res.status(201).json(await upsertBrevoContact(parsed.data));
  } catch (error) {
    failure(res, error, "Erro ao salvar contato");
  }
});

router.delete("/contacts/:email", async (req, res) => {
  const parsed = z.string().trim().min(1).max(320).safeParse(req.params.email);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    await deleteBrevoContact(parsed.data);
    res.status(204).send();
  } catch (error) {
    failure(res, error, "Erro ao excluir contato");
  }
});

router.post("/emails/send", async (req, res) => {
  const parsed = brevoTransactionalEmailSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    res.status(201).json(await sendBrevoTransactionalEmail(parsed.data));
  } catch (error) {
    failure(res, error, "Erro ao enviar e-mail");
  }
});

router.post("/emails/test", async (req, res) => {
  const parsed = brevoTransactionalEmailSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    res
      .status(201)
      .json(
        await sendBrevoTransactionalEmail(
          { ...parsed.data, sandbox: true },
          "test"
        )
      );
  } catch (error) {
    failure(res, error, "Erro ao testar e-mail");
  }
});

router.post("/emails/test-template", async (req, res) => {
  const parsed = brevoTemplateTestSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    res.status(201).json(await sendOrderTemplateTest(parsed.data));
  } catch (error) {
    failure(res, error, "Erro ao enviar teste do template");
  }
});

router.get("/store-templates", async (_req, res) => {
  try {
    res.json(await listStoreEmailTemplates());
  } catch (error) {
    failure(res, error, "Erro ao listar e-mails da loja");
  }
});

router.put("/store-templates", async (req, res) => {
  const parsed = brevoStoreTemplateUpdateSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    res.json(await updateStoreEmailTemplate(parsed.data));
  } catch (error) {
    failure(res, error, "Erro ao salvar e-mail da loja");
  }
});

router.get("/campaigns", async (req, res) => {
  const parsed = paginationSchema.safeParse(req.query);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    res.json(await listBrevoCampaigns(parsed.data.limit, parsed.data.offset));
  } catch (error) {
    failure(res, error, "Erro ao listar campanhas");
  }
});

router.get("/campaigns/:id", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return invalid(res, id.error.issues);
  try {
    res.json(await getBrevoCampaign(id.data));
  } catch (error) {
    failure(res, error, "Erro ao carregar campanha");
  }
});

router.post("/campaigns", async (req, res) => {
  const parsed = brevoCampaignSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    res.status(201).json(await createBrevoCampaign(parsed.data));
  } catch (error) {
    failure(res, error, "Erro ao criar campanha");
  }
});

router.put("/campaigns/:id", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  const body = brevoCampaignSchema.safeParse(req.body);
  if (!id.success || !body.success) {
    return invalid(res, [
      ...(!id.success ? id.error.issues : []),
      ...(!body.success ? body.error.issues : []),
    ]);
  }
  try {
    res.json(await updateBrevoCampaign(id.data, body.data));
  } catch (error) {
    failure(res, error, "Erro ao atualizar campanha");
  }
});

router.post("/campaigns/:id/send-test", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  const body = brevoCampaignTestSchema.safeParse(req.body);
  if (!id.success || !body.success) {
    return invalid(res, [
      ...(!id.success ? id.error.issues : []),
      ...(!body.success ? body.error.issues : []),
    ]);
  }
  try {
    res.json(await sendBrevoCampaignTest(id.data, body.data.emails));
  } catch (error) {
    failure(res, error, "Erro ao testar campanha");
  }
});

router.post("/campaigns/:id/send-now", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return invalid(res, id.error.issues);
  try {
    res.json(await sendBrevoCampaignNow(id.data));
  } catch (error) {
    failure(res, error, "Erro ao enviar campanha");
  }
});

router.post("/campaigns/:id/send", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return invalid(res, id.error.issues);
  try {
    res.json(await sendBrevoCampaignNow(id.data));
  } catch (error) {
    failure(res, error, "Erro ao enviar campanha");
  }
});

router.post("/campaigns/test", async (req, res) => {
  const parsed = brevoQuickTestSchema.safeParse(req.body);
  if (!parsed.success) return invalid(res, parsed.error.issues);
  try {
    await sendBrevoQuickTest(parsed.data);
    res.status(201).json({ success: true });
  } catch (error) {
    failure(res, error, "Erro ao enviar teste");
  }
});

router.post("/campaigns/:id/schedule", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  const body = brevoCampaignScheduleSchema.safeParse(req.body);
  if (!id.success || !body.success) {
    return invalid(res, [
      ...(!id.success ? id.error.issues : []),
      ...(!body.success ? body.error.issues : []),
    ]);
  }
  try {
    res.json(await scheduleBrevoCampaign(id.data, body.data.scheduledAt));
  } catch (error) {
    failure(res, error, "Erro ao agendar campanha");
  }
});

router.get("/campaigns/:id/metrics", async (req, res) => {
  const id = idSchema.safeParse(req.params.id);
  if (!id.success) return invalid(res, id.error.issues);
  try {
    res.json(await getBrevoCampaignMetrics(id.data));
  } catch (error) {
    failure(res, error, "Erro ao carregar métricas");
  }
});

export default router;
