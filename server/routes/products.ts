import { productSchema, type ProductInput } from "@shared/schemas/product";
import { Router } from "express";
import { requireAdmin } from "../middleware/requireAdmin";
import {
  bulkUpsertProducts,
  createProduct,
  deleteProduct,
  generateUniqueSlug,
  getProductBySlug,
  listProducts,
  slugExists,
  updateProduct,
} from "../services/products";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const category = typeof req.query.category === "string" ? req.query.category : undefined;
    const products = await listProducts(category);
    res.json(products);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar produtos",
    });
  }
});

router.get("/:slug", async (req, res) => {
  try {
    const product = await getProductBySlug(req.params.slug);

    if (!product) {
      res.status(404).json({ error: "Produto não encontrado" });
      return;
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao carregar produto",
    });
  }
});

router.post("/", requireAdmin, async (req, res) => {
  try {
    const parsed = productSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", issues: parsed.error.issues });
      return;
    }

    let input = parsed.data;

    if (!input.slug || (await slugExists(input.slug))) {
      const uniqueSlug = await generateUniqueSlug(input.slug || input.name);
      input = { ...input, slug: uniqueSlug };
    }

    const product = await createProduct(input);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao criar produto",
    });
  }
});

router.post("/bulk", requireAdmin, async (req, res) => {
  try {
    const items = Array.isArray(req.body?.products) ? req.body.products : null;

    if (!items) {
      res.status(400).json({ error: "Envie um array 'products'" });
      return;
    }

    const errors: { index: number; issues: unknown }[] = [];
    const validItems: ProductInput[] = [];

    items.forEach((item: unknown, index: number) => {
      const parsed = productSchema.safeParse(item);
      if (!parsed.success) {
        errors.push({ index, issues: parsed.error.issues });
        return;
      }
      validItems.push(parsed.data);
    });

    if (validItems.length === 0) {
      res.status(400).json({ error: "Nenhum produto válido para importar", errors });
      return;
    }

    const result = await bulkUpsertProducts(validItems);
    res.json({ ...result, errors });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao importar produtos",
    });
  }
});

router.put("/:slug", requireAdmin, async (req, res) => {
  try {
    const parsed = productSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Dados inválidos", issues: parsed.error.issues });
      return;
    }

    const currentSlug = req.params.slug;
    let input = parsed.data;

    if (input.slug !== currentSlug && (await slugExists(input.slug, currentSlug))) {
      res.status(409).json({ error: "Já existe um produto com esse slug" });
      return;
    }

    const product = await updateProduct(currentSlug, input);

    if (!product) {
      res.status(404).json({ error: "Produto não encontrado" });
      return;
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao atualizar produto",
    });
  }
});

router.delete("/:slug", requireAdmin, async (req, res) => {
  try {
    const deleted = await deleteProduct(req.params.slug);

    if (!deleted) {
      res.status(404).json({ error: "Produto não encontrado" });
      return;
    }

    res.status(204).end();
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Erro ao excluir produto",
    });
  }
});

export default router;
