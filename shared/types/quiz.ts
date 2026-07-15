import type { Product } from "./product";

export interface QuizTagWeight {
  tag: string;
  weight: number;
}

export interface QuizOption {
  id: string;
  label: string;
  imageUrl: string;
  tags: QuizTagWeight[];
}

/** Opção pública (sem tags/pesos). */
export interface QuizPublicOption {
  id: string;
  label: string;
  imageUrl: string;
}

export interface QuizQuestion {
  id: string;
  order: number;
  text: string;
  options: QuizOption[];
}

export interface QuizPublicQuestion {
  id: string;
  order: number;
  text: string;
  options: QuizPublicOption[];
}

export interface QuizResult {
  id: string;
  name: string;
  description: string;
  tags: string[];
  recommendedProductIds: number[];
}

export interface QuizPublicResultPayload {
  result: Omit<QuizResult, "recommendedProductIds">;
  products: Product[];
}

export interface QuizImportError {
  section: "questions" | "results";
  index: number;
  issues: unknown;
}

export interface QuizUpsertCounts {
  created: number;
  updated: number;
}

export interface QuizImportReport {
  questions: QuizUpsertCounts;
  results: QuizUpsertCounts;
  errors: QuizImportError[];
}

export interface QuizExportPayload {
  questions: QuizQuestion[];
  results: QuizResult[];
}
