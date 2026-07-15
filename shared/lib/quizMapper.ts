import type {
  QuizOption,
  QuizPublicOption,
  QuizPublicQuestion,
  QuizQuestion,
  QuizResult,
  QuizTagWeight,
} from "../types/quiz";
import type { QuizQuestionInput, QuizResultInput } from "../schemas/quiz";

export interface QuizQuestionRow {
  id: string;
  order: number;
  text: string;
  options: unknown;
  created_at?: string;
  updated_at?: string;
}

export interface QuizResultRow {
  id: string;
  name: string;
  description: string;
  tags: unknown;
  recommended_product_ids: unknown;
  created_at?: string;
  updated_at?: string;
}

function asTagWeights(value: unknown): QuizTagWeight[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;
      const row = item as Record<string, unknown>;
      if (typeof row.tag !== "string" || typeof row.weight !== "number") return null;
      return { tag: row.tag, weight: row.weight };
    })
    .filter((item): item is QuizTagWeight => item !== null);
}

function asOptions(value: unknown): QuizOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;
      const row = item as Record<string, unknown>;
      if (
        typeof row.id !== "string" ||
        typeof row.label !== "string" ||
        typeof row.imageUrl !== "string"
      ) {
        return null;
      }
      return {
        id: row.id,
        label: row.label,
        imageUrl: row.imageUrl,
        tags: asTagWeights(row.tags),
      };
    })
    .filter((item): item is QuizOption => item !== null);
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "number" && Number.isFinite(item)) return item;
      if (typeof item === "string" && item.trim() !== "" && !Number.isNaN(Number(item))) {
        return Number(item);
      }
      return null;
    })
    .filter((item): item is number => item !== null);
}

export function mapQuizQuestionRow(row: QuizQuestionRow): QuizQuestion {
  return {
    id: row.id,
    order: row.order,
    text: row.text,
    options: asOptions(row.options),
  };
}

export function mapQuizResultRow(row: QuizResultRow): QuizResult {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    tags: asStringArray(row.tags),
    recommendedProductIds: asNumberArray(row.recommended_product_ids),
  };
}

export function mapQuestionToRow(input: QuizQuestionInput) {
  return {
    id: input.id,
    order: input.order,
    text: input.text,
    options: input.options,
    updated_at: new Date().toISOString(),
  };
}

export function mapResultToRow(input: QuizResultInput) {
  return {
    id: input.id,
    name: input.name,
    description: input.description,
    tags: input.tags,
    recommended_product_ids: input.recommendedProductIds,
    updated_at: new Date().toISOString(),
  };
}

export function toPublicQuestion(question: QuizQuestion): QuizPublicQuestion {
  return {
    id: question.id,
    order: question.order,
    text: question.text,
    options: question.options.map(
      (option): QuizPublicOption => ({
        id: option.id,
        label: option.label,
        imageUrl: option.imageUrl,
      }),
    ),
  };
}
