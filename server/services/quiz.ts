import {
  mapQuestionToRow,
  mapQuizQuestionRow,
  mapQuizResultRow,
  mapResultToRow,
  toPublicQuestion,
  type QuizQuestionRow,
  type QuizResultRow,
} from "@shared/lib/quizMapper";
import { mapProductRowToProduct, type ProductRow } from "@shared/lib/productMapper";
import type { QuizQuestionInput, QuizResultInput } from "@shared/schemas/quiz";
import type {
  QuizExportPayload,
  QuizImportError,
  QuizImportReport,
  QuizPublicQuestion,
  QuizPublicResultPayload,
  QuizQuestion,
  QuizResult,
  QuizUpsertCounts,
} from "@shared/types/quiz";
import { supabase } from "../lib/supabase";

async function listQuestionRows(): Promise<QuizQuestionRow[]> {
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("*")
    .order("order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as QuizQuestionRow[];
}

async function listResultRows(): Promise<QuizResultRow[]> {
  const { data, error } = await supabase.from("quiz_results").select("*").order("id", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as QuizResultRow[];
}

export async function listQuizQuestions(): Promise<QuizQuestion[]> {
  return (await listQuestionRows()).map(mapQuizQuestionRow);
}

export async function listQuizResults(): Promise<QuizResult[]> {
  return (await listResultRows()).map(mapQuizResultRow);
}

export async function exportQuiz(): Promise<QuizExportPayload> {
  const [questions, results] = await Promise.all([listQuizQuestions(), listQuizResults()]);
  return { questions, results };
}

export async function getPublicQuizQuestions(): Promise<QuizPublicQuestion[]> {
  const questions = await listQuizQuestions();
  return questions.map(toPublicQuestion);
}

async function upsertQuestions(inputs: QuizQuestionInput[]): Promise<QuizUpsertCounts> {
  if (inputs.length === 0) {
    return { created: 0, updated: 0 };
  }

  const ids = inputs.map((item) => item.id);
  const { data: existingRows, error: existingError } = await supabase
    .from("quiz_questions")
    .select("id")
    .in("id", ids);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingIds = new Set((existingRows ?? []).map((row) => row.id as string));
  const rows = inputs.map(mapQuestionToRow);

  const { error } = await supabase.from("quiz_questions").upsert(rows, { onConflict: "id" });

  if (error) {
    throw new Error(error.message);
  }

  const updated = ids.filter((id) => existingIds.has(id)).length;
  return { created: ids.length - updated, updated };
}

async function upsertResults(inputs: QuizResultInput[]): Promise<QuizUpsertCounts> {
  if (inputs.length === 0) {
    return { created: 0, updated: 0 };
  }

  const ids = inputs.map((item) => item.id);
  const { data: existingRows, error: existingError } = await supabase
    .from("quiz_results")
    .select("id")
    .in("id", ids);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingIds = new Set((existingRows ?? []).map((row) => row.id as string));
  const rows = inputs.map(mapResultToRow);

  const { error } = await supabase.from("quiz_results").upsert(rows, { onConflict: "id" });

  if (error) {
    throw new Error(error.message);
  }

  const updated = ids.filter((id) => existingIds.has(id)).length;
  return { created: ids.length - updated, updated };
}

export async function importQuiz(
  questions: QuizQuestionInput[],
  results: QuizResultInput[],
  errors: QuizImportError[],
): Promise<QuizImportReport> {
  const [questionCounts, resultCounts] = await Promise.all([
    upsertQuestions(questions),
    upsertResults(results),
  ]);

  return {
    questions: questionCounts,
    results: resultCounts,
    errors,
  };
}

async function loadProductsByIds(ids: number[]) {
  if (ids.length === 0) return [];

  const { data, error } = await supabase.from("products").select("*").in("id", ids);

  if (error) {
    throw new Error(error.message);
  }

  const products = ((data ?? []) as ProductRow[]).map(mapProductRowToProduct);
  const byId = new Map(products.map((product) => [product.id, product]));

  // Preserva a ordem do array recommendedProductIds
  return ids.map((id) => byId.get(id)).filter((product): product is NonNullable<typeof product> => !!product);
}

export async function computeQuizResult(selectedOptionIds: string[]): Promise<QuizPublicResultPayload> {
  const [questions, results] = await Promise.all([listQuizQuestions(), listQuizResults()]);

  if (results.length === 0) {
    throw new Error("Nenhum perfil de resultado cadastrado");
  }

  const optionById = new Map(
    questions.flatMap((question) => question.options.map((option) => [option.id, option] as const)),
  );

  const accumulated = new Map<string, number>();

  for (const optionId of selectedOptionIds) {
    const option = optionById.get(optionId);
    if (!option) continue;

    for (const { tag, weight } of option.tags) {
      accumulated.set(tag, (accumulated.get(tag) ?? 0) + weight);
    }
  }

  let best: QuizResult | null = null;
  let bestScore = -1;

  for (const result of results) {
    const score = result.tags.reduce((sum, tag) => sum + (accumulated.get(tag) ?? 0), 0);

    if (
      score > bestScore ||
      (score === bestScore && best !== null && result.id.localeCompare(best.id) < 0) ||
      (score === bestScore && best === null)
    ) {
      best = result;
      bestScore = score;
    }
  }

  // Se tudo zerou, usa o primeiro resultado por id estável
  const winner =
    best ??
    [...results].sort((a, b) => a.id.localeCompare(b.id))[0];

  const products = await loadProductsByIds(winner.recommendedProductIds);

  return {
    result: {
      id: winner.id,
      name: winner.name,
      description: winner.description,
      tags: winner.tags,
    },
    products,
  };
}
