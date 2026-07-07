import { productDefaults, productSchema, type ProductInput } from "../schemas/product";
import type { ProductCategory } from "../types/product";
import { slugify } from "./slugify";

export interface ImportRowResult {
  row: number;
  data: ProductInput | null;
  errors: string[];
}

const VALID_CATEGORIES: ProductCategory[] = ["Roupas", "Bolsas", "Acessórios"];

function toStringValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function toNumber(value: unknown): number | null {
  const str = toStringValue(value).replace(",", ".");
  if (!str) return null;
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}

function toBoolean(value: unknown, defaultValue = false): boolean {
  const str = toStringValue(value).toUpperCase();
  if (!str) return defaultValue;
  return ["SIM", "TRUE", "1", "YES", "S"].includes(str);
}

function splitList(value: unknown): string[] {
  return toStringValue(value)
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}

/** Converte uma linha da planilha (cabeçalhos em português) em um produto válido, com lista de erros. */
export function mapImportRow(raw: Record<string, unknown>, rowNumber: number): ImportRowResult {
  const errors: string[] = [];

  const name = toStringValue(raw.nome);
  if (!name) errors.push("Coluna 'nome' é obrigatória");

  const categoryRaw = toStringValue(raw.categoria);
  const category = VALID_CATEGORIES.find((c) => c.toLowerCase() === categoryRaw.toLowerCase());
  if (!category) {
    errors.push(`Categoria inválida: "${categoryRaw}" (use Roupas, Bolsas ou Acessórios)`);
  }

  const price = toNumber(raw.preco);
  if (price === null) errors.push("Coluna 'preco' é obrigatória e deve ser numérica");

  const images = splitList(raw.imagens);
  if (images.length === 0) {
    errors.push("Informe ao menos uma imagem na coluna 'imagens' (separadas por |)");
  }

  if (errors.length > 0) {
    return { row: rowNumber, data: null, errors };
  }

  const sizesList = splitList(raw.tamanhos);
  const sizes =
    sizesList.length > 0
      ? sizesList.map((label) => ({ label, available: true }))
      : [{ label: "Único", available: true }];

  const slugInput = toStringValue(raw.slug);
  const slug = slugify(slugInput || name);

  const candidate: ProductInput = {
    ...productDefaults,
    slug,
    name,
    category: category as ProductCategory,
    price: price as number,
    originalPrice: toNumber(raw.preco_original),
    image: images[0] ?? "",
    images,
    badge: toStringValue(raw.badge),
    featured: toBoolean(raw.destaque),
    shortDescription: toStringValue(raw.descricao_curta),
    description: toStringValue(raw.descricao),
    materials: splitList(raw.materiais),
    careInstructions: splitList(raw.cuidados),
    highlights: splitList(raw.destaques),
    sizes,
    sku: toStringValue(raw.sku) || slug,
    inStock: toBoolean(raw.em_estoque, true),
    stockCount: toNumber(raw.estoque) ?? 0,
    artisan: {
      name: toStringValue(raw.artesao_nome),
      region: toStringValue(raw.artesao_regiao),
      story: toStringValue(raw.artesao_historia),
    },
  };

  const parsed = productSchema.safeParse(candidate);

  if (!parsed.success) {
    return {
      row: rowNumber,
      data: null,
      errors: parsed.error.issues.map((issue) => issue.message),
    };
  }

  return { row: rowNumber, data: parsed.data, errors: [] };
}
